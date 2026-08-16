# Solana Arbitrage & Auto-Trading Bot

A full-stack application for automated cryptocurrency trading on the Solana blockchain.

## Features

- 🔗 **Wallet Connection** – Connect Phantom, Backpack, Solflare or any Solana wallet
- 📊 **Real-Time Price Charts** – Live token prices from Pyth Network & Jupiter
- 🤖 **Arbitrage Engine** – Detects cross-DEX price gaps and executes atomic arbitrage
- 📈 **Swing Trading** – Buy low / sell high cycles with configurable thresholds
- 🎯 **Goal Tracking** – Set a profit target; bot stops when the goal is reached
- 🛡️ **Risk Management** – Slippage caps, max exposure, stop-loss, circuit breaker
- 📋 **Trade Log** – Full history of every trade with P&L breakdown

## Architecture

```
crypto-bot/
├── frontend/    # React + Vite + TailwindCSS
├── backend/     # Node.js + Fastify + WebSocket
├── docker-compose.yml
└── README.md
```

## Quick Start

- **Live Production App**: [https://solanabot.vercel.app](https://solanabot.vercel.app)
- **Local Frontend**: http://localhost:5173
- **Local Backend**: http://localhost:3001
- **WebSocket**: ws://localhost:3001/ws

## Environment Variables

Create `backend/.env`:

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PYTH_ENDPOINT=https://hermes.pyth.network
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cryptobot
ARB_THRESHOLD=0.5
GOAL_USD=10000
MAX_TRADE_SIZE_SOL=1.0
STOP_LOSS_PCT=2.0
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TypeScript, TailwindCSS, Chart.js |
| Backend | Node.js, Fastify, TypeScript, WebSocket |
| Blockchain | Solana, @solana/web3.js, Jupiter Aggregator |
| Price Feeds | Pyth Network, Jupiter |
| Database | PostgreSQL, Prisma ORM |
| DevOps | Docker Compose |

## ⚠️ Disclaimer

This software is for **educational purposes only**. Automated trading carries significant financial risk. Never trade with funds you cannot afford to lose. No guarantee of profit is made or implied.

## License

MIT
