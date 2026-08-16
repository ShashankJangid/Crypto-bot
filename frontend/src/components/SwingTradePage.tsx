import React, { useState } from 'react';
import { PriceData, TradeRecord } from '../types';

interface SwingTradePageProps {
  prices: Record<string, PriceData>;
  onExecuteTrade?: (trade: TradeRecord) => void;
}

export const SwingTradePage: React.FC<SwingTradePageProps> = ({ prices, onExecuteTrade }) => {
  const [activePair, setActivePair] = useState('SOL/USD');
  const [dipThreshold, setDipThreshold] = useState(2.5);
  const [takeProfit, setTakeProfit] = useState(5.0);
  const [stopLoss, setStopLoss] = useState(2.0);
  const [tradeAmount, setTradeAmount] = useState(1.0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const currentPrice = prices[activePair]?.price || 75.30;
  const change24h = prices[activePair]?.change24h || 0;

  const handleManualBuy = () => {
    setIsSimulating(true);
    const entry = currentPrice;
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] 🟢 SWING BUY ORDER: ${tradeAmount} ${activePair.split('/')[0]} @ $${entry.toFixed(2)}`, ...prev]);

    if (onExecuteTrade) {
      onExecuteTrade({
        id: 'swing-' + Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        pair: activePair,
        side: 'Buy',
        amount: tradeAmount,
        price: entry,
        profit: 0,
        status: 'Success',
        engine: 'Swing'
      });
    }

    setTimeout(() => {
      const exitPrice = entry * (1 + takeProfit / 100);
      const profitUsd = (exitPrice - entry) * tradeAmount;
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] 🎯 SWING TAKE-PROFIT HIT: Sold @ $${exitPrice.toFixed(2)} (+${takeProfit}% | +$${profitUsd.toFixed(2)})`, ...prev]);
      setIsSimulating(false);

      if (onExecuteTrade) {
        onExecuteTrade({
          id: 'swing-' + Math.random().toString(36).substring(7),
          timestamp: Date.now(),
          pair: activePair,
          side: 'Sell',
          amount: tradeAmount,
          price: exitPrice,
          profit: profitUsd,
          status: 'Success',
          engine: 'Swing'
        });
      }
    }, 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Swing Trading Engine</h1>
          <p className="text-gray-400">Automated buy-dip and sell-peak cycles across high-volume Solana tokens.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strategy Configuration */}
        <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-lg font-bold border-b border-gray-600 pb-2">Configure Strategy</h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Target Asset</label>
            <select
              value={activePair}
              onChange={(e) => setActivePair(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
            >
              <option value="SOL/USD">SOL/USD</option>
              <option value="BTC/USD">BTC/USD</option>
              <option value="ETH/USD">ETH/USD</option>
              <option value="JUP/USD">JUP/USD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Buy Dip Trigger (%)</label>
            <input
              type="number"
              value={dipThreshold}
              onChange={(e) => setDipThreshold(parseFloat(e.target.value) || 0)}
              step="0.5"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Take Profit Target (%)</label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
              step="0.5"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Stop Loss (%)</label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
              step="0.5"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Trade Allocation</label>
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)}
              step="0.1"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
            />
          </div>

          <button
            disabled={isSimulating}
            onClick={handleManualBuy}
            className={`w-full py-2.5 rounded font-bold transition-colors ${
              isSimulating
                ? 'bg-yellow-500 text-black animate-pulse'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isSimulating ? 'EXECUTING CYCLE...' : '⚡ Trigger Test Cycle'}
          </button>
        </div>

        {/* Live Market & Position Overview */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-crypto-card p-6 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-gray-400 text-sm">Active Pair</span>
                <div className="text-2xl font-bold font-mono">{activePair}</div>
              </div>
              <div className="text-right">
                <span className="text-gray-400 text-sm">Market Price</span>
                <div className="text-3xl font-bold font-mono text-crypto-neonGreen">${currentPrice.toFixed(4)}</div>
                <div className={`text-xs ${change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  24h: {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700 text-center font-mono">
              <div className="bg-gray-800/60 p-3 rounded">
                <div className="text-gray-400 text-xs">BUY TRIGGER</div>
                <div className="text-base font-bold text-blue-400">${(currentPrice * (1 - dipThreshold / 100)).toFixed(2)}</div>
              </div>
              <div className="bg-gray-800/60 p-3 rounded">
                <div className="text-gray-400 text-xs">TAKE PROFIT</div>
                <div className="text-base font-bold text-green-400">${(currentPrice * (1 + takeProfit / 100)).toFixed(2)}</div>
              </div>
              <div className="bg-gray-800/60 p-3 rounded">
                <div className="text-gray-400 text-xs">STOP LOSS</div>
                <div className="text-base font-bold text-red-400">${(currentPrice * (1 - stopLoss / 100)).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Engine Execution Logs */}
          <div className="bg-crypto-card p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-bold border-b border-gray-600 pb-2 mb-3">Live Engine Logs</h3>
            <div className="font-mono text-xs space-y-2 h-44 overflow-y-auto bg-gray-900/80 p-3 rounded border border-gray-800">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-10">Engine standing by. Trigger a test cycle or start bot to begin auto-trading.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="text-gray-300">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
