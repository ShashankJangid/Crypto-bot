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
import { BotStatus, WsIncomingMessage, WsOutgoingMessage } from './types/index.js';

const server = Fastify();

server.register(cors);
server.register(websocket);

// Services
const priceAggregator = new PriceAggregator();
const arbEngine = new ArbitrageEngine();
const swingEngine = new SwingTradeEngine();
const tradeExecutor = new TradeExecutor();
const riskManager = new RiskManager();
const goalTracker = new GoalTracker(config.goalUsd);

let botStatus: BotStatus = {
  isActive: false,
  uptime: 0,
  totalPnl: 0,
  tradesCount: 0,
  goalUsd: config.goalUsd
};

let startTime: number | null = null;

// REST API
server.get('/api/health', async () => ({ status: 'ok' }));

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

server.post('/api/bot/start', async (request: any) => {
  if (botStatus.isActive) return { error: 'Bot already running' };
  
  if (request.body) {
    Object.assign(config, request.body);
  }

  priceAggregator.start();
  arbEngine.start();
  swingEngine.start();
  
  botStatus.isActive = true;
  startTime = Date.now();
  logger.info('Server', 'Bot started');
  
  return { success: true, status: botStatus };
});

server.post('/api/bot/stop', async () => {
  if (!botStatus.isActive) return { error: 'Bot not running' };
  
  priceAggregator.stop();
  arbEngine.stop();
  swingEngine.stop();
  
  botStatus.isActive = false;
  startTime = null;
  logger.info('Server', 'Bot stopped');
  
  return { success: true, status: botStatus };
});

server.post('/api/settings', async (request: any) => {
  if (request.body) {
    Object.assign(config, request.body);
    logger.info('Server', 'Settings updated');
    return { success: true, config };
  }
  return { error: 'No settings provided' };
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
        // Handle incoming commands
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
  priceAggregator.stop();
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

    // Always stream real prices so the UI shows live data
    priceAggregator.start();
    logger.info('Server', 'Price aggregator started (always-on)');
  } catch (err) {
    logger.error('Server', 'Startup error', err);
    process.exit(1);
  }
};

startServer();