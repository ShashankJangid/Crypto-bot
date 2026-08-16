import { EventEmitter } from 'events';
import { SwingTradeState, PriceSnapshot, TradeSignal } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export class SwingTradeEngine extends EventEmitter {
  private state: SwingTradeState = SwingTradeState.WATCHING;
  private recentHigh: number = 0;
  private entryPrice: number = 0;
  private isRunning: boolean = false;

  constructor() {
    super();
  }

  start() {
    this.isRunning = true;
    logger.info('SwingTradeEngine', 'Started');
  }

  stop() {
    this.isRunning = false;
    logger.info('SwingTradeEngine', 'Stopped');
  }

  getState() {
    return this.state;
  }

  getCurrentPosition() {
    return {
      state: this.state,
      entryPrice: this.entryPrice,
      recentHigh: this.recentHigh
    };
  }

  processPrice(price: PriceSnapshot) {
    if (!this.isRunning) return;

    const currentPrice = price.price;

    if (this.state === SwingTradeState.WATCHING) {
      if (currentPrice > this.recentHigh) {
        this.recentHigh = currentPrice;
      }
      
      const dropPct = ((this.recentHigh - currentPrice) / this.recentHigh) * 100;
      if (dropPct >= config.swingBuyDipPct) {
        logger.info('SwingTradeEngine', `Dip detected (${dropPct.toFixed(2)}%), switching to BUYING`);
        this.state = SwingTradeState.BUYING;
        
        const signal: TradeSignal = {
          type: 'BUY',
          token: price.token,
          price: currentPrice,
          amount: config.maxTradeSizeSol,
          timestamp: new Date()
        };
        this.emit('tradeSignal', signal);
        
        this.entryPrice = currentPrice;
        this.state = SwingTradeState.HOLDING;
      }
    } else if (this.state === SwingTradeState.HOLDING) {
      const risePct = ((currentPrice - this.entryPrice) / this.entryPrice) * 100;
      if (risePct >= config.swingSellRisePct) {
        logger.info('SwingTradeEngine', `Rise detected (${risePct.toFixed(2)}%), switching to SELLING`);
        this.state = SwingTradeState.SELLING;
        
        const signal: TradeSignal = {
          type: 'SELL',
          token: price.token,
          price: currentPrice,
          amount: config.maxTradeSizeSol,
          timestamp: new Date()
        };
        this.emit('tradeSignal', signal);
        
        this.recentHigh = currentPrice;
        this.state = SwingTradeState.WATCHING;
      }
    }
  }
}