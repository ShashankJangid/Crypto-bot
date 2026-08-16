import { useEffect, useState, useRef } from 'react';
import { PriceData } from '../types';

interface CoinGeckoResponse {
  [key: string]: { usd: number; usd_24h_change?: number };
}

const CG_IDS = 'solana,bitcoin,ethereum,jupiter-exchange-solana';
const CG_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${CG_IDS}&vs_currencies=usd&include_24hr_change=true`;

const TOKEN_MAP: Record<string, string> = {
  solana: 'SOL/USD',
  bitcoin: 'BTC/USD',
  ethereum: 'ETH/USD',
  'jupiter-exchange-solana': 'JUP/USD',
};

export const usePrices = () => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<Record<string, { time: string; price: number }[]>>({});

  useEffect(() => {
    let active = true;

    const fetchPrices = async () => {
      try {
        const res = await fetch(CG_URL);
        if (!res.ok) {
          if (res.status === 429) {
            setError('Rate limited — retrying...');
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data: CoinGeckoResponse = await res.json();
        if (!active) return;

        const now = new Date().toLocaleTimeString();
        const next: Record<string, PriceData> = {};

        for (const [cgId, token] of Object.entries(TOKEN_MAP)) {
          if (data[cgId]) {
            const price = data[cgId].usd;
            const change24h = data[cgId].usd_24h_change ?? 0;

            if (!historyRef.current[token]) historyRef.current[token] = [];
            historyRef.current[token].push({ time: now, price });
            if (historyRef.current[token].length > 50) historyRef.current[token].shift();

            next[token] = {
              price,
              change24h,
              source: 'CoinGecko',
              history: [...historyRef.current[token]],
            };
          }
        }

        setPrices(next);
        setLoading(false);
        setError(null);
      } catch (e: any) {
        console.error('Price fetch error:', e);
        setError(e.message);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 6000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { prices, loading, error };
};
