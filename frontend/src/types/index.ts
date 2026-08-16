export interface PriceSnapshot {
  token: string;
  price: number;
  timestamp: number;
  change24h?: number;
  source?: string;
  id?: string;
}

export interface PriceData {
  price: number;
  change24h: number;
  source: string;
  history: { time: string; price: number }[];
}

export interface TradeRecord {
  id: string;
  timestamp: number;
  pair: string;
  side: 'Buy' | 'Sell';
  amount: number;
  price: number;
  profit: number;
  status: 'Success' | 'Failed' | 'Pending';
  engine: 'Arbitrage' | 'Swing';
}

export interface ArbOpportunity {
  id: string;
  pair: string;
  dexA: string;
  dexB: string;
  priceA: number;
  priceB: number;
  spreadPct: number;
  potentialProfit: number;
}

export interface BotSettings {
  arbEnabled: boolean;
  swingEnabled: boolean;
  arbThreshold: number;
  profitTarget: number;
  stopLoss: number;
  goalUsd: number;
  maxTradeSize: number;
}

export interface BotStatus {
  state: 'idle' | 'running' | 'paused';
  uptime: number;
  tradesExecuted: number;
  currentPnl: number;
  goalProgress: number;
}

export type WsMessage =
  | { type: 'price_update'; data: PriceSnapshot[] }
  | { type: 'trade_executed'; data: TradeRecord }
  | { type: 'arb_opportunity'; data: ArbOpportunity[] }
  | { type: 'bot_status'; data: BotStatus }
  | { type: 'goal_progress'; data: number };
