import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { ArbOpportunity, PriceSnapshot } from '../types/index.js';
import { config } from '../config.js';

export class ArbitrageEngine extends EventEmitter {
  private isRunning: boolean = false;
  private opportunities: Map<string, ArbOpportunity> = new Map();
  // Map of token -> (source -> latest price)
  private latestPrices: Map<string, Map<string, number>> = new Map();

  constructor() {
    super();
  }

  start() {
    this.isRunning = true;
    logger.info('ArbitrageEngine', 'Started');
  }

  stop() {
    this.isRunning = false;
    logger.info('ArbitrageEngine', 'Stopped');
  }

  processPrice(snapshot: PriceSnapshot) {
    if (!this.isRunning) return;

    if (!this.latestPrices.has(snapshot.token)) {
      this.latestPrices.set(snapshot.token, new Map());
    }
    const tokenPrices = this.latestPrices.get(snapshot.token)!;
    tokenPrices.set(snapshot.source, snapshot.price);

    // Compare prices across all known sources for this token
    const sources = Array.from(tokenPrices.entries());
    if (sources.length < 2) return;

    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const [source1, price1] = sources[i];
        const [source2, price2] = sources[j];

        const buyPrice = Math.min(price1, price2);
        const sellPrice = Math.max(price1, price2);
        
        if (buyPrice === 0) continue;
        
        const spreadPct = ((sellPrice - buyPrice) / buyPrice) * 100;

        if (spreadPct > config.arbThreshold) {
          const buySource = buyPrice === price1 ? source1 : source2;
          const sellSource = sellPrice === price1 ? source1 : source2;
          const id = Math.random().toString(36).substring(7);
          
          const opportunity: ArbOpportunity = {
            id,
            token: snapshot.token,
            buyPrice,
            sellPrice,
            spreadPct,
            buySource,
            sellSource,
            timestamp: new Date()
          };
          
          this.opportunities.set(id, opportunity);
          logger.info('ArbitrageEngine', `Found Opportunity: ${spreadPct.toFixed(2)}% spread on ${snapshot.token} between ${buySource} and ${sellSource}`);
          this.emit('arbOpportunity', opportunity);
        }
      }
    }
  }

  getOpportunities(): ArbOpportunity[] {
    return Array.from(this.opportunities.values());
  }

  evaluateOpportunity(id: string): ArbOpportunity | undefined {
    return this.opportunities.get(id);
  }
}