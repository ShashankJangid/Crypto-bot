import React, { useState } from 'react';
import { BotSettings } from '../types';

interface BotControlPanelProps {
  onUpdate: (settings: BotSettings) => void;
  status: 'idle' | 'running' | 'paused';
  onStartStop: (running: boolean) => void;
}

export const BotControlPanel: React.FC<BotControlPanelProps> = ({ onUpdate, status, onStartStop }) => {
  const [settings, setSettings] = useState<BotSettings>({
    arbEnabled: true,
    swingEnabled: false,
    arbThreshold: 1.5,
    profitTarget: 100,
    stopLoss: 5,
    goalUsd: 1000,
    maxTradeSize: 10
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newSettings = {
      ...settings,
      [name]: type === 'checkbox' ? checked : parseFloat(value) || 0
    };
    setSettings(newSettings);
    onUpdate(newSettings);
  };

  return (
    <div className="bg-crypto-card p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold border-b border-gray-600 pb-2 flex-1">Bot Control Panel</h2>
        <div className="flex items-center ml-4 space-x-2">
          <span className={`px-3 py-1 rounded text-sm font-bold uppercase ${
            status === 'running' ? 'bg-crypto-neonGreen text-black' : 'bg-gray-600 text-white'
          }`}>
            {status}
          </span>
          <button
            onClick={() => onStartStop(status !== 'running')}
            className={`px-4 py-1 rounded font-bold transition-colors ${
              status === 'running' ? 'bg-crypto-neonRed hover:bg-red-600' : 'bg-crypto-neonGreen text-black hover:bg-green-500'
            }`}
          >
            {status === 'running' ? 'STOP' : 'START'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center space-x-2">
          <input type="checkbox" name="arbEnabled" checked={settings.arbEnabled} onChange={handleChange} className="form-checkbox bg-gray-800" />
          <span>Enable Arbitrage</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="checkbox" name="swingEnabled" checked={settings.swingEnabled} onChange={handleChange} className="form-checkbox bg-gray-800" />
          <span>Enable Swing Trade</span>
        </label>

        <div>
          <label className="block text-sm text-gray-400">Arbitrage Threshold (%)</label>
          <input type="number" name="arbThreshold" value={settings.arbThreshold} onChange={handleChange} step="0.1" className="w-full bg-gray-800 border border-gray-600 rounded p-1 mt-1 text-white font-mono" />
        </div>
        <div>
          <label className="block text-sm text-gray-400">Max Trade Size (SOL)</label>
          <input type="number" name="maxTradeSize" value={settings.maxTradeSize} onChange={handleChange} step="1" className="w-full bg-gray-800 border border-gray-600 rounded p-1 mt-1 text-white font-mono" />
        </div>

        <div>
          <label className="block text-sm text-gray-400">Profit Target ($)</label>
          <input type="number" name="profitTarget" value={settings.profitTarget} onChange={handleChange} step="1" className="w-full bg-gray-800 border border-gray-600 rounded p-1 mt-1 text-white font-mono" />
        </div>
        <div>
          <label className="block text-sm text-gray-400">Stop Loss (%)</label>
          <input type="number" name="stopLoss" value={settings.stopLoss} onChange={handleChange} step="0.5" className="w-full bg-gray-800 border border-gray-600 rounded p-1 mt-1 text-white font-mono" />
        </div>

        <div className="col-span-2">
          <label className="block text-sm text-gray-400">Goal Amount ($)</label>
          <input type="number" name="goalUsd" value={settings.goalUsd} onChange={handleChange} step="10" className="w-full bg-gray-800 border border-gray-600 rounded p-1 mt-1 text-white font-mono" />
        </div>
      </div>
    </div>
  );
};
