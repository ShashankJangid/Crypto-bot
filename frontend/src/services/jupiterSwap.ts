import { Connection, VersionedTransaction } from '@solana/web3.js';

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

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
  const url = `${JUPITER_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Jupiter quote error: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Build and execute a real on-chain swap transaction signed by the connected wallet
 */
export async function executeJupiterSwap(
  quoteResponse: any,
  userPublicKey: string,
  sendTransaction: (tx: VersionedTransaction, connection: Connection) => Promise<string>,
  connection: Connection
): Promise<SwapResult> {
  try {
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
      throw new Error(err.error || `Jupiter swap preparation failed: ${swapResponse.statusText}`);
    }

    const { swapTransaction } = await swapResponse.json();

    // 2. Deserialize VersionedTransaction
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // 3. Prompt user's connected wallet to sign and broadcast the transaction
    const txid = await sendTransaction(transaction, connection);

    // 4. Confirm transaction
    const latestBlockHash = await connection.getLatestBlockhash('confirmed');
    await connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: txid,
      },
      'confirmed'
    );

    return {
      success: true,
      txid,
      explorerUrl: `https://solscan.io/tx/${txid}`,
    };
  } catch (error: any) {
    console.error('Jupiter swap execution failed:', error);
    return {
      success: false,
      error: error.message || 'Transaction rejected or failed on-chain',
    };
  }
}
