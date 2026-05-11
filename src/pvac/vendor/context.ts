/**
 * PvacContext — High-level wrapper around pvac-rs WASM
 *
 * Handles initialization, encryption, decryption, proof generation,
 * and cipher arithmetic for FHE operations on Octra.
 *
 * All value parameters use bigint (microOCT). Use BigInt(amount) to convert.
 */

import type {
  Cipher,
  RangeProof,
  BoundProof,
  PedersenCommitment,
  EncryptResult,
  PvacWasmModule,
  PvacWasmContext,
} from './types.js';
import { encodeCipher, encodeProof } from './encoding.js';

const initializedThreadPools = new WeakMap<PvacWasmModule, Promise<void>>();

export class PvacContext {
  private _wasm: PvacWasmContext;
  private _module: PvacWasmModule;

  private constructor(wasm: PvacWasmContext, module: PvacWasmModule) {
    this._wasm = wasm;
    this._module = module;
  }

  /**
   * Create a new PVAC context from a 32-byte seed.
   * The seed derives the FHE keypair (public + secret key).
   *
   * @param seed - 32 bytes (e.g., HMAC-SHA512("Octra seed", mnemonic)[0:32])
   * @param wasmModule - WASM module from initPvac()
   * @param options.preWarm - Pre-compute curve generators (faster first proof)
   * @param options.threads - Init rayon thread pool for parallel proofs
   * @param options.allowThreadFallback - Continue single-threaded if automatic thread init is unavailable
   */
  static async create(
    seed: Uint8Array,
    wasmModule: PvacWasmModule,
    options?: { allowThreadFallback?: boolean; preWarm?: boolean; threads?: number }
  ): Promise<PvacContext> {
    if (seed.length !== 32) throw new Error('Seed must be 32 bytes');

    if (options?.threads) {
      try {
        await initThreadPoolOnce(wasmModule, options.threads);
      } catch (error) {
        if (!options.allowThreadFallback) throw error;
      }
    }

    if (options?.preWarm) {
      wasmModule.pvac_pre_warm_generators(64);
    }

    const ctx = new wasmModule.PvacContext(seed);
    return new PvacContext(ctx, wasmModule);
  }

  // ── Encryption / Decryption ─────────────────────────────

  /** Encrypt a value in microOCT. Returns raw cipher bytes. */
  encrypt(value: bigint): Cipher {
    return this._wasm.encrypt(value);
  }

  /** Encrypt with a specific 32-byte seed (deterministic). */
  encryptSeeded(value: bigint, seed: Uint8Array): Cipher {
    return this._wasm.encrypt_seeded(value, seed);
  }

  /** Encrypt zero — used for padding/dummy operations. */
  encryptZero(): Cipher {
    return this._wasm.encrypt_zero();
  }

  /** Encrypt zero with a specific seed. */
  encryptZeroSeeded(seed: Uint8Array): Cipher {
    return this._wasm.encrypt_zero_seeded(seed);
  }

  /** Decrypt a cipher to its plaintext value (microOCT as bigint). */
  decrypt(cipher: Cipher): bigint {
    return this._wasm.decrypt(cipher);
  }

  // ── Cipher Arithmetic ───────────────────────────────────

  /** Add two ciphertexts homomorphically: result encrypts (a + b). */
  ctAdd(a: Cipher, b: Cipher): Cipher {
    return this._wasm.ct_add(a, b);
  }

  /** Subtract two ciphertexts homomorphically: result encrypts (a - b). */
  ctSub(a: Cipher, b: Cipher): Cipher {
    return this._wasm.ct_sub(a, b);
  }

  // ── Proofs ──────────────────────────────────────────────

  /**
   * Range proof: proves the encrypted value ≥ 0.
   * Used after decrypt to prove new balance is non-negative.
   * WARNING: Slow (30-60s desktop, 4+ min mobile).
   */
  makeRangeProof(cipher: Cipher, value: bigint): RangeProof {
    return this._wasm.make_range_proof(cipher, value);
  }

  /**
   * Parallel range proof using rayon threads.
   * Requires initThreadPool() in create options.
   */
  makeRangeProofParallel(cipher: Cipher, value: bigint): RangeProof {
    return this._wasm.make_range_proof_parallel(cipher, value);
  }

  /**
   * Aggregated range proof — smaller proof size but slower generation.
   * Better for server-side verification, worse for client generation.
   */
  makeAggregatedRangeProof(cipher: Cipher, value: bigint): RangeProof {
    return this._wasm.make_aggregated_range_proof(cipher, value);
  }

  /**
   * Bound proof: proves the cipher encrypts a value matching the Pedersen commitment.
   *
   * @param cipher - The FHE ciphertext
   * @param value - The plaintext value (must match what was encrypted)
   * @param blinding - 32-byte random blinding factor
   */
  makeBoundProof(cipher: Cipher, value: bigint, blinding: Uint8Array): BoundProof {
    const proof = this._wasm.make_bound_proof(cipher, value, blinding);
    const commitment = this._wasm.pedersen_commit(value, blinding);
    return { proof, commitment, blinding };
  }

  /** Pedersen commitment: commit(value, blinding) → deterministic 32-byte commitment. */
  pedersenCommit(value: bigint, blinding: Uint8Array): PedersenCommitment {
    const commitment = this._wasm.pedersen_commit(value, blinding);
    return { commitment, blinding };
  }

  // ── Verification ────────────────────────────────────────

  /** Verify a range proof (auto-detects standard vs aggregated format). */
  verifyRangeProof(cipher: Cipher, proof: RangeProof): boolean {
    return this._wasm.verify_range_any(cipher, proof);
  }

  /** Verify a bound proof against a commitment. */
  verifyBoundProof(cipher: Cipher, proof: Uint8Array, commitment: Uint8Array): boolean {
    return this._wasm.verify_bound_proof(cipher, proof, commitment);
  }

  // ── Key Serialization ───────────────────────────────────

  /** Serialize public key (~3-4MB compressed). Needed for PVAC registration. */
  serializePubkey(): Uint8Array {
    return this._wasm.serialize_pubkey();
  }

  // ── Diagnostics ─────────────────────────────────────────

  /** Debug info about a proof (format, size, validity hints). */
  diagnoseProof(proof: Uint8Array): string {
    return this._wasm.diagnose_proof(proof);
  }

  /** Debug info about a cipher (size, format). */
  diagnoseCipher(cipher: Uint8Array): string {
    return this._wasm.diagnose_cipher(cipher);
  }

  /** Number of rayon worker threads available to this context. */
  rayonThreadCount(): number {
    return this._wasm.rayon_thread_count();
  }

  // ── Encoding Helpers ────────────────────────────────────

  /** Encode cipher to Octra wire format: hfhe_v1|<base64> */
  encodeCipher(cipher: Cipher): string {
    return this._module.pvac_encode_cipher(cipher);
  }

  /** Encode range proof to wire format: rp_v1|<base64> */
  encodeRangeProof(proof: RangeProof): string {
    return this._module.pvac_encode_range_proof(proof);
  }

  /** Encode zero/bound proof to wire format: zkzp_v2|<base64> */
  encodeZeroProof(proof: Uint8Array): string {
    return this._module.pvac_encode_zero_proof(proof);
  }

  /** Compute AES KAT (Key Agreement Test) — needed for PVAC registration. */
  computeAesKat(): string {
    return this._module.pvac_compute_aes_kat();
  }

  // ── High-Level Helpers ──────────────────────────────────

  /**
   * Full encrypt flow: encrypt + bound proof + encode.
   * Returns everything needed for an encrypt transaction.
   *
   * @param value - Amount in microOCT (as bigint)
   */
  fullEncrypt(value: bigint): EncryptResult {
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const blinding = crypto.getRandomValues(new Uint8Array(32));

    const cipher = this.encryptSeeded(value, seed);
    const boundProof = this.makeBoundProof(cipher, value, blinding);

    return {
      cipher,
      cipherB64: encodeCipher(cipher),
      boundProof,
      boundProofEncoded: encodeProof(boundProof.proof),
    };
  }

  /** Release WASM memory. Call when done with this context. */
  free(): void {
    this._wasm.free();
  }
}

function initThreadPoolOnce(wasmModule: PvacWasmModule, threads: number): Promise<void> {
  const existing = initializedThreadPools.get(wasmModule);
  if (existing) return existing;

  const initializing = wasmModule.initThreadPool(threads)
    .then(() => undefined)
    .catch((error) => {
      initializedThreadPools.delete(wasmModule);
      throw error;
    });
  initializedThreadPools.set(wasmModule, initializing);
  return initializing;
}
