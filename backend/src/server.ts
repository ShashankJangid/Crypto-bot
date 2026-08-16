import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { PriceAggregator } from './services/priceAggregator.js';
import { ArbitrageEngine } from './services/arbitrageEngine.js';
import { SwingTradeEngine } from './services/swingTradeEngine.js';
import { TradeExecutor } from './services/tradeExecutor.js';
import { RiskManager } from './services/riskManager.js';
import { GoalTracker } from './services/goalTracker.js';
import { AutonomousExecutor } from './services/autonomousExecutor.js';
import { BotStatus, WsIncomingMessage, WsOutgoingMessage } from './types/index.js';

const server = Fastify();

server.register(cors, { origin: true });
server.register(websocket);

// Services
const priceAggregator = new PriceAggregator();
const arbEngine = new ArbitrageEngine();
const swingEngine = new SwingTradeEngine();
const tradeExecutor = new TradeExecutor();
const riskManager = new RiskManager();
const goalTracker = new GoalTracker(config.goalUsd);
const autonomousExecutor = new AutonomousExecutor('https://solana-rpc.publicnode.com');

let botStatus: BotStatus = {
  isActive: false,
  uptime: 0,
  totalPnl: 0,
  tradesCount: 0,
  goalUsd: config.goalUsd
};

let startTime: number | null = null;

// REST API
server.get('/api/health', async () => ({ status: 'ok', time: new Date() }));

server.get('/api/prices', async () => {
  return { prices: priceAggregator.getLatestPrices() };
});

server.get('/api/trades', async (request: any) => {
  const page = parseInt(request.query.page || '1');
  const limit = parseInt(request.query.limit || '10');
  const trades = tradeExecutor.getTradeHistory();
  return {
    trades: trades.slice((page - 1) * limit, page * limit),
    total: trades.length
  };
});

server.get('/api/status', async () => {
  if (startTime) {
    botStatus.uptime = Math.floor((Date.now() - startTime) / 1000);
  }
  return botStatus;
});

// 24/7 Autonomous Bot Endpoints
server.get('/api/bot/autonomous/status', async () => {
  const balance = await autonomousExecutor.getBalance();
  const status = autonomousExecutor.getStatus();
  return {
    ...status,
    balanceSol: balance.sol,
    balanceLamports: balance.lamports
  };
});

server.post('/api/bot/autonomous/start', async (request: any) => {
  const tradeSize = request.body?.tradeSizeSol || 0.01;
  autonomousExecutor.start24x7(tradeSize);
  return { success: true, message: '24/7 Background Trading Bot Active' };
});

server.post('/api/bot/autonomous/stop', async () => {
  autonomousExecutor.stop24x7();
  return { success: true, message: '24/7 Background Trading Bot Paused' };
});

server.post('/api/bot/autonomous/withdraw', async (request: any) => {
  const { destinationAddress, amountSol } = request.body || {};
  if (!destinationAddress) return { error: 'Destination address required' };
  const res = await autonomousExecutor.withdrawToWallet(destinationAddress, amountSol);
  return res;
});

// Legacy start/stop
server.post('/api/bot/start', async (request: any) => {
  if (botStatus.isActive) return { error: 'Bot already running' };
  if (request.body) Object.assign(config, request.body);

  arbEngine.start();
  swingEngine.start();
  botStatus.isActive = true;
  startTime = Date.now();
  return { success: true, status: botStatus };
});

server.post('/api/bot/stop', async () => {
  if (!botStatus.isActive) return { error: 'Bot not running' };
  arbEngine.stop();
  swingEngine.stop();
  botStatus.isActive = false;
  startTime = null;
  return { success: true, status: botStatus };
});

// WebSocket
server.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    logger.info('WS', 'Client connected');

    const sendMsg = (msg: WsOutgoingMessage) => {
      connection.socket.send(JSON.stringify(msg));
    };

    sendMsg({
      type: 'initial_state',
      data: {
        prices: priceAggregator.getLatestPrices(),
        status: botStatus
      }
    });

    connection.socket.on('message', (message: string) => {
      try {
        const msg = JSON.parse(message.toString()) as WsIncomingMessage;
        logger.info('WS', `Received message: ${msg.type}`);
      } catch (e) {
        logger.error('WS', 'Failed to parse message');
      }
    });
  });
});

// Event wiring
priceAggregator.on('priceUpdate', (prices) => {
  broadcast({ type: 'price_update', data: prices });
  for (const p of prices) {
    arbEngine.processPrice(p);
    swingEngine.processPrice(p);
  }
});

arbEngine.on('arbOpportunity', (opp) => {
  broadcast({ type: 'arb_opportunity', data: opp });
});

goalTracker.on('goalReached', (progress) => {
  broadcast({ type: 'goal_progress', data: progress });
  logger.info('Server', 'Goal Reached!');
  arbEngine.stop();
  swingEngine.stop();
  botStatus.isActive = false;
});

function broadcast(msg: WsOutgoingMessage) {
  for (const client of server.websocketServer?.clients || []) {
    if (client.readyState === 1) {
      client.send(JSON.stringify(msg));
    }
  }
}

const startServer = async () => {
  try {
    await server.listen({ port: config.port, host: '0.0.0.0' });
    logger.info('Server', `Listening on port ${config.port}`);

    // Always stream real prices
    priceAggregator.start();
    logger.info('Server', 'Price aggregator started (always-on)');
  } catch (err) {
    logger.error('Server', 'Startup error', err);
    process.exit(1);
  }
};

startServer();