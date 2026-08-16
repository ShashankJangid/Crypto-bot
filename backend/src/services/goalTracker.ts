import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { GoalProgress } from '../types/index.js';

export class GoalTracker extends EventEmitter {
  private cumulativePnl: number = 0;
  private goalUsd: number;

  constructor(goalUsd: number) {
    super();
    this.goalUsd = goalUsd;
  }

  recordTrade(profit: number) {
    this.cumulativePnl += profit;
    logger.info('GoalTracker', `Trade recorded. Profit: ${profit}. Cumulative PnL: ${this.cumulativePnl}`);
    if (this.cumulativePnl >= this.goalUsd) {
      this.emit('goalReached', this.getProgress());
    }
  }

  getProgress(): GoalProgress {
    return {
      currentPnl: this.cumulativePnl,
      targetPnl: this.goalUsd,
      percentage: Math.min((this.cumulativePnl / this.goalUsd) * 100, 100),
      isReached: this.cumulativePnl >= this.goalUsd
    };
  }

  reset(newGoal?: number) {
    this.cumulativePnl = 0;
    if (newGoal) {
      this.goalUsd = newGoal;
    }
    logger.info('GoalTracker', `Tracker reset. New Goal: ${this.goalUsd}`);
  }
}