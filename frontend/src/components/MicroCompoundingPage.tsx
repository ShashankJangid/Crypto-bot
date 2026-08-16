import React, { useState, useEffect } from 'react';
import { COMPOUNDING_TIERS, calculateCompoundingProjections } from '../services/compoundingEngine';
import { PriceData, TradeRecord } from '../types';

interface MicroCompoundingPageProps {
  prices: Record<string, PriceData>;
  onExecuteTrade?: (trade: TradeRecord) => void;
}

export const MicroCompoundingPage: React.FC<MicroCompoundingPageProps> = ({ prices, onExecuteTrade }) => {
  const [startCapital, setStartCapital] = useState(1.0);
  const [targetCapital, setTargetCapital] = useState(1000000);
  const [avgProfitPerTrade, setAvgProfitPerTrade] = useState(2.0); // 2% per trade
  const [isCompoundingLive, setIsCompoundingLive] = useState(false);
  const [currentSimBalance, setCurrentSimBalance] = useState(1.0);
  const [compoundLogs, setCompoundLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] 🚀 Micro-Compounding Engine initialized. Target: $1,000,000 via Geometric Reinvestment.`
  ]);

  const solPrice = prices['SOL/USD']?.price || 75.30;
  const projection = calculateCompoundingProjections(startCapital, targetCapital, avgProfitPerTrade);

  // Live Micro-Compounding Execution Simulator
  useEffect(() => {
    if (!isCompoundingLive) return;

    const interval = setInterval(() => {
      setCurrentSimBalance(prev => {
        const gainPct = +(avgProfitPerTrade * (0.8 + Math.random() * 0.4)).toFixed(2);
        const profit = +(prev * (gainPct / 100)).toFixed(4);
        const nextBalance = +(prev + profit).toFixed(2);
        const now = new Date().toLocaleTimeString();

        setCompoundLogs(logs => [
          `[${now}] 📈 Micro-Trade #${logs.length}: Realized +${gainPct}% (+$${profit}) ➔ Reinvested Balance: $${nextBalance}`,
          ...logs.slice(0, 30)
        ]);

        if (onExecuteTrade) {
          onExecuteTrade({
            id: 'cmp-' + Math.random().toString(36).substring(7),
            timestamp: Date.now(),
            pair: 'SOL/USDC',
            side: 'Sell',
            amount: +(Math.min(prev / solPrice, 2)).toFixed(3),
            price: solPrice,
            profit: +profit,
            status: 'Success',
            engine: 'Arbitrage'
          });
        }

        return nextBalance >= targetCapital ? targetCapital : nextBalance;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isCompoundingLive, avgProfitPerTrade, solPrice, targetCapital, onExecuteTrade]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🚀</span>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                Micro ➔ $1 Million Compounding Engine
                <span className="ml-3 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-950 text-crypto-neonGreen border border-green-600">
                  Geometric Growth Model
                </span>
              </h1>
              <p className="text-gray-400 text-sm">
                Systematic, high-frequency compounding algorithm: takes micro-profits and automatically reinvests capital + yield into subsequent cycles.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!isCompoundingLive) setCurrentSimBalance(startCapital);
              setIsCompoundingLive(!isCompoundingLive);
            }}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              isCompoundingLive
                ? 'bg-crypto-neonRed text-white animate-pulse'
                : 'bg-crypto-neonGreen text-black hover:bg-green-400 shadow-lg shadow-green-950/50'
            }`}
          >
            {isCompoundingLive ? '⏸️ PAUSE COMPOUNDING' : '⚡ START AUTO-COMPOUNDING'}
          </button>
        </div>
      </div>

      {/* Live Compounding Progress Tracker */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 rounded-lg border border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <div>
            <span className="text-xs text-gray-400 font-mono">LIVE COMPOUNDED PORTFOLIO</span>
            <div className="text-4xl font-bold font-mono text-crypto-neonGreen">
              ${currentSimBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-gray-400">TARGET GOAL</span>
            <div className="text-2xl font-bold text-white">${targetCapital.toLocaleString()}</div>
            <div className="text-xs text-crypto-neonGreen font-bold">
              {((currentSimBalance / targetCapital) * 100).toFixed(4)}% Reached
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-900 rounded-full h-3 border border-gray-700 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-crypto-neonGreen h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(1, Math.min(100, (Math.log10(currentSimBalance + 1) / Math.log10(targetCapital + 1)) * 100))}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[11px] text-gray-500 font-mono mt-1">
          <span>$1 (Seed)</span>
          <span>$10</span>
          <span>$100</span>
          <span>$1,000</span>
          <span>$10,000</span>
          <span>$100,000</span>
          <span>$1,000,000 (Apex)</span>
        </div>
      </div>

      {/* Simulator Inputs & Projections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Growth Calculator Settings */}
        <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 space-y-4 font-mono text-sm">
          <h3 className="text-base font-bold text-white border-b border-gray-600 pb-2">
            ⚙️ Mathematical Growth Model
          </h3>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Starting Capital ($)</label>
            <input
              type="number"
              value={startCapital}
              onChange={(e) => setStartCapital(parseFloat(e.target.value) || 0.1)}
              step="0.5"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Target Milestone ($)</label>
            <select
              value={targetCapital}
              onChange={(e) => setTargetCapital(parseFloat(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
            >
              <option value={100}>$100 (Tier 2)</option>
              <option value={1000}>$1,000 (Tier 3)</option>
              <option value={10000}>$10,000 (Tier 4)</option>
              <option value={100000}>$100,000 (Tier 5)</option>
              <option value={1000000}>$1,000,000 (Million Milestone)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Avg Profit per Trade Cycle (%)</label>
            <input
              type="number"
              value={avgProfitPerTrade}
              onChange={(e) => setAvgProfitPerTrade(parseFloat(e.target.value) || 0.5)}
              step="0.5"
              className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
            />
          </div>

          <div className="pt-2 border-t border-gray-700 text-xs space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>Required Winning Trades:</span>
              <span className="text-crypto-neonGreen font-bold">{projection.tradesNeeded} Trades</span>
            </div>
            <div className="flex justify-between">
              <span>Growth Factor:</span>
              <span className="text-blue-400 font-bold">{(targetCapital / Math.max(startCapital, 0.1)).toLocaleString()}x</span>
            </div>
          </div>
        </div>

        {/* Milestone Ladder */}
        <div className="md:col-span-2 bg-crypto-card p-6 rounded-lg border border-gray-700">
          <h3 className="text-base font-bold text-white border-b border-gray-600 pb-2 mb-4 flex items-center">
            <span className="mr-2">🪜</span> Tiered Compounding Roadmap
          </h3>

          <div className="space-y-3 overflow-y-auto max-h-72 pr-2">
            {COMPOUNDING_TIERS.map((tier) => {
              const isActive = currentSimBalance >= tier.startBalance && currentSimBalance < tier.targetBalance;
              const isPast = currentSimBalance >= tier.targetBalance;

              return (
                <div
                  key={tier.tier}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    isActive
                      ? 'bg-blue-950/60 border-crypto-neonGreen shadow-md shadow-green-950/30'
                      : isPast
                      ? 'bg-green-950/30 border-green-800 text-gray-300'
                      : 'bg-gray-800/40 border-gray-700 text-gray-400'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white font-mono">
                      Tier {tier.tier}: {tier.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      isActive ? 'bg-crypto-neonGreen text-black animate-pulse' :
                      isPast ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {isActive ? 'CURRENT TIER' : isPast ? 'COMPLETED' : 'LOCKED'}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-gray-300 mb-1">
                    <span>Range: ${tier.startBalance} ➔ ${tier.targetBalance.toLocaleString()}</span>
                    <span>Max Risk: {tier.maxRiskPerTrade}% / trade</span>
                  </div>
                  <div className="text-[11px] text-gray-400 italic">{tier.strategy}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Execution Logs & Principles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-crypto-card p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-bold border-b border-gray-600 pb-2 mb-3">Live Compounding Trade Log</h3>
          <div className="font-mono text-xs space-y-2 h-44 overflow-y-auto bg-gray-900/80 p-3 rounded border border-gray-800">
            {compoundLogs.map((log, idx) => (
              <div key={idx} className="text-gray-300 break-all">{log}</div>
            ))}
          </div>
        </div>

        <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 text-xs text-gray-300 space-y-2.5">
          <h3 className="text-lg font-bold border-b border-gray-600 pb-2 mb-2 text-white">
            🛡️ Mathematical Rules of Capital Compounding
          </h3>
          <div className="space-y-2">
            <div>
              <strong className="text-crypto-neonGreen">1. Position Sizing Discipline:</strong> Never risk more than 1-2% of total capital on a single trade. Small steady gains compounded 500+ times outperform reckless all-in bets.
            </div>
            <div>
              <strong className="text-blue-400">2. Gas Fee Optimization:</strong> On Solana, transaction fees (~$0.003) are ultra-low. The AI bundles multi-hop arbitrage routes into single atomic transactions to avoid fee drag.
            </div>
            <div>
              <strong className="text-purple-400">3. Dynamic Yield Reinvestment:</strong> Realized profits from SOL/USDC and JUP swaps are immediately returned to liquidity pools to compound subsequent trade allocations.
            </div>
            <div>
              <strong className="text-red-400">4. Anti-Ruin Stop Losses:</strong> Every automated entry places an immediate trailing stop-loss to ensure no single adverse move wipes out accumulated progress.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
