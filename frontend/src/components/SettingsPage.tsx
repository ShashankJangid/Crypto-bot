import React, { useState } from 'react';
import { TradeRecord } from '../types';

interface SettingsPageProps {
  trades: TradeRecord[];
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ trades }) => {
  const [rpcUrl, setRpcUrl] = useState(() => {
    const saved = localStorage.getItem('crypto_bot_rpc');
    return saved && !saved.includes('api.mainnet-beta.solana.com') ? saved : 'https://solana-rpc.publicnode.com';
  });
  const [cluster, setCluster] = useState<'mainnet-beta' | 'devnet'>('mainnet-beta');
  const [autoSign, setAutoSign] = useState(false);
  const [maxSlippage, setMaxSlippage] = useState('0.5');
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('crypto_bot_rpc', rpcUrl);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const handleExportCSV = () => {
    if (trades.length === 0) {
      alert('No trade history to export yet.');
      return;
    }

    const headers = ['ID', 'Timestamp', 'Pair', 'Side', 'Amount', 'Price', 'Profit_USD', 'Status', 'Engine'];
    const rows = trades.map(t => [
      t.id,
      new Date(t.timestamp).toISOString(),
      t.pair,
      t.side,
      t.amount,
      t.price,
      t.profit,
      t.status,
      t.engine
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `solana_bot_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Settings & Configuration</h1>
      
      {savedMsg && (
        <div className="bg-green-950 border border-green-500 text-green-300 p-3 rounded-lg text-sm font-mono">
          ✅ Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-crypto-card p-6 rounded-lg border border-gray-700 space-y-4">
        <h3 className="text-xl font-bold border-b border-gray-600 pb-2">Solana Network & RPC</h3>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Target Cluster</label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="cluster"
                value="mainnet-beta"
                checked={cluster === 'mainnet-beta'}
                onChange={() => setCluster('mainnet-beta')}
              />
              <span>Mainnet Beta (Real SOL)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="cluster"
                value="devnet"
                checked={cluster === 'devnet'}
                onChange={() => setCluster('devnet')}
              />
              <span>Devnet (Testnet)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Custom RPC Endpoint</label>
          <input
            type="text"
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            placeholder="https://api.mainnet-beta.solana.com or Helius/QuickNode URL"
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono text-sm"
          />
          <span className="text-xs text-gray-500 mt-1 block">
            Tip: You can use your own Helius, QuickNode, or Alchemy RPC endpoint for zero rate-limiting.
          </span>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Slippage Tolerance (%)</label>
          <input
            type="number"
            value={maxSlippage}
            onChange={(e) => setMaxSlippage(e.target.value)}
            step="0.1"
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono"
          />
        </div>

        <div className="pt-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoSign}
              onChange={(e) => setAutoSign(e.target.checked)}
              className="form-checkbox bg-gray-800"
            />
            <span>Auto-Sign Transaction Mode (Simulated Sandbox)</span>
          </label>
        </div>

        <button
          type="submit"
          className="bg-crypto-neonGreen text-black font-bold px-6 py-2 rounded hover:bg-green-400 transition-colors"
        >
          Save Settings
        </button>
      </form>

      <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 space-y-4">
        <h3 className="text-xl font-bold border-b border-gray-600 pb-2">Data Export</h3>
        <p className="text-sm text-gray-400">
          Export recorded trades, timestamps, and profit & loss analysis to a CSV file.
        </p>
        <button
          onClick={handleExportCSV}
          className="bg-gray-700 hover:bg-gray-600 px-5 py-2 rounded font-bold transition-colors flex items-center space-x-2 text-white"
        >
          <span>📥</span>
          <span>Export Trades CSV ({trades.length} records)</span>
        </button>
      </div>
    </div>
  );
};
