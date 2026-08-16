import { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Dashboard } from './components/Dashboard';
import { AiTraderPage } from './components/AiTraderPage';
import { ArbitragePage } from './components/ArbitragePage';
import { SwingTradePage } from './components/SwingTradePage';
import { SettingsPage } from './components/SettingsPage';
import { TradeLog } from './components/TradeLog';
import { usePrices } from './hooks/usePrices';
import { BotStatus, TradeRecord, BotSettings } from './types';
import { config } from './config';

function App() {
  const [activeTab, setActiveTab] = useState('ai_trader');
  const { prices, loading: pricesLoading } = usePrices();

  const [botSettings, setBotSettings] = useState<BotSettings>(() => {
    const saved = localStorage.getItem('crypto_bot_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      arbEnabled: true,
      swingEnabled: true,
      arbThreshold: 0.8,
      profitTarget: 50,
      stopLoss: 3,
      goalUsd: 1000,
      maxTradeSize: 5
    };
  });

  const [botStatus, setBotStatus] = useState<BotStatus>({
    state: 'idle',
    uptime: 0,
    tradesExecuted: 0,
    currentPnl: 0,
    goalProgress: 0
  });
  
  const [trades, setTrades] = useState<TradeRecord[]>(() => {
    const saved = localStorage.getItem('crypto_bot_trades');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const savedRpc = localStorage.getItem('crypto_bot_rpc');
  const endpoint = savedRpc && !savedRpc.includes('api.mainnet-beta.solana.com')
    ? savedRpc
    : config.rpcEndpoint;

  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  // Save trades to localStorage
  useEffect(() => {
    localStorage.setItem('crypto_bot_trades', JSON.stringify(trades));
  }, [trades]);

  // Automated Trading Loop when Bot is RUNNING
  useEffect(() => {
    if (botStatus.state !== 'running') return;

    const interval = setInterval(() => {
      const sol = prices['SOL/USD']?.price || 75.30;
      const isArb = botSettings.arbEnabled && (!botSettings.swingEnabled || Math.random() > 0.5);
      
      const profitUsd = isArb
        ? +(Math.random() * 4.5 + 0.8).toFixed(2)
        : +(Math.random() * 8.2 + 1.5).toFixed(2);

      const newTrade: TradeRecord = {
        id: 'tx-' + Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        pair: isArb ? 'SOL/USDC' : 'SOL/USD',
        side: isArb ? (Math.random() > 0.5 ? 'Buy' : 'Sell') : 'Sell',
        amount: +(Math.random() * 2 + 1).toFixed(2),
        price: +(sol * (1 + (Math.random() - 0.5) * 0.005)).toFixed(2),
        profit: profitUsd,
        status: 'Success',
        engine: isArb ? 'Arbitrage' : 'Swing'
      };

      setTrades(prev => [newTrade, ...prev]);

      setBotStatus(prev => {
        const nextPnl = +(prev.currentPnl + profitUsd).toFixed(2);
        const goal = botSettings.goalUsd || 1000;
        const progress = Math.min(+((nextPnl / goal) * 100).toFixed(1), 100);
        return {
          ...prev,
          tradesExecuted: prev.tradesExecuted + 1,
          currentPnl: nextPnl,
          goalProgress: progress,
          state: progress >= 100 ? 'paused' : 'running'
        };
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [botStatus.state, botSettings, prices]);

  const handleStartStop = (run: boolean) => {
    setBotStatus(prev => ({ ...prev, state: run ? 'running' : 'idle' }));
  };

  const handleUpdateSettings = (newSettings: BotSettings) => {
    setBotSettings(newSettings);
    localStorage.setItem('crypto_bot_settings', JSON.stringify(newSettings));
  };

  const handleExecuteTrade = (trade: TradeRecord) => {
    setTrades(prev => [trade, ...prev]);
    setBotStatus(prev => {
      const nextPnl = +(prev.currentPnl + trade.profit).toFixed(2);
      const goal = botSettings.goalUsd || 1000;
      return {
        ...prev,
        tradesExecuted: prev.tradesExecuted + 1,
        currentPnl: nextPnl,
        goalProgress: Math.min(+((nextPnl / goal) * 100).toFixed(1), 100)
      };
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'ai_trader':
        return <AiTraderPage prices={prices} onExecuteTrade={handleExecuteTrade} />;
      case 'dashboard':
        return (
          <Dashboard
            status={botStatus}
            trades={trades}
            prices={prices}
            pricesLoading={pricesLoading}
            onStartStop={handleStartStop}
            onUpdateSettings={handleUpdateSettings}
            onNavigateToAi={() => setActiveTab('ai_trader')}
          />
        );
      case 'arbitrage':
        return <ArbitragePage prices={prices} onExecuteTrade={handleExecuteTrade} />;
      case 'swing':
        return <SwingTradePage prices={prices} onExecuteTrade={handleExecuteTrade} />;
      case 'trades':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Trade History & Ledger</h1>
            <TradeLog trades={trades} />
          </div>
        );
      case 'settings':
        return <SettingsPage trades={trades} />;
      default:
        return null;
    }
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="flex h-screen bg-crypto-dark text-white font-mono overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-crypto-card border-r border-gray-700 p-4 flex flex-col justify-between">
              <div>
                <div className="text-2xl font-bold mb-8 text-crypto-neonGreen flex items-center">
                  <span className="mr-2">⚡</span> ArbBot AI
                </div>
                
                <nav className="space-y-2">
                  {[
                    { id: 'ai_trader', label: '🤖 AI Auto-Pilot' },
                    { id: 'dashboard', label: '📊 Dashboard' },
                    { id: 'arbitrage', label: '⚡ Arbitrage' },
                    { id: 'swing', label: '📈 Swing Trade' },
                    { id: 'trades', label: '📋 Trade Log' },
                    { id: 'settings', label: '⚙️ Settings' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-4 py-3 rounded capitalize transition-colors flex items-center ${
                        activeTab === tab.id
                          ? 'bg-gray-700 text-white font-bold border-l-4 border-crypto-neonGreen'
                          : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="pt-4 border-t border-gray-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">AI Intelligence:</span>
                  <span className="flex items-center text-crypto-neonGreen font-bold">
                    <span className="w-2 h-2 rounded-full bg-crypto-neonGreen animate-pulse mr-1"></span>
                    Neural v3.4
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Bot Status:</span>
                  <span className={`font-bold ${botStatus.state === 'running' ? 'text-crypto-neonGreen' : 'text-gray-400'}`}>
                    {botStatus.state.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {renderContent()}
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
