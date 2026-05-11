import { describe, expect, test } from 'bun:test';
import { custom, fallback, http, OctraHttpError, OctraParseError, OctraRpcError } from '../src/index.js';

describe('transports', () => {
  test('custom transport passes method and default params to provider', async () => {
    const calls: unknown[] = [];
    const transport = custom({
      request: async (request) => {
        calls.push(request);
        return 'ok';
      },
    });

    expect(await transport.request({ method: 'node_version' })).toBe('ok');
    expect(calls).toEqual([{ method: 'node_version', params: [] }]);
  });

  test('http transport normalizes root URLs, sends JSON-RPC, headers, and parses result', async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { ok: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    const transport = http('http://example.test', {
      fetch: fetch as typeof globalThis.fetch,
      headers: { authorization: 'Bearer test' },
    });

    await expect(transport.request({ method: 'node_status', params: [] })).resolves.toEqual({ ok: true });

    expect(String(calls[0].input)).toBe('http://example.test/rpc');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.headers).toMatchObject({
      'content-type': 'application/json',
      authorization: 'Bearer test',
    });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'node_status',
      params: [],
    });
  });

  test('http transport preserves non-root paths', async () => {
    const urls: string[] = [];
    const transport = http('http://example.test/custom-rpc', {
      fetch: (async (input: RequestInfo | URL) => {
        urls.push(String(input));
        return new Response(JSON.stringify({ result: true }), { status: 200 });
      }) as typeof globalThis.fetch,
    });

    await transport.request({ method: 'node_version' });
    expect(urls).toEqual(['http://example.test/custom-rpc']);
  });

  test('http transport increments ids and supports JSON-RPC batch requests', async () => {
    const bodies: unknown[] = [];
    const transport = http('http://example.test/rpc', {
      fetch: (async (_input: RequestInfo | URL, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify([
          { jsonrpc: '2.0', id: 1, result: 'a' },
          { jsonrpc: '2.0', id: 2, result: 'b' },
        ]), { status: 200 });
      }) as typeof globalThis.fetch,
    });

    await expect(transport.requestBatch?.([
      { method: 'node_version', params: [] },
      { method: 'node_status', params: [] },
    ])).resolves.toEqual(['a', 'b']);

    expect(bodies[0]).toEqual([
      { jsonrpc: '2.0', id: 1, method: 'node_version', params: [] },
      { jsonrpc: '2.0', id: 2, method: 'node_status', params: [] },
    ]);
  });

  test('http transport auto-batches concurrent requests when enabled', async () => {
    const bodies: unknown[] = [];
    const transport = http('http://example.test/rpc', {
      batch: { wait: 0 },
      fetch: (async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        bodies.push(body);
        expect(Array.isArray(body)).toBe(true);
        return new Response(JSON.stringify([
          { jsonrpc: '2.0', id: body[0].id, result: 'version' },
          { jsonrpc: '2.0', id: body[1].id, result: 'status' },
        ]), { status: 200 });
      }) as typeof globalThis.fetch,
    });

    await expect(Promise.all([
      transport.request({ method: 'node_version', params: [] }),
      transport.request({ method: 'node_status', params: [] }),
    ])).resolves.toEqual(['version', 'status']);

    expect(bodies).toHaveLength(1);
  });

  test('http transport throws OctraRpcError with code and data', async () => {
    const transport = http('http://example.test/rpc', {
      fetch: (async () => new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32602, message: 'invalid params', data: { field: 'address' } },
      }), { status: 200 })) as typeof globalThis.fetch,
    });

    try {
      await transport.request({ method: 'octra_balance', params: ['bad'] });
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(OctraRpcError);
      expect((error as OctraRpcError).message).toBe('invalid params');
      expect((error as OctraRpcError).code).toBe(-32602);
      expect((error as OctraRpcError).data).toEqual({ field: 'address' });
    }
  });

  test('http transport throws parse and HTTP errors', async () => {
    const invalidJson = http('http://example.test/rpc', {
      fetch: (async () => new Response('not json', { status: 200 })) as typeof globalThis.fetch,
    });
    await expect(invalidJson.request({ method: 'node_version' })).rejects.toBeInstanceOf(OctraParseError);

    const httpError = http('http://example.test/rpc', {
      fetch: (async () => new Response('server down', { status: 503 })) as typeof globalThis.fetch,
    });
    await expect(httpError.request({ method: 'node_version' })).rejects.toBeInstanceOf(OctraHttpError);
  });

  test('http transport retries transient transport failures', async () => {
    let attempts = 0;
    const transport = http('http://example.test/rpc', {
      retryCount: 1,
      retryDelay: 0,
      fetch: (async () => {
        attempts++;
        if (attempts === 1) throw new Error('network down');
        return new Response(JSON.stringify({ result: 'ok' }), { status: 200 });
      }) as typeof globalThis.fetch,
    });

    await expect(transport.request({ method: 'node_version' })).resolves.toBe('ok');
    expect(attempts).toBe(2);
  });

  test('http transport does not retry caller-aborted requests', async () => {
    let attempts = 0;
    const controller = new AbortController();
    const transport = http('http://example.test/rpc', {
      retryCount: 2,
      retryDelay: 0,
      fetch: (async (_input: RequestInfo | URL, init?: RequestInit) => {
        attempts++;
        controller.abort(new Error('caller aborted'));
        throw init?.signal?.reason;
      }) as typeof globalThis.fetch,
    });

    await expect(transport.request({
      method: 'node_version',
      signal: controller.signal,
    })).rejects.toThrow('caller aborted');
    expect(attempts).toBe(1);
  });

  test('http transport does not retry JSON-RPC errors', async () => {
    let attempts = 0;
    const transport = http('http://example.test/rpc', {
      retryCount: 2,
      retryDelay: 0,
      fetch: (async () => {
        attempts++;
        return new Response(JSON.stringify({ error: { message: 'rpc nope' } }), { status: 200 });
      }) as typeof globalThis.fetch,
    });

    await expect(transport.request({ method: 'node_version' })).rejects.toBeInstanceOf(OctraRpcError);
    expect(attempts).toBe(1);
  });

  test('fallback transport uses the next transport after non-RPC failures', async () => {
    const calls: string[] = [];
    const transport = fallback([
      custom({
        key: 'first',
        request: async () => {
          calls.push('first');
          throw new Error('offline');
        },
      }),
      custom({
        key: 'second',
        request: async (request) => {
          calls.push(`second:${request.method}`);
          return 'ok';
        },
      }),
    ]);

    await expect(transport.request({ method: 'node_version' })).resolves.toBe('ok');
    expect(calls).toEqual(['first', 'second:node_version']);
  });

  test('fallback transport keeps JSON-RPC errors terminal by default', async () => {
    const transport = fallback([
      custom({
        request: async () => {
          throw new OctraRpcError('bad params');
        },
      }),
      custom({ request: async () => 'ok' }),
    ]);

    await expect(transport.request({ method: 'octra_balance', params: ['bad'] })).rejects.toBeInstanceOf(OctraRpcError);
  });

  test('fallback transport can fall through JSON-RPC errors when configured', async () => {
    const transport = fallback([
      custom({
        request: async () => {
          throw new OctraRpcError('bad params');
        },
      }),
      custom({ request: async () => 'ok' }),
    ], { shouldThrowRpcError: false });

    await expect(transport.request({ method: 'octra_balance', params: ['bad'] })).resolves.toBe('ok');
  });
});
