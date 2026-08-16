import { EventEmitter } from 'events';
import { PriceSnapshot } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class PriceAggregator extends EventEmitter {
  private isRunning: boolean = false;
  private history: Map<string, PriceSnapshot[]> = new Map();
  private cgInterval: any = null;
  private jupInterval: any = null;
  private pythInterval: any = null;

  constructor() {
    super();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('PriceAggregator', 'Started');
    
    // Poll sources based on requested intervals
    this.cgInterval = setInterval(() => this.fetchCoinGecko(), 3000);
    this.jupInterval = setInterval(() => this.fetchJupiter(), 5000);
    this.pythInterval = setInterval(() => this.fetchPyth(), 4000);

    // Initial immediate fetch
    this.fetchCoinGecko();
    this.fetchJupiter();
    this.fetchPyth();
  }

  stop() {
    this.isRunning = false;
    if (this.cgInterval) clearInterval(this.cgInterval);
    if (this.jupInterval) clearInterval(this.jupInterval);
    if (this.pythInterval) clearInterval(this.pythInterval);
    this.cgInterval = null;
    this.jupInterval = null;
    this.pythInterval = null;
    logger.info('PriceAggregator', 'Stopped');
  }

  private storeSnapshot(snap: PriceSnapshot) {
    if (!this.history.has(snap.token)) {
      this.history.set(snap.token, []);
    }
    const tokenHistory = this.history.get(snap.token)!;
    tokenHistory.push(snap);
    
    if (tokenHistory.length > 1000) {
      tokenHistory.shift();
    }
  }

  private async fetchCoinGecko() {
    try {
      const url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum,jupiter-exchange-solana&vs_currencies=usd&include_24hr_change=true';
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 429) {
          logger.warn('PriceAggregator', 'CoinGecko rate limited (429)');
        } else {
          logger.error('PriceAggregator', `CoinGecko HTTP error: ${res.status}`);
        }
        return;
      }
      const data = await res.json();
      const snapshots: PriceSnapshot[] = [];
      const timestamp = new Date();

      const mapping: Record<string, string> = {
        solana: 'SOL/USD',
        bitcoin: 'BTC/USD',
        ethereum: 'ETH/USD',
        'jupiter-exchange-solana': 'JUP/USD'
      };

      for (const [cgId, token] of Object.entries(mapping)) {
        if (data[cgId] && data[cgId].usd != null) {
          const snap: PriceSnapshot = {
            id: Math.random().toString(36).substring(7),
            token,
            price: data[cgId].usd,
            source: 'CoinGecko',
            timestamp
          };
          this.storeSnapshot(snap);
          snapshots.push(snap);
        }
      }

      if (snapshots.length > 0) {
        logger.info('PriceAggregator', `Fetched ${snapshots.length} prices from CoinGecko`);
        this.emit('priceUpdate', snapshots);
      }
    } catch (e: any) {
      logger.error('PriceAggregator', `CoinGecko fetch failed: ${e.message}`);
    }
  }

  private async fetchJupiter() {
    try {
      const url = 'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112,JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
      const res = await fetch(url);
      if (!res.ok) {
        logger.error('PriceAggregator', `Jupiter HTTP error: ${res.status}`);
        return;
      }
      const data = await res.json();
      const snapshots: PriceSnapshot[] = [];
      const timestamp = new Date();

      const mapping: Record<string, string> = {
        'So11111111111111111111111111111111111111112': 'SOL/USD',
        'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP/USD'
      };

      if (data.data) {
        for (const [mint, token] of Object.entries(mapping)) {
          if (data.data[mint] && data.data[mint].price != null) {
            const snap: PriceSnapshot = {
              id: Math.random().toString(36).substring(7),
              token,
              price: parseFloat(data.data[mint].price),
              source: 'Jupiter',
              timestamp
            };
            this.storeSnapshot(snap);
            snapshots.push(snap);
          }
        }
      }

      if (snapshots.length > 0) {
        logger.info('PriceAggregator', `Fetched ${snapshots.length} prices from Jupiter`);
        this.emit('priceUpdate', snapshots);
      }
    } catch (e: any) {
      logger.error('PriceAggregator', `Jupiter fetch failed: ${e.message}`);
    }
  }

  private async fetchPyth() {
    try {
      const url = 'https://hermes.pyth.network/v2/updates/price/latest?ids[]=0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d&ids[]=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43&ids[]=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';
      const res = await fetch(url);
      if (!res.ok) {
        logger.error('PriceAggregator', `Pyth HTTP error: ${res.status}`);
        return;
      }
      const data = await res.json();
      const snapshots: PriceSnapshot[] = [];
      const timestamp = new Date();

      const mapping: Record<string, string> = {
        '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d': 'SOL/USD',
        '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43': 'BTC/USD',
        '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace': 'ETH/USD'
      };

      if (data.parsed) {
        for (const item of data.parsed) {
          const hexId = '0x' + item.id;
          const token = mapping[hexId];
          if (token && item.price) {
            const priceNum = parseFloat(item.price.price) * Math.pow(10, item.price.expo);
            const snap: PriceSnapshot = {
              id: Math.random().toString(36).substring(7),
              token,
              price: priceNum,
              source: 'Pyth',
              timestamp
            };
            this.storeSnapshot(snap);
            snapshots.push(snap);
          }
        }
      }

      if (snapshots.length > 0) {
        logger.info('PriceAggregator', `Fetched ${snapshots.length} prices from Pyth`);
        this.emit('priceUpdate', snapshots);
      }
    } catch (e: any) {
      logger.error('PriceAggregator', `Pyth fetch failed: ${e.message}`);
    }
  }

  getLatestPrices(): PriceSnapshot[] {
    const latest: PriceSnapshot[] = [];
    for (const history of this.history.values()) {
      if (history.length > 0) {
        latest.push(history[history.length - 1]);
      }
    }
    return latest;
  }

  getPriceHistory(token: string): PriceSnapshot[] {
    return this.history.get(token) || [];
  }
}