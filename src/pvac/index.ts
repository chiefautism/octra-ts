import {
  PvacContext,
} from './vendor/context.js';
import {
  initPvac,
} from './vendor/wasm.js';
import {
  PrivateTransfer,
  type ProgressCallback,
  type TransferResult,
} from './vendor/transfer.js';
import {
  StealthAddress,
  type ViewKeypair,
  type StealthOutput,
  type ScannedOutput,
} from './vendor/stealth.js';
import { decodeCipher } from './vendor/encoding.js';
import type { Base64, Hex, RawAmount } from '../types.js';
import { base64ToBytes, bytesToBase64, hexToBytes } from '../utils/bytes.js';

export {
  PvacContext,
  PrivateTransfer,
  StealthAddress,
  decodeCipher,
};
export {
  encodeCipher,
  encodeProof,
  decodeProof,
  uint8ToBase64,
  base64ToUint8,
  uint8ToHex,
  hexToUint8,
} from './vendor/encoding.js';
export {
  buildEncryptPayload,
  buildDecryptPayload,
} from './vendor/payloads.js';
export type {
  Cipher,
  RangeProof,
  BoundProof,
  PedersenCommitment,
  EncryptResult,
  EncryptPayload,
  DecryptPayload,
} from './vendor/types.js';

export type PvacProgressCallback = ProgressCallback;

export type PvacOperationPayload = {
  encryptedData: string;
  opType: 'encrypt' | 'decrypt';
  amount: RawAmount;
  elapsedMs?: number;
};

export type PvacThreadCount = number | 'auto' | false;

export type BuildPvacEncryptPayloadParameters = {
  amount: bigint;
  onProgress?: PvacProgressCallback;
};

export type BuildPvacDecryptPayloadParameters = {
  amount: bigint;
  currentCipher: string | Uint8Array;
  currentBalance: bigint;
  onProgress?: PvacProgressCallback;
};

export type PvacBackend = {
  kind: string;
  serializePubkey: () => Uint8Array | Promise<Uint8Array>;
  computeAesKat: () => Hex | Promise<Hex>;
  decryptCipher: (cipher: string | Uint8Array) => bigint | Promise<bigint>;
  buildEncryptPayload: (parameters: BuildPvacEncryptPayloadParameters) =>
    PvacOperationPayload | Promise<PvacOperationPayload>;
  buildDecryptPayload: (parameters: BuildPvacDecryptPayloadParameters) =>
    PvacOperationPayload | Promise<PvacOperationPayload>;
};

export type CreatePvacWasmBackendParameters = {
  seed: Uint8Array | Base64 | Hex | `0x${string}`;
  wasm?: unknown;
  preWarm?: boolean;
  threads?: PvacThreadCount;
};

export type PvacWasmBackend = PvacBackend & {
  context: PvacContext;
  serializePubkeyBase64: () => Base64;
  rayonThreadCount: () => number;
  free: () => void;
};

export async function createPvacWasmBackend(
  parameters: CreatePvacWasmBackendParameters,
): Promise<PvacWasmBackend> {
  const wasm = parameters.wasm ?? await initPvac();
  const threading = resolvePvacThreadCount(parameters.threads);
  const context = await PvacContext.create(
    normalizePvacSeed(parameters.seed),
    wasm,
    {
      allowThreadFallback: threading.auto,
      preWarm: parameters.preWarm ?? threading.threads !== undefined,
      threads: threading.threads,
    },
  );
  return createPvacWasmBackendFromContext(context);
}

export function createPvacWasmBackendFromContext(context: PvacContext): PvacWasmBackend {
  return {
    kind: '@0xio/pvac-wasm',
    context,
    serializePubkey: () => context.serializePubkey(),
    serializePubkeyBase64: () => bytesToBase64(context.serializePubkey()),
    rayonThreadCount: () => context.rayonThreadCount(),
    computeAesKat: () => context.computeAesKat(),
    decryptCipher: (cipher) => {
      const raw = typeof cipher === 'string' ? decodePvacCipher(cipher) : cipher;
      if (raw.length === 0) return 0n;
      return context.decrypt(raw);
    },
    buildEncryptPayload: ({ amount, onProgress }) => transferResultToPayload(
      PrivateTransfer.encrypt(context, amount, onProgress),
    ),
    buildDecryptPayload: ({ amount, currentCipher, currentBalance, onProgress }) => {
      const rawCipher = typeof currentCipher === 'string' ? decodePvacCipher(currentCipher) : currentCipher;
      return transferResultToPayload(
        PrivateTransfer.decrypt(context, amount, rawCipher, currentBalance, onProgress),
      );
    },
    free: () => context.free(),
  };
}

export async function getPvacRegistrationMaterial(
  backend: Pick<PvacBackend, 'serializePubkey' | 'computeAesKat'>,
): Promise<{ pubkeyBlob: Base64; aesKat: Hex }> {
  const pubkey = await backend.serializePubkey();
  return {
    pubkeyBlob: bytesToBase64(pubkey),
    aesKat: await backend.computeAesKat(),
  };
}

export const pvacStealth = {
  deriveViewKeypair: (privateKeyB64: Base64): Promise<ViewKeypair> =>
    StealthAddress.deriveViewKeypair(privateKeyB64),
  createOutput: (
    recipientViewPub: Uint8Array,
    amount: bigint,
    blinding: Uint8Array,
  ): Promise<{ output: StealthOutput; ephSk: Uint8Array }> =>
    StealthAddress.createOutput(recipientViewPub, amount, blinding),
  scan: (
    outputs: Array<{ ephPub: string; tag: string; encAmount: string; index?: number }>,
    viewSk: Uint8Array,
    address: string,
  ): Promise<ScannedOutput[]> =>
    StealthAddress.scan(outputs, viewSk, address),
  computeClaimPub: (claimSecret: Uint8Array, recipientAddress: string): Promise<Uint8Array> =>
    StealthAddress.computeClaimPub(claimSecret, recipientAddress),
};

function transferResultToPayload(result: TransferResult): PvacOperationPayload {
  return {
    encryptedData: result.encrypted_data,
    opType: result.op_type,
    amount: result.amount.toString(),
    elapsedMs: result.elapsed_ms,
  };
}

function decodePvacCipher(cipher: string): Uint8Array {
  if (!cipher || cipher === '0') return new Uint8Array();
  return decodeCipher(cipher);
}

function normalizePvacSeed(seed: CreatePvacWasmBackendParameters['seed']): Uint8Array {
  if (seed instanceof Uint8Array) return requireSeed32(seed);
  const trimmed = seed.trim();
  if (trimmed.startsWith('0x')) return requireSeed32(hexToBytes(trimmed));
  if ((trimmed.length === 64 || trimmed.length === 128) && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return requireSeed32(hexToBytes(trimmed));
  }
  return requireSeed32(base64ToBytes(trimmed));
}

function requireSeed32(bytes: Uint8Array): Uint8Array {
  if (bytes.length !== 32 && bytes.length !== 64) {
    throw new Error('PVAC seed must be a 32-byte seed or 64-byte expanded private key');
  }
  return bytes.slice(0, 32);
}

function resolvePvacThreadCount(threads: PvacThreadCount | undefined): { auto: boolean; threads?: number } {
  if (threads === false) return { auto: false };
  if (typeof threads === 'number') return { auto: false, threads: requireThreadCount(threads) };

  const envThreads = readEnvThreadCount();
  if (envThreads !== undefined) return { auto: envThreads.auto, threads: envThreads.threads };

  return { auto: true, threads: autoThreadCount() };
}

function autoThreadCount(): number | undefined {
  if (!supportsWasmThreads()) return undefined;
  const hardwareConcurrency = globalThis.navigator?.hardwareConcurrency;
  const detected = typeof hardwareConcurrency === 'number' && Number.isFinite(hardwareConcurrency)
    ? Math.floor(hardwareConcurrency)
    : 1;
  if (detected < 2) return undefined;
  return detected;
}

function readEnvThreadCount(): { auto: boolean; threads?: number } | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.OCTRA_PVAC_THREADS;
  if (!env) return undefined;

  const normalized = env.trim().toLowerCase();
  if (normalized === 'auto') return { auto: true, threads: autoThreadCount() };
  if (normalized === 'false' || normalized === 'off' || normalized === '0') return { auto: false };
  return { auto: false, threads: requireThreadCount(Number(normalized)) };
}

function requireThreadCount(threads: number): number {
  if (!Number.isInteger(threads) || threads < 1) {
    throw new Error('PVAC thread count must be a positive integer, "auto", or false');
  }
  return threads;
}

function supportsWasmThreads(): boolean {
  return typeof SharedArrayBuffer === 'function'
    && typeof Atomics === 'object'
    && typeof Worker === 'function';
}
