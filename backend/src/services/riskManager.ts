import { RiskCheckResult } from '../types/index.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export class RiskManager {
  private currentExposure: number = 0;
  private maxExposureUSD: number = 5000;
  private sessionActive: boolean = true;
  private recentLosses: number = 0;

  constructor() {}

  validateTrade(params: {
    amount: number;
    price: number;
    slippagePct: number;
    type: 'BUY' | 'SELL'
  }): RiskCheckResult {
    if (!this.sessionActive) {
      return { approved: false, reason: 'Bot session is not active' };
    }

    if (params.slippagePct > 1.0) {
      return { approved: false, reason: `Slippage too high: ${params.slippagePct}%` };
    }

    const tradeValue = params.amount * params.price;
    if (params.type === 'BUY' && this.currentExposure + tradeValue > this.maxExposureUSD) {
      return { approved: false, reason: 'Max exposure exceeded' };
    }

    if (this.recentLosses > (this.maxExposureUSD * config.stopLossPct / 100)) {
      return { approved: false, reason: 'Circuit breaker triggered due to recent losses' };
    }

    logger.info('RiskManager', `Trade approved: ${params.type} ${params.amount} @ ${params.price}`);
    return { approved: true };
  }

  recordLoss(lossAmt: number) {
    this.recentLosses += lossAmt;
  }
  
  setSessionActive(active: boolean) {
    this.sessionActive = active;
  }
}