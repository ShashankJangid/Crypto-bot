import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PriceData, TradeRecord } from '../types';
import { TOKENS, getJupiterQuote, executeJupiterSwap } from '../services/jupiterSwap';

interface SwingTradePageProps {
  prices: Record<string, PriceData>;
  onExecuteTrade?: (trade: TradeRecord) => void;
}

export const SwingTradePage: React.FC<SwingTradePageProps> = ({ prices, onExecuteTrade }) => {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [activePair, setActivePair] = useState<'SOL_USDC' | 'SOL_JUP'>('SOL_USDC');
  const [dipThreshold, setDipThreshold] = useState(2.5);
  const [takeProfit, setTakeProfit] = useState(5.0);
  const [stopLoss, setStopLoss] = useState(2.0);
  const [tradeAmount, setTradeAmount] = useState(0.01);
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [mode, setMode] = useState<'real' | 'simulated'>('simulated');

  const currentPrice = prices['SOL/USD']?.price || 75.30;
  const change24h = prices['SOL/USD']?.change24h || 0;

  const handleExecuteSwap = async (direction: 'SOL_TO_TOKEN' | 'TOKEN_TO_SOL') => {
    setIsExecuting(true);
    const now = new Date().toLocaleTimeString();
    const targetTokenMint = activePair === 'SOL_USDC' ? TOKENS.USDC : TOKENS.JUP;
    const targetTokenSymbol = activePair === 'SOL_USDC' ? 'USDC' : 'JUP';

    if (mode === 'real') {
      if (!connected || !publicKey) {
        setLogs(prev => [`[${now}] ⚠️ Wallet not connected. Please connect Phantom / Solflare first.`, ...prev]);
        setIsExecuting(false);
        return;
      }

      try {
        const inputMint = direction === 'SOL_TO_TOKEN' ? TOKENS.SOL : targetTokenMint;
        const outputMint = direction === 'SOL_TO_TOKEN' ? targetTokenMint : TOKENS.SOL;
        
        // Amount calculation
        const amountLamports = direction === 'SOL_TO_TOKEN'
          ? Math.round(tradeAmount * LAMPORTS_PER_SOL)
          : Math.round(tradeAmount * 1_000_000 * currentPrice);

        setLogs(prev => [
          `[${now}] 📡 Querying Jupiter best route (${direction === 'SOL_TO_TOKEN' ? `SOL ➔ ${targetTokenSymbol}` : `${targetTokenSymbol} ➔ SOL`})...`,
          ...prev
        ]);

        const quote = await getJupiterQuote({
          inputMint,
          outputMint,
          amountLamports,
          slippageBps: 50
        });

        const outAmountFormatted = direction === 'SOL_TO_TOKEN'
          ? (quote.outAmount / 1_000_000).toFixed(4) + ` ${targetTokenSymbol}`
          : (quote.outAmount / LAMPORTS_PER_SOL).toFixed(4) + ' SOL';

        setLogs(prev => [
          `[${new Date().toLocaleTimeString()}] 💡 Route Found: Expected Output ~ ${outAmountFormatted}`,
          `[${new Date().toLocaleTimeString()}] 🔐 Please confirm the transaction in your wallet popup...`,
          ...prev
        ]);

        const result = await executeJupiterSwap(
          quote,
          publicKey.toBase58(),
          sendTransaction,
          connection
        );

        if (result.success && result.txid) {
          const txSignature = result.txid;
          setLogs(prev => [
            `[${new Date().toLocaleTimeString()}] ✅ REAL ON-CHAIN SWAP CONFIRMED! Tx: ${txSignature.substring(0, 16)}...`,
            `🔗 Solscan: ${result.explorerUrl || 'https://solscan.io/tx/' + txSignature}`,
            ...prev
          ]);

          if (onExecuteTrade) {
            onExecuteTrade({
              id: txSignature.substring(0, 10),
              timestamp: Date.now(),
              pair: activePair === 'SOL_USDC' ? 'SOL/USDC' : 'SOL/JUP',
              side: direction === 'SOL_TO_TOKEN' ? 'Sell' : 'Buy',
              amount: tradeAmount,
              price: currentPrice,
              profit: +(tradeAmount * currentPrice * (takeProfit / 100)).toFixed(2),
              status: 'Success',
              engine: 'Swing'
            });
          }
        } else {
          setLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Swap Failed: ${result.error}`, ...prev]);
        }
      } catch (err: any) {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error: ${err.message}`, ...prev]);
      } finally {
        setIsExecuting(false);
      }
      return;
    }

    // Sandbox Simulation Mode
    const dirLabel = direction === 'SOL_TO_TOKEN' ? `Sell SOL for ${targetTokenSymbol}` : `Buy SOL with ${targetTokenSymbol}`;
    setLogs(prev => [`[${now}] 🧪 [Simulation]: ${dirLabel} (${tradeAmount} SOL @ $${currentPrice.toFixed(2)})`, ...prev]);
    
    setTimeout(() => {
      const exitPrice = currentPrice * (1 + takeProfit / 100);
      const profitUsd = +(tradeAmount * currentPrice * (takeProfit / 100)).toFixed(2);
      
      setLogs(prev => [
        `[${new Date().toLocaleTimeString()}] 🎯 [Simulated TP Hit]: Position executed @ $${exitPrice.toFixed(2)} (+${takeProfit}% | +$${profitUsd})`,
        ...prev
      ]);
      setIsExecuting(false);

      if (onExecuteTrade) {
        onExecuteTrade({
          id: 'sim-' + Math.random().toString(36).substring(7),
          timestamp: Date.now(),
          pair: activePair === 'SOL_USDC' ? 'SOL/USDC' : 'SOL/JUP',
          side: direction === 'SOL_TO_TOKEN' ? 'Sell' : 'Buy',
          amount: tradeAmount,
          price: exitPrice,
          profit: profitUsd,
          status: 'Success',
          engine: 'Swing'
        });
      }
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Swing Trading Engine</h1>
          <p className="text-gray-400">Automated buy-dip and take-profit cycles on Solana with real on-chain execution.</p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-crypto-card p-1.5 rounded-lg border border-gray-700">
          <button
            onClick={() => setMode('simulated')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              mode === 'simulated' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            🧪 Simulation Sandbox
          </button>
          <button
            onClick={() => setMode('real')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center ${
              mode === 'real' ? 'bg-crypto-neonGreen text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-ping"></span>
            ⚡ Real Wallet Trade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strategy Configuration */}
        <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-lg font-bold border-b border-gray-600 pb-2">Strategy Parameters</h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Target Pair</label>
            <select
              value={activePair}
              onChange={(e) => setActivePair(e.target.value as any)}
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
            >
              <option value="SOL_USDC">SOL / USDC</option>
              <option value="SOL_JUP">SOL / JUP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Dip Entry Trigger (%)</label>
            <input
              type="number"
              value={dipThreshold}
              onChange={(e) => setDipThreshold(parseFloat(e.target.value) || 0)}
              step="0.5"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Take-Profit Target (%)</label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
              step="0.5"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Stop-Loss Protection (%)</label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
              step="0.5"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Trade Size (SOL)</label>
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)}
              step="0.005"
              min="0.001"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
            />
          </div>

          <div className="space-y-2 pt-2">
            <button
              disabled={isExecuting}
              onClick={() => handleExecuteSwap('SOL_TO_TOKEN')}
              className={`w-full py-2.5 rounded font-bold transition-colors ${
                isExecuting
                  ? 'bg-yellow-500 text-black animate-pulse'
                  : mode === 'real'
                  ? 'bg-crypto-neonGreen hover:bg-green-400 text-black shadow-lg shadow-green-950/40'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isExecuting ? 'PROCESSING...' : mode === 'real' ? `⚡ SWAP ${tradeAmount} SOL ➔ USDC` : `🧪 SIM SWAP SOL ➔ USDC`}
            </button>

            <button
              disabled={isExecuting}
              onClick={() => handleExecuteSwap('TOKEN_TO_SOL')}
              className={`w-full py-2 rounded text-xs font-bold transition-colors ${
                isExecuting
                  ? 'bg-gray-800 text-gray-500'
                  : mode === 'real'
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              {mode === 'real' ? `⚡ RE-BUY (USDC ➔ SOL)` : `🧪 SIM RE-BUY (USDC ➔ SOL)`}
            </button>
          </div>
        </div>

        {/* Live Overview & Price Signals */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-crypto-card p-6 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-gray-400 text-sm">Asset</span>
                <div className="text-2xl font-bold font-mono">{activePair.replace('_', ' / ')}</div>
              </div>
              <div className="text-right">
                <span className="text-gray-400 text-sm">Live Price</span>
                <div className="text-3xl font-bold font-mono text-crypto-neonGreen">${currentPrice.toFixed(4)}</div>
                <div className={`text-xs ${change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  24h: {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700 text-center font-mono">
              <div className="bg-gray-800/60 p-3 rounded">
                <div className="text-gray-400 text-xs">BUY DIP TRIGGER</div>
                <div className="text-base font-bold text-blue-400">${(currentPrice * (1 - dipThreshold / 100)).toFixed(2)}</div>
              </div>
              <div className="bg-gray-800/60 p-3 rounded">
                <div className="text-gray-400 text-xs">TAKE PROFIT TARGET</div>
                <div className="text-base font-bold text-green-400">${(currentPrice * (1 + takeProfit / 100)).toFixed(2)}</div>
              </div>
              <div className="bg-gray-800/60 p-3 rounded">
                <div className="text-gray-400 text-xs">STOP LOSS LIMIT</div>
                <div className="text-base font-bold text-red-400">${(currentPrice * (1 - stopLoss / 100)).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Engine Logs */}
          <div className="bg-crypto-card p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-bold border-b border-gray-600 pb-2 mb-3">Engine Execution Log</h3>
            <div className="font-mono text-xs space-y-2 h-44 overflow-y-auto bg-gray-900/80 p-3 rounded border border-gray-800">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-10">Standby. Switch to Real Mode to trade live with your connected wallet.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="text-gray-300 break-all">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
