export const config = {
  rpcEndpoint: import.meta.env.VITE_RPC_URL || 'https://api.mainnet-beta.solana.com',
  wsUrl: import.meta.env.VITE_WS_URL || '',
  coingeckoUrl: 'https://api.coingecko.com/api/v3',
  jupiterPriceUrl: 'https://api.jup.ag/price/v2',
};
