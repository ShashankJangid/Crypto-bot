import React from 'react';

export const SwingTradePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Swing Trading</h1>
      <p className="text-gray-400">Automated buy low / sell high cycles based on technical indicators.</p>
      
      <div className="bg-crypto-card p-8 rounded-lg border border-gray-700 text-center">
        <h2 className="text-2xl font-bold mb-4">No Active Swing Positions</h2>
        <p className="text-gray-500 mb-6">Configure a swing trade pair to begin automated accumulation and distribution.</p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold transition-colors">
          + New Swing Trade Setup
        </button>
      </div>
    </div>
  );
};
