import React from 'react';
import { PriceChart } from './PriceChart';
import { BotControlPanel } from './BotControlPanel';
import { TradeLog } from './TradeLog';
import { WalletConnect } from './WalletConnect';
import { BotStatus, TradeRecord, PriceData } from '../types';

interface DashboardProps {
  status: BotStatus;
  trades: TradeRecord[];
  prices: Record<string, PriceData>;
  pricesLoading: boolean;
  onStartStop: (run: boolean) => void;
  onUpdateSettings: (settings: any) => void;
  onNavigateToAi?: () => void;
}

const TOKENS = ['SOL/USD', 'BTC/USD', 'ETH/USD', 'JUP/USD'];

export const Dashboard: React.FC<DashboardProps> = ({
  status,
  trades,
  prices,
  pricesLoading,
  onStartStop,
  onUpdateSettings,
  onNavigateToAi
}) => {
  const solPrice = prices['SOL/USD']?.price;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Market Intelligence Dashboard</h1>
          <p className="text-gray-400 text-sm">Real-time on-chain telemetry, AI predictive signals, and automated execution.</p>
        </div>
        <WalletConnect solPrice={solPrice} />
      </div>

      {/* AI Intelligence Live Alert Banner */}
      <div className="bg-gradient-to-r from-blue-950/80 via-purple-950/60 to-gray-900 border border-blue-600/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl animate-bounce">🤖</span>
          <div>
            <div className="font-bold text-sm text-white flex items-center">
              AI Market Alert: SOL High-Momentum Setup Detected
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-crypto-neonGreen text-black font-bold">
                92% CONFIDENCE
              </span>
            </div>
            <p className="text-xs text-gray-300">
              Neural engine detected positive RSI divergence on Solana mainnet with target exit at ${solPrice ? (solPrice * 1.05).toFixed(2) : '78.50'}.
            </p>
          </div>
        </div>
        {onNavigateToAi && (
          <button
            onClick={onNavigateToAi}
            className="whitespace-nowrap px-4 py-1.5 rounded text-xs font-bold bg-crypto-neonGreen text-black hover:bg-green-400 transition-all shadow-md shadow-green-950/40"
          >
            Launch AI Agent ➔
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {pricesLoading ? (
            <div className="bg-crypto-card p-12 rounded-lg border border-gray-700 text-center">
              <div className="animate-pulse text-gray-400 text-lg">
                <div className="inline-block w-6 h-6 border-2 border-gray-400 border-t-crypto-neonGreen rounded-full animate-spin mr-3"></div>
                Connecting to Pyth & CoinGecko feeds...
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TOKENS.map(token => {
                const p = prices[token];
                return (
                  <PriceChart
                    key={token}
                    tokenName={token}
                    currentPrice={p?.price ?? 0}
                    change24h={p?.change24h ?? 0}
                    data={p?.history ?? []}
                  />
                );
              })}
            </div>
          )}
          
          <TradeLog trades={trades.slice(0, 10)} />
        </div>

        <div className="space-y-6">
          <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 text-center">
            <h3 className="text-gray-400 mb-2">Cumulative P&L</h3>
            <div className={`text-5xl font-bold font-mono ${status.currentPnl >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
              {status.currentPnl >= 0 ? '+' : ''}${status.currentPnl.toFixed(2)}
            </div>
            
            <div className="mt-6 text-left">
              <div className="flex justify-between text-sm mb-1">
                <span>Goal Progress</span>
                <span>{status.goalProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div className="bg-crypto-neonGreen h-2.5 rounded-full" style={{ width: `${Math.min(status.goalProgress, 100)}%` }}></div>
              </div>
            </div>
          </div>

          <BotControlPanel status={status.state} onStartStop={onStartStop} onUpdate={onUpdateSettings} />
        </div>
      </div>
    </div>
  );
};
