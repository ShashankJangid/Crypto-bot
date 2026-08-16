import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RELIABLE_RPCS = [
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana.drpc.org',
];

export const useSolanaBalance = (publicKey: PublicKey | null) => {
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      return;
    }

    let active = true;
    const pubKeyStr = publicKey.toBase58();

    const fetchBalance = async () => {
      setLoading(true);

      // Method 1: Try direct Web3.js Connection
      try {
        const bal = await connection.getBalance(publicKey, 'confirmed');
        if (active) {
          setBalance(bal / LAMPORTS_PER_SOL);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Web3 connection getBalance error, trying HTTP JSON-RPC...', e);
      }

      // Method 2: Try CORS-enabled JSON-RPC endpoints directly via fetch
      for (const rpc of RELIABLE_RPCS) {
        try {
          const res = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getBalance',
              params: [pubKeyStr, { commitment: 'confirmed' }],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.result && typeof data.result.value === 'number') {
              if (active) {
                setBalance(data.result.value / LAMPORTS_PER_SOL);
                setLoading(false);
                return;
              }
            }
          }
        } catch {
          // Try next RPC
        }
      }

      // Fallback: If wallet has 0 lamports or network is quiet, default to 0
      if (active) {
        setBalance(0);
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 8000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [publicKey, connection]);

  return { balance, loading };
};
