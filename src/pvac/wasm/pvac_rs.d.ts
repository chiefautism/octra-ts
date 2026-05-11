/* tslint:disable */
/* eslint-disable */

/**
 * PVAC context holding keys for a single wallet.
 */
export class PvacContext {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Assemble a complete range proof from pre-computed bit proof batches.
   * `batch_parts` is a JS array of Uint8Array batch results (from make_bit_proofs_batch).
   * Computes the LC proof and returns the final serialized range proof bytes.
   */
  assemble_range_proof(cipher_bytes: Uint8Array, batch_parts: Array<any>): Uint8Array;
  /**
   * Compute SHA-256 commitment of a serialized cipher. Returns 32 bytes.
   */
  commit(cipher_bytes: Uint8Array): Uint8Array;
  /**
   * Homomorphic addition: a + b. All args/result are serialized ciphers.
   */
  ct_add(a: Uint8Array, b: Uint8Array): Uint8Array;
  /**
   * Homomorphic subtraction: a - b. All args/result are serialized ciphers.
   * If either input was deserialized from V1 format (no Pedersen Commitments),
   * PCs are computed before the operation. This ensures verify_zero always has
   * the PCs it needs on all base layers. For V2 inputs, attach_pedersen_commitments
   * produces identical PCs (confirmed by test_attach_pc_vs_original_pc_cross_verify).
   */
  ct_sub(a: Uint8Array, b: Uint8Array): Uint8Array;
  /**
   * Decrypt a serialized cipher, returning the balance as i64.
   * Handles full Fp field element: if hi != 0 and val > p/2, treats as negative.
   * Matches cli.py get_balance() logic.
   */
  decrypt(cipher_bytes: Uint8Array): bigint;
  /**
   * Diagnose a serialized cipher: return JSON with layer count, PC status, etc.
   * Useful for debugging proof verification failures.
   */
  diagnose_cipher(cipher_bytes: Uint8Array): string;
  /**
   * Diagnose a serialized zero proof: return JSON with proof structure info.
   * Useful for debugging bound proof deserialization failures.
   * Accepts RAW format (no PVAC header), matching the C API.
   */
  diagnose_proof(proof_bytes: Uint8Array): string;
  /**
   * Encrypt a u64 value. Returns serialized cipher bytes.
   */
  encrypt(value: bigint): Uint8Array;
  /**
   * Encrypt a u64 value deterministically from a 32-byte seed.
   */
  encrypt_seeded(value: bigint, seed: Uint8Array): Uint8Array;
  /**
   * Encrypt zero. Returns serialized cipher bytes.
   */
  encrypt_zero(): Uint8Array;
  /**
   * Encrypt zero deterministically from a 32-byte seed.
   */
  encrypt_zero_seeded(seed: Uint8Array): Uint8Array;
  /**
   * Generate an aggregated range proof (single R1CS proof for all 65 constraints).
   * Much smaller than standard range proof (~200-300KB vs ~2MB+).
   */
  make_aggregated_range_proof(cipher_bytes: Uint8Array, value: bigint): Uint8Array;
  /**
   * Generate bit proofs for bits [start_bit, end_bit) of `value`.
   * Used by the parallel worker pool — each worker computes a subset of bits.
   * Returns serialized batch bytes (internal format for reassembly).
   */
  make_bit_proofs_batch(
    value: bigint,
    start_bit: number,
    end_bit: number,
    on_progress: Function
  ): Uint8Array;
  /**
   * Generate a bound zero proof linking cipher to a Pedersen commitment.
   * `blinding` must be 32 bytes (scalar mod l).
   * Returns serialized zero proof bytes in RAW format (no PVAC header),
   * matching the C API `pvac_serialize_zero_proof()` for server interop.
   */
  make_bound_proof(cipher_bytes: Uint8Array, amount: bigint, blinding: Uint8Array): Uint8Array;
  /**
   * Generate a range proof for a cipher that encrypts `value`.
   * Returns serialized range proof bytes (PVAC wire format).
   */
  make_range_proof(cipher_bytes: Uint8Array, value: bigint): Uint8Array;
  /**
   * Generate a range proof using rayon parallel threads (wasm-parallel feature).
   * All 64 bit proofs run concurrently across the thread pool.
   * Requires `initThreadPool()` to have been called first.
   * Returns serialized range proof bytes.
   */
  make_range_proof_parallel(cipher_bytes: Uint8Array, value: bigint): Uint8Array;
  /**
   * Generate a range proof with per-circuit progress reporting.
   * `on_progress` is a JS function called as `on_progress(current, total)` after each circuit.
   */
  make_range_proof_with_progress(
    cipher_bytes: Uint8Array,
    value: bigint,
    on_progress: Function
  ): Uint8Array;
  /**
   * Create a new context by deriving keys from a 32-byte seed.
   * Automatically pre-warms the Bulletproofs generator table (32768 entries)
   * on first context creation so rayon threads don't contend on expansion.
   */
  constructor(seed: Uint8Array);
  /**
   * Compute a Pedersen commitment: amount * B + blinding * B_blinding.
   * Returns 32-byte compressed Ristretto point.
   */
  pedersen_commit(amount: bigint, blinding: Uint8Array): Uint8Array;
  /**
   * Return the number of threads in the rayon thread pool.
   * Returns 0 if rayon is not initialized or not available.
   */
  rayon_thread_count(): number;
  /**
   * Serialize the public key to bytes.
   */
  serialize_pubkey(): Uint8Array;
  /**
   * Serialize the secret key to bytes.
   */
  serialize_seckey(): Uint8Array;
  /**
   * Verify an aggregated range proof against a ciphertext.
   */
  verify_aggregated_range_proof(cipher_bytes: Uint8Array, proof_bytes: Uint8Array): boolean;
  /**
   * Verify a bound zero proof against a ciphertext and Pedersen commitment.
   * `commitment` must be 32 bytes (compressed Ristretto point).
   * Proof bytes must be in RAW format (no PVAC header), matching the C API.
   * Returns true if the proof is valid, false otherwise.
   */
  verify_bound_proof(
    cipher_bytes: Uint8Array,
    proof_bytes: Uint8Array,
    commitment: Uint8Array
  ): boolean;
  /**
   * Auto-detect proof format (standard or aggregated) and verify.
   */
  verify_range_any(cipher_bytes: Uint8Array, proof_bytes: Uint8Array): boolean;
  /**
   * Verify a range proof against a ciphertext.
   * Both arguments are serialized bytes.
   * Returns true if the proof is valid, false otherwise.
   */
  verify_range_proof(cipher_bytes: Uint8Array, proof_bytes: Uint8Array): boolean;
}

export function initThreadPool(num_threads: number): Promise<any>;

/**
 * Compute AES-256 KAT matching the C++ `pvac_aes_kat()` function:
 * 1. SHA-256("pvac.aes.kat.key") → 32-byte AES key
 * 2. AesCtr256(key, nonce=0) → next_u64() twice → 16 bytes
 * Returns lowercase hex (32 chars).
 */
export function pvac_compute_aes_kat(): string;

/**
 * Deserialize a public key from bytes (standalone function).
 */
export function pvac_deserialize_pubkey(data: Uint8Array): Uint8Array;

/**
 * Deserialize a secret key from bytes (standalone function).
 */
export function pvac_deserialize_seckey(data: Uint8Array): Uint8Array;

/**
 * Encode serialized cipher bytes as "hfhe_v1|<base64>".
 * Matches cli.py `encode_cipher()`.
 */
export function pvac_encode_cipher(cipher_bytes: Uint8Array): string;

/**
 * Encode serialized range proof bytes as "rp_v1|<base64>".
 * Matches cli.py `encode_range_proof()`.
 */
export function pvac_encode_range_proof(proof_bytes: Uint8Array): string;

/**
 * Encode serialized zero proof bytes as "zkzp_v2|<base64>".
 * Matches cli.py `encode_zero_proof()`.
 */
export function pvac_encode_zero_proof(proof_bytes: Uint8Array): string;

/**
 * Pre-compute Bulletproofs generator table up to `n` entries.
 * Call this during WASM init to front-load the hash-to-point cost.
 * Rayon threads can then read generators concurrently without contention.
 */
export function pvac_pre_warm_generators(n: number): void;

export class wbg_rayon_PoolBuilder {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  build(): void;
  mainJS(): string;
  numThreads(): number;
  receiver(): number;
}

export function wbg_rayon_start_worker(receiver: number): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly __wbg_pvaccontext_free: (a: number, b: number) => void;
  readonly pvac_compute_aes_kat: (a: number) => void;
  readonly pvac_deserialize_pubkey: (a: number, b: number, c: number) => void;
  readonly pvac_deserialize_seckey: (a: number, b: number, c: number) => void;
  readonly pvac_encode_cipher: (a: number, b: number, c: number) => void;
  readonly pvac_encode_range_proof: (a: number, b: number, c: number) => void;
  readonly pvac_encode_zero_proof: (a: number, b: number, c: number) => void;
  readonly pvaccontext_assemble_range_proof: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number
  ) => void;
  readonly pvaccontext_commit: (a: number, b: number, c: number, d: number) => void;
  readonly pvaccontext_ct_add: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ) => void;
  readonly pvaccontext_ct_sub: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ) => void;
  readonly pvaccontext_decrypt: (a: number, b: number, c: number, d: number) => void;
  readonly pvaccontext_diagnose_cipher: (a: number, b: number, c: number, d: number) => void;
  readonly pvaccontext_diagnose_proof: (a: number, b: number, c: number, d: number) => void;
  readonly pvaccontext_encrypt: (a: number, b: number, c: bigint) => void;
  readonly pvaccontext_encrypt_seeded: (
    a: number,
    b: number,
    c: bigint,
    d: number,
    e: number
  ) => void;
  readonly pvaccontext_encrypt_zero: (a: number, b: number) => void;
  readonly pvaccontext_encrypt_zero_seeded: (a: number, b: number, c: number, d: number) => void;
  readonly pvaccontext_make_aggregated_range_proof: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: bigint
  ) => void;
  readonly pvaccontext_make_bit_proofs_batch: (
    a: number,
    b: number,
    c: bigint,
    d: number,
    e: number,
    f: number
  ) => void;
  readonly pvaccontext_make_bound_proof: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: bigint,
    f: number,
    g: number
  ) => void;
  readonly pvaccontext_make_range_proof: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: bigint
  ) => void;
  readonly pvaccontext_make_range_proof_parallel: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: bigint
  ) => void;
  readonly pvaccontext_make_range_proof_with_progress: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: bigint,
    f: number
  ) => void;
  readonly pvaccontext_new: (a: number, b: number, c: number) => void;
  readonly pvaccontext_pedersen_commit: (
    a: number,
    b: number,
    c: bigint,
    d: number,
    e: number
  ) => void;
  readonly pvaccontext_rayon_thread_count: (a: number) => number;
  readonly pvaccontext_serialize_pubkey: (a: number, b: number) => void;
  readonly pvaccontext_serialize_seckey: (a: number, b: number) => void;
  readonly pvaccontext_verify_aggregated_range_proof: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ) => void;
  readonly pvaccontext_verify_bound_proof: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
    g: number,
    h: number
  ) => void;
  readonly pvaccontext_verify_range_any: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ) => void;
  readonly pvaccontext_verify_range_proof: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ) => void;
  readonly pvac_pre_warm_generators: (a: number) => void;
  readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
  readonly initThreadPool: (a: number) => number;
  readonly wbg_rayon_poolbuilder_build: (a: number) => void;
  readonly wbg_rayon_poolbuilder_mainJS: (a: number) => number;
  readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
  readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
  readonly wbg_rayon_start_worker: (a: number) => void;
  readonly memory: WebAssembly.Memory;
  readonly __wbindgen_export: (a: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export3: (a: number, b: number) => number;
  readonly __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
  readonly __wbindgen_start: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number }} module - Passing `SyncInitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(
  module:
    | { module: SyncInitInput; memory?: WebAssembly.Memory; thread_stack_size?: number }
    | SyncInitInput,
  memory?: WebAssembly.Memory
): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number }} module_or_path - Passing `InitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | {
        module_or_path: InitInput | Promise<InitInput>;
        memory?: WebAssembly.Memory;
        thread_stack_size?: number;
      }
    | InitInput
    | Promise<InitInput>,
  memory?: WebAssembly.Memory
): Promise<InitOutput>;
