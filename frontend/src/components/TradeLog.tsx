import React from 'react';
import { TradeRecord } from '../types';

interface TradeLogProps {
  trades: TradeRecord[];
}

export const TradeLog: React.FC<TradeLogProps> = ({ trades }) => {
  return (
    <div className="bg-crypto-card p-4 rounded-lg border border-gray-700 overflow-x-auto">
      <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Recent Trades</h2>
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="pb-2 pr-4">Time</th>
            <th className="pb-2 pr-4">Pair</th>
            <th className="pb-2 pr-4">Side</th>
            <th className="pb-2 pr-4">Amount</th>
            <th className="pb-2 pr-4">Price</th>
            <th className="pb-2 pr-4">P&L</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const isProfit = trade.profit > 0;
            return (
              <tr key={trade.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-2 pr-4 font-mono">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                <td className="py-2 pr-4">{trade.pair}</td>
                <td className={`py-2 pr-4 font-bold ${trade.side === 'Buy' ? 'text-blue-400' : 'text-purple-400'}`}>
                  {trade.side}
                </td>
                <td className="py-2 pr-4 font-mono">{trade.amount.toFixed(2)}</td>
                <td className="py-2 pr-4 font-mono">${trade.price.toFixed(4)}</td>
                <td className={`py-2 pr-4 font-mono font-bold ${
                  trade.profit === 0 ? 'text-gray-400' : isProfit ? 'neon-text-green' : 'neon-text-red'
                }`}>
                  {trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(2)}
                </td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    trade.status === 'Success' ? 'bg-green-900/50 text-green-400' :
                    trade.status === 'Failed' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'
                  }`}>
                    {trade.status}
                  </span>
                </td>
              </tr>
            );
          })}
          {trades.length === 0 && (
            <tr>
              <td colSpan={7} className="py-4 text-center text-gray-500">No trades recorded yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
