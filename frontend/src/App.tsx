import { useMemo, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Dashboard } from './components/Dashboard';
import { ArbitragePage } from './components/ArbitragePage';
import { SwingTradePage } from './components/SwingTradePage';
import { SettingsPage } from './components/SettingsPage';
import { usePrices } from './hooks/usePrices';
import { BotStatus, TradeRecord, ArbOpportunity } from './types';
import { config } from './config';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { prices, loading: pricesLoading } = usePrices();

  const [botStatus, setBotStatus] = useState<BotStatus>({
    state: 'idle',
    uptime: 0,
    tradesExecuted: 0,
    currentPnl: 0,
    goalProgress: 0
  });
  
  const [trades] = useState<TradeRecord[]>([]);
  const [opportunities] = useState<ArbOpportunity[]>([]);

  const endpoint = config.rpcEndpoint;
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  const handleStartStop = (run: boolean) => {
    setBotStatus(prev => ({ ...prev, state: run ? 'running' : 'idle' }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard status={botStatus} trades={trades} prices={prices} pricesLoading={pricesLoading} onStartStop={handleStartStop} onUpdateSettings={() => {}} />;
      case 'arbitrage':
        return <ArbitragePage opportunities={opportunities} />;
      case 'swing':
        return <SwingTradePage />;
      case 'settings':
        return <SettingsPage />;
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
            <div className="w-64 bg-crypto-card border-r border-gray-700 p-4 flex flex-col">
              <div className="text-2xl font-bold mb-8 text-crypto-neonGreen flex items-center">
                <span className="mr-2">⚡</span> ArbBot
              </div>
              
              <nav className="flex-1 space-y-2">
                {['dashboard', 'arbitrage', 'swing', 'settings'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full text-left px-4 py-3 rounded capitalize transition-colors ${
                      activeTab === tab ? 'bg-gray-700 text-white font-bold' : 'text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>

              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center text-sm">
                  <div className={`w-2 h-2 rounded-full mr-2 ${!pricesLoading ? 'bg-crypto-neonGreen' : 'bg-yellow-500 animate-pulse'}`}></div>
                  {!pricesLoading ? 'Live Prices' : 'Connecting...'}
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
