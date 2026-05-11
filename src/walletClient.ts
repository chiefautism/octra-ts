import { publicActions } from './actions/public.js';
import { walletActions, type WalletActionsParameters } from './actions/wallet.js';
import { createClient, type CreateClientParameters } from './client.js';

export type CreateWalletClientParameters = CreateClientParameters & WalletActionsParameters;

export function createWalletClient(parameters: CreateWalletClientParameters) {
  const client = createClient(parameters);
  const walletClient = {
    ...client,
    ...publicActions(client),
    ...walletActions(client, { account: parameters.account, pvac: parameters.pvac }),
  };
  return {
    ...walletClient,
    extend: <extension>(extender: (client: typeof walletClient) => extension) => ({
      ...walletClient,
      ...extender(walletClient),
    }),
  };
}

export type WalletClient = ReturnType<typeof createWalletClient>;
