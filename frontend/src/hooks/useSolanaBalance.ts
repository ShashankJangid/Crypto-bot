import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const useSolanaBalance = (publicKey: PublicKey | null) => {
  const { connection } = useConnection();
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
      try {
        const bal = await connection.getBalance(publicKey);
        if (active) {
          setBalance(bal / LAMPORTS_PER_SOL);
          setLoading(false);
        }
      } catch (err) {
        console.error('Balance fetch error:', err);
        if (active) setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [publicKey, connection]);

  return { balance, loading };
};
