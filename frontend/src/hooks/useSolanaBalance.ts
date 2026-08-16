import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const FALLBACK_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana-mainnet.rpc.extrnode.com',
];

export const useSolanaBalance = (publicKey: PublicKey | null) => {
  const { connection: contextConnection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    let active = true;
    setLoading(true);

    const fetchBalance = async () => {
      // 1. Try primary connection
      try {
        const bal = await contextConnection.getBalance(publicKey, 'confirmed');
        if (active) {
          setBalance(bal / LAMPORTS_PER_SOL);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Primary RPC getBalance failed, attempting fallbacks...', e);
      }

      // 2. Try fallbacks if primary failed
      for (const rpcUrl of FALLBACK_RPCS) {
        try {
          const fallbackConn = new Connection(rpcUrl, 'confirmed');
          const bal = await fallbackConn.getBalance(publicKey);
          if (active) {
            setBalance(bal / LAMPORTS_PER_SOL);
            setLoading(false);
            return;
          }
        } catch {
          // try next
        }
      }

      if (active) {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [publicKey, contextConnection]);

  return { balance, loading };
};
