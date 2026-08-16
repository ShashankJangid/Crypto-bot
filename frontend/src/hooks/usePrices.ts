import { useEffect, useState, useRef } from 'react';
import { PriceData } from '../types';

interface CoinGeckoResponse {
  [key: string]: { usd: number; usd_24h_change?: number };
}

const CG_IDS = 'solana,bitcoin,ethereum,jupiter-exchange-solana';
const CG_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${CG_IDS}&vs_currencies=usd&include_24hr_change=true`;

const PYTH_HERMES_URL = 'https://hermes.pyth.network/v2/updates/price/latest?ids[]=0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d&ids[]=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43&ids[]=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';

const JUP_PRICE_URL = 'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112,JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';

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

    const fetchPythPrices = async (): Promise<Record<string, { price: number; change24h: number }> | null> => {
      try {
        const res = await fetch(PYTH_HERMES_URL);
        if (!res.ok) return null;
        const data = await res.json();
        const pythMap: Record<string, string> = {
          '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d': 'SOL/USD',
          '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43': 'BTC/USD',
          '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace': 'ETH/USD',
        };
        const result: Record<string, { price: number; change24h: number }> = {};
        if (data.parsed) {
          for (const item of data.parsed) {
            const hex = '0x' + item.id;
            const token = pythMap[hex];
            if (token && item.price) {
              const p = parseFloat(item.price.price) * Math.pow(10, item.price.expo);
              result[token] = { price: p, change24h: 0 };
            }
          }
        }
        return result;
      } catch {
        return null;
      }
    };

    const fetchJupiterPrices = async (): Promise<Record<string, number> | null> => {
      try {
        const res = await fetch(JUP_PRICE_URL);
        if (!res.ok) return null;
        const data = await res.json();
        const result: Record<string, number> = {};
        if (data.data) {
          if (data.data['So11111111111111111111111111111111111111112']?.price) {
            result['SOL/USD'] = parseFloat(data.data['So11111111111111111111111111111111111111112'].price);
          }
          if (data.data['JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN']?.price) {
            result['JUP/USD'] = parseFloat(data.data['JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'].price);
          }
        }
        return result;
      } catch {
        return null;
      }
    };

    const fetchPrices = async () => {
      let rawPrices: Record<string, { price: number; change24h: number; source: string }> = {};
      
      // 1. Try CoinGecko
      try {
        const res = await fetch(CG_URL);
        if (res.ok) {
          const data: CoinGeckoResponse = await res.json();
          for (const [cgId, token] of Object.entries(TOKEN_MAP)) {
            if (data[cgId]) {
              rawPrices[token] = {
                price: data[cgId].usd,
                change24h: data[cgId].usd_24h_change ?? 0,
                source: 'CoinGecko'
              };
            }
          }
        }
      } catch {
        // Fallback to Pyth & Jupiter
      }

      // 2. If CoinGecko didn't provide all prices, fall back to Pyth Oracle & Jupiter
      if (!rawPrices['SOL/USD'] || !rawPrices['BTC/USD'] || !rawPrices['ETH/USD']) {
        const pythPrices = await fetchPythPrices();
        if (pythPrices) {
          for (const [token, val] of Object.entries(pythPrices)) {
            if (!rawPrices[token]) {
              rawPrices[token] = { price: val.price, change24h: val.change24h, source: 'Pyth Oracle' };
            }
          }
        }
      }

      const jupPrices = await fetchJupiterPrices();
      if (jupPrices) {
        if (jupPrices['JUP/USD'] && !rawPrices['JUP/USD']) {
          rawPrices['JUP/USD'] = { price: jupPrices['JUP/USD'], change24h: 1.2, source: 'Jupiter DEX' };
        }
      }

      if (!active || Object.keys(rawPrices).length === 0) return;

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const next: Record<string, PriceData> = {};

      for (const [token, data] of Object.entries(rawPrices)) {
        if (!historyRef.current[token]) historyRef.current[token] = [];
        historyRef.current[token].push({ time: now, price: data.price });
        if (historyRef.current[token].length > 40) historyRef.current[token].shift();

        next[token] = {
          price: data.price,
          change24h: data.change24h,
          source: data.source,
          history: [...historyRef.current[token]],
        };
      }

      setPrices(next);
      setLoading(false);
      setError(null);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { prices, loading, error };
};
