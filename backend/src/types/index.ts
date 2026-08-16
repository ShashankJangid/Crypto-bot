export interface PriceSnapshot {
  id: string;
  token: string;
  price: number;
  source: string;
  timestamp: Date;
}

export interface TradeRecord {
  id: string;
  userId: string;
  timestamp: Date;
  pair: string;
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  profit: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  engine: 'ARBITRAGE' | 'SWING';
  txSignature?: string;
}

export interface ArbOpportunity {
  id: string;
  token: string;
  buyPrice: number;
  sellPrice: number;
  spreadPct: number;
  buySource: string;
  sellSource: string;
  timestamp: Date;
}

export interface BotSettings {
  arbThreshold: number;
  goalUsd: number;
  maxTradeSizeSol: number;
  stopLossPct: number;
  swingBuyDipPct: number;
  swingSellRisePct: number;
}

export interface BotStatus {
  isActive: boolean;
  uptime: number;
  totalPnl: number;
  tradesCount: number;
  goalUsd: number;
}

export interface TradeSignal {
  type: 'BUY' | 'SELL';
  token: string;
  price: number;
  amount: number;
  timestamp: Date;
}

export interface RiskCheckResult {
  approved: boolean;
  reason?: string;
}

export interface GoalProgress {
  currentPnl: number;
  targetPnl: number;
  percentage: number;
  isReached: boolean;
}

export type WsIncomingMessage = 
  | { type: 'start_bot'; payload: BotSettings }
  | { type: 'stop_bot' }
  | { type: 'update_settings'; payload: Partial<BotSettings> }
  | { type: 'execute_arb'; payload: { opportunityId: string } };

export type WsOutgoingMessage = 
  | { type: 'price_update'; data: PriceSnapshot[] }
  | { type: 'arb_opportunity'; data: ArbOpportunity }
  | { type: 'trade_executed'; data: TradeRecord }
  | { type: 'bot_status'; data: BotStatus }
  | { type: 'goal_progress'; data: GoalProgress }
  | { type: 'initial_state'; data: { prices: PriceSnapshot[], status: BotStatus } };

export enum SwingTradeState {
  WATCHING = 'WATCHING',
  BUYING = 'BUYING',
  HOLDING = 'HOLDING',
  SELLING = 'SELLING'
}