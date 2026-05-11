import { describe, expect, test } from 'bun:test';
import {
  createPvacWasmBackend,
  createPvacWasmBackendFromContext,
  getPvacRegistrationMaterial,
  type PvacContext,
} from '../src/pvac/index.js';

describe('PVAC backend', () => {
  test('gets registration material from a backend', async () => {
    await expect(getPvacRegistrationMaterial({
      serializePubkey: () => new Uint8Array([1, 2, 3]),
      computeAesKat: () => 'aabbccdd',
    })).resolves.toEqual({
      pubkeyBlob: 'AQID',
      aesKat: 'aabbccdd',
    });
  });

  test('wraps a PvacContext-compatible WASM context', async () => {
    const calls: string[] = [];
    const context = {
      serializePubkey: () => new Uint8Array([7, 8, 9]),
      computeAesKat: () => 'kat',
      decrypt: (cipher: Uint8Array) => BigInt(cipher[0] ?? 0),
      encryptSeeded: () => {
        calls.push('encryptSeeded');
        return new Uint8Array([1]);
      },
      pedersenCommit: () => {
        calls.push('pedersenCommit');
        return { commitment: new Uint8Array([2]), blinding: new Uint8Array([3]) };
      },
      makeBoundProof: () => {
        calls.push('makeBoundProof');
        return { proof: new Uint8Array([4]), commitment: new Uint8Array([2]), blinding: new Uint8Array([3]) };
      },
      encodeCipher: () => 'hfhe_v1|cipher',
      encodeZeroProof: () => 'zkzp_v2|proof',
      ctSub: () => {
        calls.push('ctSub');
        return new Uint8Array([5]);
      },
      makeRangeProofParallel: () => {
        calls.push('makeRangeProofParallel');
        return new Uint8Array([6]);
      },
      encodeRangeProof: () => 'rp_v1|range',
      rayonThreadCount: () => 4,
      free: () => calls.push('free'),
    } as unknown as PvacContext;

    const backend = createPvacWasmBackendFromContext(context);
    const encrypt = await backend.buildEncryptPayload({ amount: 10n });
    const decrypt = await backend.buildDecryptPayload({
      amount: 5n,
      currentCipher: new Uint8Array([10]),
      currentBalance: 20n,
    });

    expect(backend.kind).toBe('@0xio/pvac-wasm');
    expect(backend.serializePubkeyBase64()).toBe('BwgJ');
    expect(backend.rayonThreadCount()).toBe(4);
    expect(await backend.computeAesKat()).toBe('kat');
    expect(await backend.decryptCipher(new Uint8Array([11]))).toBe(11n);
    expect(encrypt).toMatchObject({ opType: 'encrypt', amount: '10' });
    expect(JSON.parse(encrypt.encryptedData)).toMatchObject({
      cipher: 'hfhe_v1|cipher',
      zero_proof: 'zkzp_v2|proof',
    });
    expect(decrypt).toMatchObject({ opType: 'decrypt', amount: '5' });
    expect(JSON.parse(decrypt.encryptedData)).toMatchObject({
      cipher: 'hfhe_v1|cipher',
      range_proof_balance: 'rp_v1|range',
    });
    backend.free();
    expect(calls).toContain('free');
  });

  test('auto-detects all available WASM worker threads and reuses the thread pool', async () => {
    const calls: number[] = [];
    const wasm = makeFakeWasm(calls);

    const first = await createPvacWasmBackend({ seed: new Uint8Array(32), wasm });
    const second = await createPvacWasmBackend({ seed: new Uint8Array(32).fill(1), wasm });

    expect(first.rayonThreadCount()).toBe(globalThis.navigator.hardwareConcurrency);
    expect(second.rayonThreadCount()).toBe(globalThis.navigator.hardwareConcurrency);
    expect(calls).toEqual([globalThis.navigator.hardwareConcurrency]);

    first.free();
    second.free();
  });

  test('honors OCTRA_PVAC_THREADS override and allows single-thread fallback', async () => {
    const previous = process.env.OCTRA_PVAC_THREADS;
    try {
      const explicitCalls: number[] = [];
      process.env.OCTRA_PVAC_THREADS = '3';
      const explicit = await createPvacWasmBackend({ seed: new Uint8Array(32), wasm: makeFakeWasm(explicitCalls) });
      expect(explicit.rayonThreadCount()).toBe(3);
      expect(explicitCalls).toEqual([3]);
      explicit.free();

      const disabledCalls: number[] = [];
      process.env.OCTRA_PVAC_THREADS = '0';
      const disabled = await createPvacWasmBackend({ seed: new Uint8Array(32), wasm: makeFakeWasm(disabledCalls, 0) });
      expect(disabled.rayonThreadCount()).toBe(0);
      expect(disabledCalls).toEqual([]);
      disabled.free();
    } finally {
      if (previous === undefined) delete process.env.OCTRA_PVAC_THREADS;
      else process.env.OCTRA_PVAC_THREADS = previous;
    }
  });
});

function makeFakeWasm(initCalls: number[], threadCount?: number) {
  return {
    initThreadPool: async (threads: number) => {
      initCalls.push(threads);
    },
    pvac_pre_warm_generators: () => {},
    PvacContext: class {
      free() {}
      rayon_thread_count() {
        return threadCount ?? initCalls.at(-1) ?? 0;
      }
    },
  };
}
