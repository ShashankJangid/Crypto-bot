/**
 * Micro-Compounding Mathematical Engine
 * Implements Geometric Compounding: A = P * (1 + r)^n
 */

export interface CompoundingTier {
  tier: number;
  name: string;
  startBalance: number;
  targetBalance: number;
  recommendedTradeSize: number; // in SOL or %
  maxRiskPerTrade: number; // percentage
  strategy: string;
  completed: boolean;
}

export const COMPOUNDING_TIERS: CompoundingTier[] = [
  {
    tier: 1,
    name: 'Seed Sprout (Micro Scalping)',
    startBalance: 1,
    targetBalance: 10,
    recommendedTradeSize: 0.01,
    maxRiskPerTrade: 2,
    strategy: 'High-frequency DEX micro-arbitrage (0.5% - 1.5% spreads)',
    completed: false
  },
  {
    tier: 2,
    name: 'Momentum Accumulation',
    startBalance: 10,
    targetBalance: 100,
    recommendedTradeSize: 0.05,
    maxRiskPerTrade: 2.5,
    strategy: 'RSI Oversold Dip-Buying on SOL/JUP with 3-5% take-profit',
    completed: false
  },
  {
    tier: 3,
    name: 'Velocity Growth',
    startBalance: 100,
    targetBalance: 1000,
    recommendedTradeSize: 0.25,
    maxRiskPerTrade: 2.0,
    strategy: 'Multi-pair cross-DEX swing loops + trailing profit locks',
    completed: false
  },
  {
    tier: 4,
    name: 'Institutional Scaling',
    startBalance: 1000,
    targetBalance: 10000,
    recommendedTradeSize: 1.0,
    maxRiskPerTrade: 1.5,
    strategy: 'Automated liquidity provider rebalancing & MEV avoidance',
    completed: false
  },
  {
    tier: 5,
    name: 'Alpha Mastery',
    startBalance: 10000,
    targetBalance: 100000,
    recommendedTradeSize: 5.0,
    maxRiskPerTrade: 1.0,
    strategy: 'Multi-wallet synthetic delta-neutral arbitrage',
    completed: false
  },
  {
    tier: 6,
    name: 'Apex Tier ($1 Million Goal)',
    startBalance: 100000,
    targetBalance: 1000000,
    recommendedTradeSize: 20.0,
    maxRiskPerTrade: 0.8,
    strategy: 'Low-slippage algorithmic cross-chain settlement',
    completed: false
  }
];

/**
 * Calculate trades needed to reach target at a given win rate and average gain
 */
export function calculateCompoundingProjections(
  startCapital: number,
  targetCapital: number,
  avgGainPercent: number = 2.0
): { tradesNeeded: number; totalRounds: number; curve: { tradeNum: number; balance: number }[] } {
  const r = avgGainPercent / 100;
  let balance = Math.max(startCapital, 0.1);
  const target = Math.max(targetCapital, balance * 2);

  const curve: { tradeNum: number; balance: number }[] = [{ tradeNum: 0, balance }];
  let tradeNum = 0;

  while (balance < target && tradeNum < 1500) {
    tradeNum++;
    balance = +(balance * (1 + r)).toFixed(2);
    if (tradeNum % Math.max(1, Math.floor(tradeNum / 20)) === 0 || balance >= target) {
      curve.push({ tradeNum, balance });
    }
  }

  return {
    tradesNeeded: tradeNum,
    totalRounds: Math.ceil(tradeNum / 10),
    curve
  };
}
