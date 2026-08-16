export const config = {
  // PublicNode has full CORS support and does not throw 403 Access Forbidden to web browsers
  rpcEndpoint: import.meta.env.VITE_RPC_URL || 'https://solana-rpc.publicnode.com',
  wsUrl: import.meta.env.VITE_WS_URL || '',
  coingeckoUrl: 'https://api.coingecko.com/api/v3',
  jupiterQuoteUrl: 'https://api.jup.ag/swap/v1/quote',
  jupiterSwapUrl: 'https://api.jup.ag/swap/v1/swap',
};
