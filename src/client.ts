import type { Chain, Client, RpcMethod, RpcParameters, RpcResult, Transport } from './types.js';

export type CreateClientParameters = {
  chain?: Chain;
  transport: Transport;
};

export function createClient(parameters: CreateClientParameters): Client {
  const { chain, transport } = parameters;
  const client: Client = {
    chain,
    transport,
    request: async <method extends RpcMethod>(request: {
      method: method;
      params?: RpcParameters<method>;
      signal?: AbortSignal;
    }): Promise<RpcResult<method>> => {
      return transport.request<RpcResult<method>>({
        method: request.method,
        params: request.params ?? [],
        signal: request.signal,
      });
    },
    extend: <extension>(extender: (client: Client) => extension) => {
      return {
        ...client,
        ...extender(client),
      };
    },
  };
  return client;
}
