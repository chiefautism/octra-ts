import { OctraHttpError, OctraParseError, OctraRpcError } from '../errors.js';
import type { Transport } from '../types.js';

export type HttpTransportConfig = {
  batch?: boolean | {
    batchSize?: number;
    wait?: number;
  };
  fetch?: typeof fetch;
  headers?: HeadersInit;
  key?: string;
  name?: string;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
};

type JsonRpcPayload = {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: readonly unknown[];
};

export function http(url = 'http://46.101.86.250:8080/rpc', config: HttpTransportConfig = {}): Transport {
  const endpoint = normalizeRpcUrl(url);
  const fetchFn = config.fetch ?? globalThis.fetch;
  if (!fetchFn) throw new Error('No fetch implementation available');
  const batch = normalizeBatchOptions(config.batch);
  let id = 0;
  let queue: BatchItem[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function postJson(
    payload: JsonRpcPayload | JsonRpcPayload[],
    signal?: AbortSignal,
  ): Promise<unknown> {
    const body = JSON.stringify(payload);
    const retryCount = config.retryCount ?? 0;
    const retryDelay = config.retryDelay ?? 150;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const response = await fetchWithTimeout(fetchFn, endpoint, {
          body,
          headers: {
            'content-type': 'application/json',
            ...(config.headers ?? {}),
          },
          method: 'POST',
          signal,
        }, config.timeout ?? 30_000);
        const text = await response.text();
        if (!response.ok) throw new OctraHttpError(response.status, text);
        return parseJson(text);
      } catch (error) {
        lastError = error;
        if (error instanceof OctraParseError) throw error;
        if (signal?.aborted) throw error;
        if (attempt === retryCount) break;
        await sleep(retryDelay * 2 ** attempt);
      }
    }
    throw lastError;
  }

  async function sendSingle<result>(payload: JsonRpcPayload, signal?: AbortSignal): Promise<result> {
    return parseRpcMessage(await postJson(payload, signal)) as result;
  }

  async function sendBatch<result>(payloads: JsonRpcPayload[], signal?: AbortSignal): Promise<result[]> {
    const response = await postJson(payloads, signal);
    if (!Array.isArray(response)) throw new OctraRpcError('Batch response was not an array');
    const byId = new Map<number, unknown>();
    for (const message of response) {
      if (message && typeof message === 'object' && typeof (message as { id?: unknown }).id === 'number') {
        byId.set((message as { id: number }).id, message);
      }
    }
    return payloads.map((payload) => parseRpcMessage(byId.get(payload.id))) as result[];
  }

  function enqueue<result>(payload: JsonRpcPayload): Promise<result> {
    return new Promise((resolve, reject) => {
      queue.push({ payload, reject, resolve: resolve as (value: unknown) => void });
      if (queue.length >= batch.batchSize) {
        flushBatch();
        return;
      }
      timer ??= setTimeout(flushBatch, batch.wait);
    });
  }

  function flushBatch() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    const items = queue;
    queue = [];
    if (items.length === 0) return;
    sendBatch(items.map((item) => item.payload))
      .then((results) => {
        for (let index = 0; index < items.length; index++) items[index].resolve(results[index]);
      })
      .catch((error) => {
        for (const item of items) item.reject(error);
      });
  }

  return {
    key: config.key ?? 'http',
    name: config.name ?? 'HTTP JSON-RPC',
    request: async <result = unknown>(
      request: { method: string; params?: readonly unknown[]; signal?: AbortSignal },
    ): Promise<result> => {
      id += 1;
      const payload = {
        jsonrpc: '2.0',
        id,
        method: request.method,
        params: request.params ?? [],
      } satisfies JsonRpcPayload;
      if (batch.enabled && !request.signal) return enqueue<result>(payload);
      return sendSingle<result>(payload, request.signal);
    },
    requestBatch: async <result = unknown>(
      requests: readonly { method: string; params?: readonly unknown[]; signal?: AbortSignal }[],
    ): Promise<result[]> => {
      const payloads = requests.map((request) => {
        id += 1;
        return {
          jsonrpc: '2.0' as const,
          id,
          method: request.method,
          params: request.params ?? [],
        };
      });
      return sendBatch<result>(payloads, requests.find((request) => request.signal)?.signal);
    },
  };
}

type BatchOptions = {
  batchSize: number;
  enabled: boolean;
  wait: number;
};

type BatchItem = {
  payload: JsonRpcPayload;
  reject: (reason?: unknown) => void;
  resolve: (value: unknown) => void;
};

function normalizeRpcUrl(value: string): string {
  const url = new URL(value);
  if (url.pathname === '/' || url.pathname === '') url.pathname = '/rpc';
  return url.toString();
}

function normalizeBatchOptions(value: HttpTransportConfig['batch']): BatchOptions {
  if (!value) return { batchSize: 0, enabled: false, wait: 0 };
  if (value === true) return { batchSize: 1000, enabled: true, wait: 0 };
  return {
    batchSize: value.batchSize ?? 1000,
    enabled: true,
    wait: value.wait ?? 0,
  };
}

async function fetchWithTimeout(
  fetchFn: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Octra RPC request timed out')), timeout);
  const onAbort = () => controller.abort(init.signal?.reason);
  try {
    init.signal?.addEventListener('abort', onAbort, { once: true });
    return await fetchFn(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', onAbort);
  }
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new OctraParseError(body);
  }
}

function parseRpcMessage(message: unknown): unknown {
  if (!message || typeof message !== 'object') throw new OctraRpcError('Unknown RPC response');
  const response = message as { result?: unknown; error?: unknown };
  if ('result' in response) return response.result;
  if ('error' in response) {
    const error = response.error;
    if (error && typeof error === 'object') {
      const rpcError = error as { message?: unknown; code?: unknown; data?: unknown };
      throw new OctraRpcError(
        typeof rpcError.message === 'string' ? rpcError.message : 'Octra RPC error',
        {
          code: typeof rpcError.code === 'number' ? rpcError.code : undefined,
          data: rpcError.data,
        },
      );
    }
    throw new OctraRpcError(typeof error === 'string' ? error : JSON.stringify(error));
  }
  throw new OctraRpcError('Unknown RPC response');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
