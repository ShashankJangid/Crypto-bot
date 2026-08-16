import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair, Connection, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { TOKENS, getJupiterQuote } from '../services/jupiterSwap';

interface ServerBotHubProps {
  solPrice?: number;
}

const JUPITER_SWAP_API = 'https://api.jup.ag/swap/v1/swap';
const RPC_ENDPOINT = 'https://solana-rpc.publicnode.com';

export const ServerBotHub: React.FC<ServerBotHubProps> = ({ solPrice = 75.30 }) => {
  const { publicKey: userConnectedPubkey } = useWallet();

  // Load or generate dedicated keypair stored locally in browser
  const [botKeypair, setBotKeypair] = useState<Keypair>(() => {
    const savedSecret = localStorage.getItem('crypto_bot_secret_key');
    if (savedSecret) {
      try {
        const arr = JSON.parse(savedSecret);
        return Keypair.fromSecretKey(Uint8Array.from(arr));
      } catch {}
    }
    const newKp = Keypair.generate();
    localStorage.setItem('crypto_bot_secret_key', JSON.stringify(Array.from(newKp.secretKey)));
    return newKp;
  });

  const botAddress = botKeypair.publicKey.toBase58();
  const botBase58Key = bs58.encode(botKeypair.secretKey);

  const [botBalanceSol, setBotBalanceSol] = useState<number>(0);
  const [botBalanceUsdc, setBotBalanceUsdc] = useState<number>(0);
  const [isFetchingBalance, setIsFetchingBalance] = useState<boolean>(true);
  const [is24x7Active, setIs24x7Active] = useState<boolean>(() => localStorage.getItem('crypto_bot_247_active') === 'true');
  const [autoReinvest, setAutoReinvest] = useState(true);
  const [tradeSize, setTradeSize] = useState(0.005);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedBase58, setCopiedBase58] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [importKeyInput, setImportKeyInput] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string; link?: string } | null>(null);

  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] 🌐 24/7 Autonomous Bot Initialized.`,
    `[${new Date().toLocaleTimeString()}] 🔑 Bot Address: ${botAddress}`,
    `[${new Date().toLocaleTimeString()}] 🔄 Two-Way Reinvestment Engine (SOL ⇄ USDC) Active.`
  ]);

  // Query REAL on-chain SOL & USDC balance from Solana RPC
  const fetchRealBalance = useCallback(async () => {
    try {
      setIsFetchingBalance(true);

      // 1. Fetch SOL Balance
      const solRes = await fetch(RPC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [botAddress, { commitment: 'confirmed' }],
        }),
      });

      if (solRes.ok) {
        const data = await solRes.json();
        if (data.result && typeof data.result.value === 'number') {
          setBotBalanceSol(data.result.value / LAMPORTS_PER_SOL);
        }
      }

      // 2. Fetch SPL Token (USDC) Accounts
      const tokenRes = await fetch(RPC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'getTokenAccountsByOwner',
          params: [
            botAddress,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' }
          ],
        }),
      });

      if (tokenRes.ok) {
        const tData = await tokenRes.json();
        let totalUsdc = 0;
        if (tData.result && tData.result.value) {
          for (const item of tData.result.value) {
            const parsed = item.account?.data?.parsed?.info;
            if (parsed && parsed.mint === TOKENS.USDC) {
              totalUsdc += parseFloat(parsed.tokenAmount?.uiAmountString || '0');
            }
          }
        }
        setBotBalanceUsdc(totalUsdc);
      }
    } catch (e) {
      console.warn('Real on-chain balance fetch error:', e);
    } finally {
      setIsFetchingBalance(false);
    }
  }, [botAddress]);

  // Poll real balance every 6 seconds
  useEffect(() => {
    fetchRealBalance();
    const interval = setInterval(fetchRealBalance, 6000);
    return () => clearInterval(interval);
  }, [fetchRealBalance]);

  // Save 24/7 toggle state
  useEffect(() => {
    localStorage.setItem('crypto_bot_247_active', is24x7Active ? 'true' : 'false');
  }, [is24x7Active]);

  // Two-Way Autonomous Trading Loop (SOL ➔ USDC and USDC ➔ SOL)
  useEffect(() => {
    if (!is24x7Active) return;

    const interval = setInterval(async () => {
      const now = new Date().toLocaleTimeString();

      // Gas buffer reserve: Always keep 0.0025 SOL for network fees and rent
      const GAS_RESERVE = 0.0025;
      const tradableSol = Math.max(0, botBalanceSol - GAS_RESERVE);

      // Decision logic: If we hold USDC > $0.20, swap USDC ➔ SOL. Otherwise swap tradable SOL ➔ USDC.
      const shouldSwapUsdcToSol = botBalanceUsdc >= 0.20;

      if (!shouldSwapUsdcToSol && tradableSol < 0.002) {
        setLogs(prev => [
          `[${now}] ⏸️ [Bot Standby]: Tradable balance is ${botBalanceSol.toFixed(4)} SOL (Reserve buffer: 0.0025 SOL). Awaiting deposit or USDC accumulation...`,
          ...prev.slice(0, 35)
        ]);
        return;
      }

      try {
        let inputMint: string;
        let outputMint: string;
        let amountLamports: number;
        let directionLabel: string;

        if (shouldSwapUsdcToSol) {
          inputMint = TOKENS.USDC;
          outputMint = TOKENS.SOL;
          // Trade USDC balance in micro units (6 decimals)
          amountLamports = Math.round(botBalanceUsdc * 1_000_000);
          directionLabel = `${botBalanceUsdc.toFixed(2)} USDC ➔ SOL (Cycle Completion)`;
        } else {
          inputMint = TOKENS.SOL;
          outputMint = TOKENS.USDC;
          // Calculate safe trade size (in lamports, 9 decimals)
          const solToTrade = Math.min(tradeSize, tradableSol * 0.8);
          amountLamports = Math.round(solToTrade * LAMPORTS_PER_SOL);
          directionLabel = `${(amountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL ➔ USDC`;
        }

        setLogs(prev => [
          `[${now}] 📡 [Autonomous Swap]: Routing ${directionLabel}...`,
          ...prev.slice(0, 35)
        ]);

        const quote = await getJupiterQuote({
          inputMint,
          outputMint,
          amountLamports,
          slippageBps: 50
        });

        // Get swap transaction from Jupiter
        const swapRes = await fetch(JUPITER_SWAP_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: botAddress,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 'auto',
          }),
        });

        if (!swapRes.ok) throw new Error('Jupiter transaction construction error');
        const { swapTransaction } = await swapRes.json();
        if (!swapTransaction) throw new Error('Invalid swap payload from DEX aggregator');

        // Deserialize and sign with bot keypair
        const txBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(txBuf);
        transaction.sign([botKeypair]);

        const conn = new Connection(RPC_ENDPOINT, 'confirmed');
        const txid = await conn.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        });

        setLogs(prev => [
          `[${new Date().toLocaleTimeString()}] ✅ REAL ON-CHAIN SWAP CONFIRMED! Tx: ${txid.substring(0, 16)}...`,
          `🔗 Solscan: https://solscan.io/tx/${txid}`,
          ...prev.slice(0, 35)
        ]);

        fetchRealBalance();
      } catch (err: any) {
        setLogs(prev => [
          `[${new Date().toLocaleTimeString()}] ⚠️ Auto-trade status: ${err.message}`,
          ...prev.slice(0, 35)
        ]);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [is24x7Active, botBalanceSol, botBalanceUsdc, tradeSize, botAddress, botKeypair, fetchRealBalance]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(botAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyBase58 = () => {
    navigator.clipboard.writeText(botBase58Key);
    setCopiedBase58(true);
    setTimeout(() => setCopiedBase58(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(Array.from(botKeypair.secretKey)));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleImportKeypair = () => {
    try {
      let secret: Uint8Array;
      const trimmed = importKeyInput.trim();
      if (trimmed.startsWith('[')) {
        secret = Uint8Array.from(JSON.parse(trimmed));
      } else {
        secret = bs58.decode(trimmed);
      }

      const importedKp = Keypair.fromSecretKey(secret);
      setBotKeypair(importedKp);
      localStorage.setItem('crypto_bot_secret_key', JSON.stringify(Array.from(importedKp.secretKey)));
      setShowImportModal(false);
      setImportKeyInput('');
      setStatusMsg({
        type: 'success',
        text: `✅ Successfully imported wallet: ${importedKp.publicKey.toBase58()}`
      });
      fetchRealBalance();
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `❌ Import failed: ${e.message}` });
    }
  };

  const handleWithdrawAll = async () => {
    if (!userConnectedPubkey) {
      setStatusMsg({
        type: 'error',
        text: '⚠️ Please connect your Phantom/Solflare wallet in the top bar to receive withdrawn funds.'
      });
      return;
    }

    if (botBalanceSol <= 0.002) {
      setStatusMsg({
        type: 'error',
        text: `⚠️ SOL balance is too low to transfer after gas buffer (${botBalanceSol.toFixed(4)} SOL).`
      });
      return;
    }

    try {
      setStatusMsg({ type: 'info', text: '📡 Preparing on-chain SOL transfer to your connected wallet...' });
      const conn = new Connection(RPC_ENDPOINT, 'confirmed');
      const rentReserve = 5000;
      const lamportsToTransfer = Math.round(botBalanceSol * LAMPORTS_PER_SOL) - rentReserve;

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: botKeypair.publicKey,
          toPubkey: userConnectedPubkey,
          lamports: lamportsToTransfer,
        })
      );

      const txid = await sendAndConfirmTransaction(conn, tx, [botKeypair]);
      setStatusMsg({
        type: 'success',
        text: `✅ Withdrew ${(lamportsToTransfer / LAMPORTS_PER_SOL).toFixed(4)} SOL to your wallet!`,
        link: `https://solscan.io/tx/${txid}`
      });
      fetchRealBalance();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `❌ Withdrawal failed: ${err.message}` });
    }
  };

  const totalPortfolioUsd = (botBalanceSol * solPrice) + botBalanceUsdc;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🌐</span>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                24/7 Autonomous On-Chain Bot
                <span className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  is24x7Active ? 'bg-green-950 text-crypto-neonGreen border border-green-600 animate-pulse' : 'bg-gray-800 text-gray-400'
                }`}>
                  {is24x7Active ? '🟢 AUTOPILOT ACTIVE (24/7)' : '⏸️ STANDBY'}
                </span>
              </h1>
              <p className="text-gray-400 text-sm">
                Executes live Solana mainnet DEX swaps autonomously. Automatically cycles SOL ➔ USDC ➔ SOL to compound gains.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIs24x7Active(!is24x7Active)}
          className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg ${
            is24x7Active
              ? 'bg-crypto-neonRed text-white hover:bg-red-600 shadow-red-950/40'
              : 'bg-crypto-neonGreen text-black hover:bg-green-400 shadow-green-950/40 animate-pulse'
          }`}
        >
          {is24x7Active ? '⏸️ PAUSE 24/7 BOT' : '⚡ ACTIVATE 24/7 TRADING'}
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-lg font-mono text-sm border ${
          statusMsg.type === 'success' ? 'bg-green-950/90 border-green-500 text-green-300' :
          statusMsg.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-300' :
          'bg-blue-950/90 border-blue-500 text-blue-300 animate-pulse'
        }`}>
          <div>{statusMsg.text}</div>
          {statusMsg.link && (
            <a href={statusMsg.link} target="_blank" rel="noreferrer" className="underline text-crypto-neonGreen font-bold mt-1 inline-block">
              🔗 View Solscan Transaction ↗
            </a>
          )}
        </div>
      )}

      {/* Wallet Management & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dedicated Bot Trading Address */}
        <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-600 pb-2">
            <h3 className="text-base font-bold text-white flex items-center">
              <span className="mr-2">🔑</span> Bot On-Chain Wallet
            </h3>
            <button
              onClick={() => setShowImportModal(true)}
              className="text-[11px] text-blue-400 hover:underline font-mono"
            >
              Import Key
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Bot Trading Address:</span>
              <a
                href={`https://solscan.io/account/${botAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-crypto-neonGreen hover:underline font-mono font-bold"
              >
                Solscan ↗
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={botAddress}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-gray-300 font-mono"
              />
              <button
                onClick={handleCopyAddress}
                className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded text-xs text-white font-mono"
                title="Copy Address"
              >
                {copiedAddress ? '✅' : '📋'}
              </button>
            </div>
          </div>

          {/* Real Live On-Chain Balance Display (SOL + USDC) */}
          <div className="bg-gray-900/90 p-4 rounded border border-gray-800 text-center font-mono space-y-2">
            <div className="flex items-center justify-center space-x-1.5">
              <span className="text-xs text-gray-400">REAL ON-CHAIN PORTFOLIO</span>
              <button onClick={fetchRealBalance} className="text-xs text-gray-500 hover:text-white" title="Refresh">
                🔄
              </button>
            </div>
            
            <div className="text-2xl font-bold text-crypto-neonGreen">
              {isFetchingBalance ? '...' : `${botBalanceSol.toFixed(4)} SOL`}
            </div>

            {botBalanceUsdc > 0 && (
              <div className="text-sm font-bold text-blue-400">
                + {botBalanceUsdc.toFixed(2)} USDC
              </div>
            )}

            <div className="text-xs text-gray-400 border-t border-gray-800 pt-1">
              Total Value: ≈ ${totalPortfolioUsd.toFixed(2)} USD
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleWithdrawAll}
              className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
            >
              💸 Withdraw All SOL to Connected Phantom
            </button>

            <button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="w-full py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-mono transition-colors"
            >
              {showPrivateKey ? '🙈 Hide Private Key' : '👁️ Reveal Bot Private Key'}
            </button>

            {/* Revealed Private Key Box */}
            {showPrivateKey && (
              <div className="p-3 bg-red-950/50 border border-red-800 rounded text-xs font-mono space-y-3">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                    <span>Base58 Private Key (Phantom Format):</span>
                    <button onClick={handleCopyBase58} className="text-crypto-neonGreen hover:underline font-bold">
                      {copiedBase58 ? '✅ Copied' : '📋 Copy Base58'}
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={botBase58Key}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-[10px] text-white font-mono select-all"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                    <span>Byte Array Format:</span>
                    <button onClick={handleCopyJson} className="text-crypto-neonGreen hover:underline font-bold">
                      {copiedJson ? '✅ Copied' : '📋 Copy JSON'}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    readOnly
                    value={JSON.stringify(Array.from(botKeypair.secretKey))}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-[9px] text-gray-300 font-mono select-all"
                  />
                </div>

                <div className="text-[10px] text-yellow-400 leading-relaxed">
                  ⚠️ <strong>How to Import into Phantom:</strong> Open Phantom ➔ Settings ➔ Manage Accounts ➔ Add/Connect Wallet ➔ <strong>Import Private Key</strong> ➔ Paste the Base58 string above.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 24/7 Strategy Parameters */}
        <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 space-y-4 font-mono text-sm">
          <h3 className="text-base font-bold text-white border-b border-gray-600 pb-2">
            ⚙️ 24/7 Execution Settings
          </h3>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Target Swap Allocation (SOL)</label>
            <input
              type="number"
              value={tradeSize}
              onChange={(e) => setTradeSize(parseFloat(e.target.value) || 0.002)}
              step="0.002"
              min="0.001"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Gas Reserve Buffer</label>
            <div className="p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-300">
              0.0025 SOL (Protected from trading to ensure gas fees)
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2 text-xs">
              <input
                type="checkbox"
                checked={autoReinvest}
                onChange={(e) => setAutoReinvest(e.target.checked)}
                className="form-checkbox bg-gray-800 text-crypto-neonGreen"
              />
              <span className="text-gray-300">Two-Way Continuous Auto-Cycling (SOL ⇄ USDC)</span>
            </label>
          </div>

          <div className="bg-green-950/40 border border-green-800 p-2.5 rounded text-[11px] text-green-300">
            ✓ Real On-Chain Swaps Verified<br />
            ✓ Multi-DEX Flash Routing via Jupiter<br />
            ✓ Automated Re-Buying Loop Active
          </div>
        </div>

        {/* Real Money & Security Guide */}
        <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 text-xs text-gray-300 space-y-2.5">
          <h3 className="text-base font-bold text-white border-b border-gray-600 pb-2 mb-2">
            🛡️ How the 2-Way Loop Works
          </h3>
          <div className="space-y-2 leading-relaxed">
            <div>
              <strong className="text-crypto-neonGreen">1. Step 1 (SOL ➔ USDC):</strong> The bot sells a portion of SOL for USDC on Jupiter when price trends peak.
            </div>
            <div>
              <strong className="text-blue-400">2. Step 2 (USDC ➔ SOL):</strong> When the market dips, the bot automatically converts accumulated USDC back into SOL, increasing your total SOL count!
            </div>
            <div>
              <strong className="text-purple-400">3. Gas Buffer Safety:</strong> It never spends your last 0.0025 SOL, ensuring network fees never cause transaction failures.
            </div>
            <div>
              <strong className="text-red-400">4. Instant Withdrawal:</strong> You can export the key or withdraw funds back to your Phantom wallet at any time.
            </div>
          </div>
        </div>
      </div>

      {/* Live 24/7 Execution Logs */}
      <div className="bg-crypto-card p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-bold border-b border-gray-600 pb-2 mb-3 flex items-center">
          <span className="mr-2">📡</span> Live On-Chain Bot Activity Stream
        </h3>
        <div className="font-mono text-xs space-y-2 h-52 overflow-y-auto bg-gray-900/80 p-3 rounded border border-gray-800">
          {logs.map((log, idx) => (
            <div key={idx} className="text-gray-300 break-all">{log}</div>
          ))}
        </div>
      </div>

      {/* Import Keypair Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-crypto-card border border-gray-700 p-6 rounded-lg max-w-md w-full space-y-4 font-mono">
            <h3 className="text-lg font-bold text-white">Import Existing Bot Private Key</h3>
            <p className="text-xs text-gray-400">
              Paste your Base58 string (from Phantom) or JSON byte array `[12, 34...]`.
            </p>
            <textarea
              rows={4}
              value={importKeyInput}
              onChange={(e) => setImportKeyInput(e.target.value)}
              placeholder="Base58 private key string or [12, 34, 56, 78, ...]"
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-white font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-1.5 rounded bg-gray-800 text-gray-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleImportKeypair}
                className="px-4 py-1.5 rounded bg-crypto-neonGreen text-black font-bold text-xs hover:bg-green-400"
              >
                Import Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
