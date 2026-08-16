import React from 'react';
import { ArbOpportunity } from '../types';

interface ArbitragePageProps {
  opportunities: ArbOpportunity[];
}

export const ArbitragePage: React.FC<ArbitragePageProps> = ({ opportunities }) => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Arbitrage Scanner</h1>
      <p className="text-gray-400">Live monitoring of DEX spreads across Raydium, Orca, and Jupiter.</p>
      
      <div className="bg-crypto-card p-4 rounded-lg border border-gray-700">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="pb-2 pr-4">Pair</th>
              <th className="pb-2 pr-4">Buy DEX</th>
              <th className="pb-2 pr-4">Sell DEX</th>
              <th className="pb-2 pr-4">Spread %</th>
              <th className="pb-2 pr-4">Est. Profit</th>
              <th className="pb-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opp) => (
              <tr key={opp.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 pr-4 font-bold">{opp.pair}</td>
                <td className="py-3 pr-4">
                  <div className="text-blue-400">{opp.dexA}</div>
                  <div className="font-mono text-xs">${opp.priceA.toFixed(4)}</div>
                </td>
                <td className="py-3 pr-4">
                  <div className="text-purple-400">{opp.dexB}</div>
                  <div className="font-mono text-xs">${opp.priceB.toFixed(4)}</div>
                </td>
                <td className="py-3 pr-4 font-mono font-bold neon-text-green">{opp.spreadPct.toFixed(2)}%</td>
                <td className="py-3 pr-4 font-mono neon-text-green">${opp.potentialProfit.toFixed(2)}</td>
                <td className="py-3">
                  <button className="bg-crypto-neonGreen text-black px-3 py-1 rounded font-bold hover:bg-green-500 transition-colors">
                    EXECUTE
                  </button>
                </td>
              </tr>
            ))}
            {opportunities.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  <div className="animate-pulse">Scanning for arbitrage opportunities...</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
