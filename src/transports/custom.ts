import type { Transport } from '../types.js';

export type CustomProvider = {
  request: (request: { method: string; params?: readonly unknown[] }) => Promise<unknown>;
};

export function custom(provider: CustomProvider): Transport {
  return {
    key: 'custom',
    name: 'Custom JSON-RPC',
    request: async <result = unknown>(
      request: { method: string; params?: readonly unknown[]; signal?: AbortSignal },
    ): Promise<result> => {
      return await provider.request({ method: request.method, params: request.params ?? [] }) as result;
    },
  };
}
