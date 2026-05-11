import { OctraRpcError } from '../errors.js';
import type { Transport } from '../types.js';

type TransportRequest = Parameters<Transport['request']>[0];
type TransportBatchRequest = NonNullable<Transport['requestBatch']> extends (
  requests: infer requests,
) => Promise<unknown> ? requests : never;

export type FallbackTransportConfig = {
  key?: string;
  name?: string;
  retryCount?: number;
  shouldThrowRpcError?: boolean;
};

export function fallback(
  transports: readonly Transport[],
  config: FallbackTransportConfig = {},
): Transport {
  if (transports.length === 0) throw new Error('fallback transport requires at least one transport');
  const retryCount = config.retryCount ?? transports.length - 1;

  return {
    key: config.key ?? 'fallback',
    name: config.name ?? 'Fallback JSON-RPC',
    request: async <result = unknown>(request: TransportRequest) => {
      return attemptTransports<result>(
        transports,
        retryCount,
        (transport) => transport.request<result>(request),
        config.shouldThrowRpcError ?? true,
      );
    },
    requestBatch: async <result = unknown>(requests: TransportBatchRequest) => {
      return attemptTransports<result[]>(
        transports,
        retryCount,
        (transport) => {
          if (transport.requestBatch) return transport.requestBatch<result>(requests);
          return Promise.all(requests.map((request) => transport.request<result>(request)));
        },
        config.shouldThrowRpcError ?? true,
      );
    },
  };
}

async function attemptTransports<result>(
  transports: readonly Transport[],
  retryCount: number,
  run: (transport: Transport) => Promise<result>,
  throwRpcError: boolean,
): Promise<result> {
  const errors: unknown[] = [];
  const attempts = Math.min(transports.length, retryCount + 1);

  for (let index = 0; index < attempts; index++) {
    try {
      return await run(transports[index]);
    } catch (error) {
      errors.push(error);
      if (throwRpcError && error instanceof OctraRpcError) throw error;
    }
  }

  throw new AggregateError(errors, 'All fallback transports failed');
}
