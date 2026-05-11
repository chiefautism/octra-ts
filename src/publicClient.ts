import { publicActions } from './actions/public.js';
import { createClient, type CreateClientParameters } from './client.js';

export function createPublicClient(parameters: CreateClientParameters) {
  const client = createClient(parameters);
  const publicClient = {
    ...client,
    ...publicActions(client),
  };
  return {
    ...publicClient,
    extend: <extension>(extender: (client: typeof publicClient) => extension) => ({
      ...publicClient,
      ...extender(publicClient),
    }),
  };
}

export type PublicClient = ReturnType<typeof createPublicClient>;
