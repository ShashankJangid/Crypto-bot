import React from 'react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 space-y-4">
        <h3 className="text-xl font-bold border-b border-gray-600 pb-2">RPC Configuration</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Solana RPC Endpoint</label>
          <input type="text" defaultValue="https://api.mainnet-beta.solana.com" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">WebSocket Endpoint</label>
          <input type="text" defaultValue="wss://api.mainnet-beta.solana.com" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono" />
        </div>
      </div>

      <div className="bg-crypto-card p-6 rounded-lg border border-gray-700 space-y-4">
        <h3 className="text-xl font-bold border-b border-gray-600 pb-2">Data Export</h3>
        <p className="text-sm text-gray-400">Download your full trade history for tax purposes or external analysis.</p>
        <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold transition-colors">
          Export CSV
        </button>
      </div>
    </div>
  );
};
