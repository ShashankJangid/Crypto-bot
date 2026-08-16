import { Connection, VersionedTransaction } from '@solana/web3.js';
import { config } from '../config';

// Official active Jupiter v1 routing & swap endpoints
const JUPITER_QUOTE_API = 'https://api.jup.ag/swap/v1/quote';
const JUPITER_SWAP_API = 'https://api.jup.ag/swap/v1/swap';

const RELIABLE_RPC_URLS = [
  'https://solana-rpc.publicnode.com',
  'https://rpc.ankr.com/solana',
  'https://solana.drpc.org',
];

// Common Token Mints on Solana Mainnet
export const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
};

export interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amountLamports: number;
  slippageBps?: number;
}

export interface SwapResult {
  success: boolean;
  txid?: string;
  error?: string;
  inAmount?: number;
  outAmount?: number;
  explorerUrl?: string;
}

/**
 * Fetch optimal swap quote from Jupiter DEX Aggregator
 */
export async function getJupiterQuote(params: QuoteParams) {
  const { inputMint, outputMint, amountLamports, slippageBps = 50 } = params;
  const url = `${JUPITER_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${Math.round(amountLamports)}&slippageBps=${slippageBps}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || `Jupiter quote error (status ${response.status})`);
  }
  
  return await response.json();
}

/**
 * Helper to get a working Connection that does not throw 403
 */
export function getReliableConnection(customUrl?: string): Connection {
  const target = customUrl || localStorage.getItem('crypto_bot_rpc') || config.rpcEndpoint;
  // If the target is the blocked api.mainnet-beta.solana.com, redirect to publicnode
  const safeUrl = target.includes('api.mainnet-beta.solana.com')
    ? 'https://solana-rpc.publicnode.com'
    : target;
  return new Connection(safeUrl, 'confirmed');
}

/**
 * Build and execute a real on-chain swap transaction signed by the connected wallet
 */
export async function executeJupiterSwap(
  quoteResponse: any,
  userPublicKey: string,
  sendTransaction: (tx: VersionedTransaction, connection: Connection) => Promise<string>,
  _callerConnection: Connection
): Promise<SwapResult> {
  try {
    const reliableConn = getReliableConnection();

    // 1. Get serialized transaction from Jupiter Swap API
    const swapResponse = await fetch(JUPITER_SWAP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    if (!swapResponse.ok) {
      const err = await swapResponse.json().catch(() => ({}));
      throw new Error(err.error || err.message || `Jupiter swap preparation failed: ${swapResponse.statusText}`);
    }

    const { swapTransaction } = await swapResponse.json();

    if (!swapTransaction) {
      throw new Error('Jupiter did not return a valid transaction payload');
    }

    // 2. Deserialize VersionedTransaction
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // 3. Prompt user's connected wallet to sign and broadcast the transaction using the reliable connection
    let txid: string;
    try {
      txid = await sendTransaction(transaction, reliableConn);
    } catch (sendErr: any) {
      // If sendTransaction with custom connection fails, try fallback RPCs
      let lastErr = sendErr;
      for (const fallbackRpc of RELIABLE_RPC_URLS) {
        try {
          const fallbackConn = new Connection(fallbackRpc, 'confirmed');
          txid = await sendTransaction(transaction, fallbackConn);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (lastErr) {
        throw lastErr;
      }
    }

    // 4. Confirm transaction on-chain
    try {
      const latestBlockHash = await reliableConn.getLatestBlockhash('confirmed');
      await reliableConn.confirmTransaction(
        {
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: txid!,
        },
        'confirmed'
      );
    } catch (confirmErr) {
      console.warn('Block confirmation wait timed out, transaction may still have succeeded:', confirmErr);
    }

    return {
      success: true,
      txid: txid!,
      explorerUrl: `https://solscan.io/tx/${txid!}`,
    };
  } catch (error: any) {
    console.error('Jupiter swap execution error:', error);
    return {
      success: false,
      error: error.message || 'Transaction rejected or failed on-chain',
    };
  }
}
