import type { Chain } from './types.js';

export const octraPreMainnet = {
  id: 'octra-pre-mainnet',
  name: 'Octra Pre-Mainnet',
  rpcUrls: {
    default: {
      http: ['http://46.101.86.250:8080/rpc'],
    },
  },
} as const satisfies Chain;
