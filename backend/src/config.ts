import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  pythEndpoint: process.env.PYTH_ENDPOINT || 'https://hermes.pyth.network',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/bot',
  arbThreshold: parseFloat(process.env.ARB_THRESHOLD || '0.5'),
  goalUsd: parseFloat(process.env.GOAL_USD || '10000'),
  maxTradeSizeSol: parseFloat(process.env.MAX_TRADE_SIZE_SOL || '1.0'),
  stopLossPct: parseFloat(process.env.STOP_LOSS_PCT || '2.0'),
  swingBuyDipPct: parseFloat(process.env.SWING_BUY_DIP_PCT || '3.0'),
  swingSellRisePct: parseFloat(process.env.SWING_SELL_RISE_PCT || '5.0'),
};