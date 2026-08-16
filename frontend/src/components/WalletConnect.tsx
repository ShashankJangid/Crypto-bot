import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolanaBalance } from '../hooks/useSolanaBalance';
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletConnectProps {
  solPrice?: number;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ solPrice }) => {
  const { publicKey } = useWallet();
  const { balance, loading } = useSolanaBalance(publicKey);

  const usdValue = solPrice ? (balance * solPrice).toFixed(2) : null;

  return (
    <div className="flex items-center space-x-4 bg-crypto-card p-3 sm:p-4 rounded-lg border border-gray-700">
      {publicKey && (
        <div className="text-sm space-y-0.5 text-right">
          <div>
            <span className="text-gray-400">Balance: </span>
            <span className="text-crypto-neonGreen font-bold font-mono">
              {loading && balance === 0 ? 'Loading...' : `${balance.toFixed(4)} SOL`}
            </span>
          </div>
          {usdValue && (
            <div className="text-gray-400 text-xs font-mono">≈ ${usdValue} USD</div>
          )}
        </div>
      )}
      <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 transition-colors !font-mono !text-sm" />
    </div>
  );
};
