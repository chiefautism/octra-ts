/* @ts-self-types="./pvac_rs.d.ts" */
import { startWorkers } from './snippets/wasm-bindgen-rayon-38edf6e439f6d70d/src/workerHelpers.no-bundler.js';

/**
 * PVAC context holding keys for a single wallet.
 */
export class PvacContext {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    PvacContextFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_pvaccontext_free(ptr, 0);
  }
  /**
   * Assemble a complete range proof from pre-computed bit proof batches.
   * `batch_parts` is a JS array of Uint8Array batch results (from make_bit_proofs_batch).
   * Computes the LC proof and returns the final serialized range proof bytes.
   * @param {Uint8Array} cipher_bytes
   * @param {Array<any>} batch_parts
   * @returns {Uint8Array}
   */
  assemble_range_proof(cipher_bytes, batch_parts) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_assemble_range_proof(
        retptr,
        this.__wbg_ptr,
        ptr0,
        len0,
        addBorrowedObject(batch_parts)
      );
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v2 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v2;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
      heap[stack_pointer++] = undefined;
    }
  }
  /**
   * Compute SHA-256 commitment of a serialized cipher. Returns 32 bytes.
   * @param {Uint8Array} cipher_bytes
   * @returns {Uint8Array}
   */
  commit(cipher_bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_commit(retptr, this.__wbg_ptr, ptr0, len0);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v2 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v2;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Homomorphic addition: a + b. All args/result are serialized ciphers.
   * @param {Uint8Array} a
   * @param {Uint8Array} b
   * @returns {Uint8Array}
   */
  ct_add(a, b) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(a, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      const ptr1 = passArray8ToWasm0(b, wasm.__wbindgen_export3);
      const len1 = WASM_VECTOR_LEN;
      wasm.pvaccontext_ct_add(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v3 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v3;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Homomorphic subtraction: a - b. All args/result are serialized ciphers.
   * If either input was deserialized from V1 format (no Pedersen Commitments),
   * PCs are computed before the operation. This ensures verify_zero always has
   * the PCs it needs on all base layers. For V2 inputs, attach_pedersen_commitments
   * produces identical PCs (confirmed by test_attach_pc_vs_original_pc_cross_verify).
   * @param {Uint8Array} a
   * @param {Uint8Array} b
   * @returns {Uint8Array}
   */
  ct_sub(a, b) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(a, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      const ptr1 = passArray8ToWasm0(b, wasm.__wbindgen_export3);
      const len1 = WASM_VECTOR_LEN;
      wasm.pvaccontext_ct_sub(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v3 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v3;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Decrypt a serialized cipher, returning the balance as i64.
   * Handles full Fp field element: if hi != 0 and val > p/2, treats as negative.
   * Matches cli.py get_balance() logic.
   * @param {Uint8Array} cipher_bytes
   * @returns {bigint}
   */
  decrypt(cipher_bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_decrypt(retptr, this.__wbg_ptr, ptr0, len0);
      var r0 = getDataViewMemory0().getBigInt64(retptr + 8 * 0, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      return r0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Diagnose a serialized cipher: return JSON with layer count, PC status, etc.
   * Useful for debugging proof verification failures.
   * @param {Uint8Array} cipher_bytes
   * @returns {string}
   */
  diagnose_cipher(cipher_bytes) {
    let deferred3_0;
    let deferred3_1;
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_diagnose_cipher(retptr, this.__wbg_ptr, ptr0, len0);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      var ptr2 = r0;
      var len2 = r1;
      if (r3) {
        ptr2 = 0;
        len2 = 0;
        throw takeObject(r2);
      }
      deferred3_0 = ptr2;
      deferred3_1 = len2;
      return getStringFromWasm0(ptr2, len2);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
      wasm.__wbindgen_export2(deferred3_0, deferred3_1, 1);
    }
  }
  /**
   * Diagnose a serialized zero proof: return JSON with proof structure info.
   * Useful for debugging bound proof deserialization failures.
   * Accepts RAW format (no PVAC header), matching the C API.
   * @param {Uint8Array} proof_bytes
   * @returns {string}
   */
  diagnose_proof(proof_bytes) {
    let deferred3_0;
    let deferred3_1;
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(proof_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_diagnose_proof(retptr, this.__wbg_ptr, ptr0, len0);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      var ptr2 = r0;
      var len2 = r1;
      if (r3) {
        ptr2 = 0;
        len2 = 0;
        throw takeObject(r2);
      }
      deferred3_0 = ptr2;
      deferred3_1 = len2;
      return getStringFromWasm0(ptr2, len2);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
      wasm.__wbindgen_export2(deferred3_0, deferred3_1, 1);
    }
  }
  /**
   * Encrypt a u64 value. Returns serialized cipher bytes.
   * @param {bigint} value
   * @returns {Uint8Array}
   */
  encrypt(value) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.pvaccontext_encrypt(retptr, this.__wbg_ptr, value);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v1 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Encrypt a u64 value deterministically from a 32-byte seed.
   * @param {bigint} value
   * @param {Uint8Array} seed
   * @returns {Uint8Array}
   */
  encrypt_seeded(value, seed) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(seed, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_encrypt_seeded(retptr, this.__wbg_ptr, value, ptr0, len0);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v2 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v2;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Encrypt zero. Returns serialized cipher bytes.
   * @returns {Uint8Array}
   */
  encrypt_zero() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.pvaccontext_encrypt_zero(retptr, this.__wbg_ptr);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v1 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Encrypt zero deterministically from a 32-byte seed.
   * @param {Uint8Array} seed
   * @returns {Uint8Array}
   */
  encrypt_zero_seeded(seed) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(seed, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_encrypt_zero_seeded(retptr, this.__wbg_ptr, ptr0, len0);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v2 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v2;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Generate an aggregated range proof (single R1CS proof for all 65 constraints).
   * Much smaller than standard range proof (~200-300KB vs ~2MB+).
   * @param {Uint8Array} cipher_bytes
   * @param {bigint} value
   * @returns {Uint8Array}
   */
  make_aggregated_range_proof(cipher_bytes, value) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_make_aggregated_range_proof(retptr, this.__wbg_ptr, ptr0, len0, value);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v2 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v2;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Generate bit proofs for bits [start_bit, end_bit) of `value`.
   * Used by the parallel worker pool — each worker computes a subset of bits.
   * Returns serialized batch bytes (internal format for reassembly).
   * @param {bigint} value
   * @param {number} start_bit
   * @param {number} end_bit
   * @param {Function} on_progress
   * @returns {Uint8Array}
   */
  make_bit_proofs_batch(value, start_bit, end_bit, on_progress) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.pvaccontext_make_bit_proofs_batch(
        retptr,
        this.__wbg_ptr,
        value,
        start_bit,
        end_bit,
        addBorrowedObject(on_progress)
      );
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v1 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
      heap[stack_pointer++] = undefined;
    }
  }
  /**
   * Generate a bound zero proof linking cipher to a Pedersen commitment.
   * `blinding` must be 32 bytes (scalar mod l).
   * Returns serialized zero proof bytes in RAW format (no PVAC header),
   * matching the C API `pvac_serialize_zero_proof()` for server interop.
   * @param {Uint8Array} cipher_bytes
   * @param {bigint} amount
   * @param {Uint8Array} blinding
   * @returns {Uint8Array}
   */
  make_bound_proof(cipher_bytes, amount, blinding) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      const ptr1 = passArray8ToWasm0(blinding, wasm.__wbindgen_export3);
      const len1 = WASM_VECTOR_LEN;
      wasm.pvaccontext_make_bound_proof(retptr, this.__wbg_ptr, ptr0, len0, amount, ptr1, len1);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v3 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v3;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Generate a range proof for a cipher that encrypts `value`.
   * Returns serialized range proof bytes (PVAC wire format).
   * @param {Uint8Array} cipher_bytes
   * @param {bigint} value
   * @returns {Uint8Array}
   */
  make_range_proof(cipher_bytes, value) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_make_range_proof(retptr, this.__wbg_ptr, ptr0, len0, value);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v2 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v2;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Generate a range proof using rayon parallel threads (wasm-parallel feature).
   * All 64 bit proofs run concurrently across the thread pool.
   * Requires `initThreadPool()` to have been called first.
   * Returns serialized range proof bytes.
   * @param {Uint8Array} cipher_bytes
   * @param {bigint} value
   * @returns {Uint8Array}
   */
  make_range_proof_parallel(cipher_bytes, value) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_make_range_proof_parallel(retptr, this.__wbg_ptr, ptr0, len0, value);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v2 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v2;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Generate a range proof with per-circuit progress reporting.
   * `on_progress` is a JS function called as `on_progress(current, total)` after each circuit.
   * @param {Uint8Array} cipher_bytes
   * @param {bigint} value
   * @param {Function} on_progress
   * @returns {Uint8Array}
   */
  make_range_proof_with_progress(cipher_bytes, value, on_progress) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_make_range_proof_with_progress(
        retptr,
        this.__wbg_ptr,
        ptr0,
        len0,
        value,
        addBorrowedObject(on_progress)
      );
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v2 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v2;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
      heap[stack_pointer++] = undefined;
    }
  }
  /**
   * Create a new context by deriving keys from a 32-byte seed.
   * Automatically pre-warms the Bulletproofs generator table (32768 entries)
   * on first context creation so rayon threads don't contend on expansion.
   * @param {Uint8Array} seed
   */
  constructor(seed) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(seed, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_new(retptr, ptr0, len0);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      this.__wbg_ptr = r0 >>> 0;
      PvacContextFinalization.register(this, this.__wbg_ptr, this);
      return this;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Compute a Pedersen commitment: amount * B + blinding * B_blinding.
   * Returns 32-byte compressed Ristretto point.
   * @param {bigint} amount
   * @param {Uint8Array} blinding
   * @returns {Uint8Array}
   */
  pedersen_commit(amount, blinding) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(blinding, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      wasm.pvaccontext_pedersen_commit(retptr, this.__wbg_ptr, amount, ptr0, len0);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeObject(r2);
      }
      var v2 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v2;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Return the number of threads in the rayon thread pool.
   * Returns 0 if rayon is not initialized or not available.
   * @returns {number}
   */
  rayon_thread_count() {
    const ret = wasm.pvaccontext_rayon_thread_count(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * Serialize the public key to bytes.
   * @returns {Uint8Array}
   */
  serialize_pubkey() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.pvaccontext_serialize_pubkey(retptr, this.__wbg_ptr);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var v1 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Serialize the secret key to bytes.
   * @returns {Uint8Array}
   */
  serialize_seckey() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.pvaccontext_serialize_seckey(retptr, this.__wbg_ptr);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var v1 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Verify an aggregated range proof against a ciphertext.
   * @param {Uint8Array} cipher_bytes
   * @param {Uint8Array} proof_bytes
   * @returns {boolean}
   */
  verify_aggregated_range_proof(cipher_bytes, proof_bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      const ptr1 = passArray8ToWasm0(proof_bytes, wasm.__wbindgen_export3);
      const len1 = WASM_VECTOR_LEN;
      wasm.pvaccontext_verify_aggregated_range_proof(
        retptr,
        this.__wbg_ptr,
        ptr0,
        len0,
        ptr1,
        len1
      );
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return r0 !== 0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Verify a bound zero proof against a ciphertext and Pedersen commitment.
   * `commitment` must be 32 bytes (compressed Ristretto point).
   * Proof bytes must be in RAW format (no PVAC header), matching the C API.
   * Returns true if the proof is valid, false otherwise.
   * @param {Uint8Array} cipher_bytes
   * @param {Uint8Array} proof_bytes
   * @param {Uint8Array} commitment
   * @returns {boolean}
   */
  verify_bound_proof(cipher_bytes, proof_bytes, commitment) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      const ptr1 = passArray8ToWasm0(proof_bytes, wasm.__wbindgen_export3);
      const len1 = WASM_VECTOR_LEN;
      const ptr2 = passArray8ToWasm0(commitment, wasm.__wbindgen_export3);
      const len2 = WASM_VECTOR_LEN;
      wasm.pvaccontext_verify_bound_proof(
        retptr,
        this.__wbg_ptr,
        ptr0,
        len0,
        ptr1,
        len1,
        ptr2,
        len2
      );
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return r0 !== 0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Auto-detect proof format (standard or aggregated) and verify.
   * @param {Uint8Array} cipher_bytes
   * @param {Uint8Array} proof_bytes
   * @returns {boolean}
   */
  verify_range_any(cipher_bytes, proof_bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      const ptr1 = passArray8ToWasm0(proof_bytes, wasm.__wbindgen_export3);
      const len1 = WASM_VECTOR_LEN;
      wasm.pvaccontext_verify_range_any(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return r0 !== 0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Verify a range proof against a ciphertext.
   * Both arguments are serialized bytes.
   * Returns true if the proof is valid, false otherwise.
   * @param {Uint8Array} cipher_bytes
   * @param {Uint8Array} proof_bytes
   * @returns {boolean}
   */
  verify_range_proof(cipher_bytes, proof_bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
      const len0 = WASM_VECTOR_LEN;
      const ptr1 = passArray8ToWasm0(proof_bytes, wasm.__wbindgen_export3);
      const len1 = WASM_VECTOR_LEN;
      wasm.pvaccontext_verify_range_proof(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return r0 !== 0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
if (Symbol.dispose) PvacContext.prototype[Symbol.dispose] = PvacContext.prototype.free;

/**
 * @param {number} num_threads
 * @returns {Promise<any>}
 */
export function initThreadPool(num_threads) {
  const ret = wasm.initThreadPool(num_threads);
  return takeObject(ret);
}

/**
 * Compute AES-256 KAT matching the C++ `pvac_aes_kat()` function:
 * 1. SHA-256("pvac.aes.kat.key") → 32-byte AES key
 * 2. AesCtr256(key, nonce=0) → next_u64() twice → 16 bytes
 * Returns lowercase hex (32 chars).
 * @returns {string}
 */
export function pvac_compute_aes_kat() {
  let deferred1_0;
  let deferred1_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    wasm.pvac_compute_aes_kat(retptr);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred1_0 = r0;
    deferred1_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export2(deferred1_0, deferred1_1, 1);
  }
}

/**
 * Deserialize a public key from bytes (standalone function).
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export function pvac_deserialize_pubkey(data) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export3);
    const len0 = WASM_VECTOR_LEN;
    wasm.pvac_deserialize_pubkey(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    if (r3) {
      throw takeObject(r2);
    }
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export2(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

/**
 * Deserialize a secret key from bytes (standalone function).
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export function pvac_deserialize_seckey(data) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export3);
    const len0 = WASM_VECTOR_LEN;
    wasm.pvac_deserialize_seckey(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    if (r3) {
      throw takeObject(r2);
    }
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export2(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

/**
 * Encode serialized cipher bytes as "hfhe_v1|<base64>".
 * Matches cli.py `encode_cipher()`.
 * @param {Uint8Array} cipher_bytes
 * @returns {string}
 */
export function pvac_encode_cipher(cipher_bytes) {
  let deferred2_0;
  let deferred2_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(cipher_bytes, wasm.__wbindgen_export3);
    const len0 = WASM_VECTOR_LEN;
    wasm.pvac_encode_cipher(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred2_0 = r0;
    deferred2_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export2(deferred2_0, deferred2_1, 1);
  }
}

/**
 * Encode serialized range proof bytes as "rp_v1|<base64>".
 * Matches cli.py `encode_range_proof()`.
 * @param {Uint8Array} proof_bytes
 * @returns {string}
 */
export function pvac_encode_range_proof(proof_bytes) {
  let deferred2_0;
  let deferred2_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(proof_bytes, wasm.__wbindgen_export3);
    const len0 = WASM_VECTOR_LEN;
    wasm.pvac_encode_range_proof(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred2_0 = r0;
    deferred2_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export2(deferred2_0, deferred2_1, 1);
  }
}

/**
 * Encode serialized zero proof bytes as "zkzp_v2|<base64>".
 * Matches cli.py `encode_zero_proof()`.
 * @param {Uint8Array} proof_bytes
 * @returns {string}
 */
export function pvac_encode_zero_proof(proof_bytes) {
  let deferred2_0;
  let deferred2_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(proof_bytes, wasm.__wbindgen_export3);
    const len0 = WASM_VECTOR_LEN;
    wasm.pvac_encode_zero_proof(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred2_0 = r0;
    deferred2_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export2(deferred2_0, deferred2_1, 1);
  }
}

/**
 * Pre-compute Bulletproofs generator table up to `n` entries.
 * Call this during WASM init to front-load the hash-to-point cost.
 * Rayon threads can then read generators concurrently without contention.
 * @param {number} n
 */
export function pvac_pre_warm_generators(n) {
  wasm.pvac_pre_warm_generators(n);
}

export class wbg_rayon_PoolBuilder {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(wbg_rayon_PoolBuilder.prototype);
    obj.__wbg_ptr = ptr;
    wbg_rayon_PoolBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    wbg_rayon_PoolBuilderFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 0);
  }
  build() {
    wasm.wbg_rayon_poolbuilder_build(this.__wbg_ptr);
  }
  /**
   * @returns {string}
   */
  mainJS() {
    const ret = wasm.wbg_rayon_poolbuilder_mainJS(this.__wbg_ptr);
    return takeObject(ret);
  }
  /**
   * @returns {number}
   */
  numThreads() {
    const ret = wasm.wbg_rayon_poolbuilder_numThreads(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  receiver() {
    const ret = wasm.wbg_rayon_poolbuilder_receiver(this.__wbg_ptr);
    return ret >>> 0;
  }
}
if (Symbol.dispose)
  wbg_rayon_PoolBuilder.prototype[Symbol.dispose] = wbg_rayon_PoolBuilder.prototype.free;

/**
 * @param {number} receiver
 */
export function wbg_rayon_start_worker(receiver) {
  wasm.wbg_rayon_start_worker(receiver);
}

function __wbg_get_imports(memory) {
  const import0 = {
    __proto__: null,
    __wbg___wbindgen_is_function_0095a73b8b156f76: function (arg0) {
      const ret = typeof getObject(arg0) === 'function';
      return ret;
    },
    __wbg___wbindgen_is_object_5ae8e5880f2c1fbd: function (arg0) {
      const val = getObject(arg0);
      const ret = typeof val === 'object' && val !== null;
      return ret;
    },
    __wbg___wbindgen_is_string_cd444516edc5b180: function (arg0) {
      const ret = typeof getObject(arg0) === 'string';
      return ret;
    },
    __wbg___wbindgen_is_undefined_9e4d92534c42d778: function (arg0) {
      const ret = getObject(arg0) === undefined;
      return ret;
    },
    __wbg___wbindgen_memory_bd1fbcf21fbef3c8: function () {
      const ret = wasm.memory;
      return addHeapObject(ret);
    },
    __wbg___wbindgen_module_f6b8052d79c1cc16: function () {
      const ret = wasmModule;
      return addHeapObject(ret);
    },
    __wbg___wbindgen_throw_be289d5034ed271b: function (arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg_call_389efe28435a9388: function () {
      return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
      }, arguments);
    },
    __wbg_call_4708e0c13bdc8e95: function () {
      return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
      }, arguments);
    },
    __wbg_call_812d25f1510c13c8: function () {
      return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2), getObject(arg3));
        return addHeapObject(ret);
      }, arguments);
    },
    __wbg_crypto_86f2631e91b51511: function (arg0) {
      const ret = getObject(arg0).crypto;
      return addHeapObject(ret);
    },
    __wbg_getRandomValues_b3f15fcbfabb0f8b: function () {
      return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
      }, arguments);
    },
    __wbg_get_9b94d73e6221f75c: function (arg0, arg1) {
      const ret = getObject(arg0)[arg1 >>> 0];
      return addHeapObject(ret);
    },
    __wbg_instanceof_Uint8Array_9b9075935c74707c: function (arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof Uint8Array;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_instanceof_Window_ed49b2db8df90359: function (arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof Window;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_length_32ed9a279acd054c: function (arg0) {
      const ret = getObject(arg0).length;
      return ret;
    },
    __wbg_length_35a7bace40f36eac: function (arg0) {
      const ret = getObject(arg0).length;
      return ret;
    },
    __wbg_log_6b5ca2e6124b2808: function (arg0) {
      console.log(getObject(arg0));
    },
    __wbg_msCrypto_d562bbe83e0d4b91: function (arg0) {
      const ret = getObject(arg0).msCrypto;
      return addHeapObject(ret);
    },
    __wbg_new_no_args_1c7c842f08d00ebb: function (arg0, arg1) {
      const source = getStringFromWasm0(arg0, arg1);
      if (source !== 'return this') {
        throw new Error('Dynamic function creation is disabled by octra-ts');
      }
      const ret = function () {
        return globalThis;
      };
      return addHeapObject(ret);
    },
    __wbg_new_with_length_a2c39cbe88fd8ff1: function (arg0) {
      const ret = new Uint8Array(arg0 >>> 0);
      return addHeapObject(ret);
    },
    __wbg_node_e1f24f89a7336c2e: function (arg0) {
      const ret = getObject(arg0).node;
      return addHeapObject(ret);
    },
    __wbg_now_a3af9a2f4bbaa4d1: function () {
      const ret = Date.now();
      return ret;
    },
    __wbg_process_3975fd6c72f520aa: function (arg0) {
      const ret = getObject(arg0).process;
      return addHeapObject(ret);
    },
    __wbg_prototypesetcall_bdcdcc5842e4d77d: function (arg0, arg1, arg2) {
      Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
    },
    __wbg_randomFillSync_f8c153b79f285817: function () {
      return handleError(function (arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
      }, arguments);
    },
    __wbg_require_b74f47fc2d022fd6: function () {
      return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
      }, arguments);
    },
    __wbg_startWorkers_2329d931beb7bef4: function (arg0, arg1, arg2) {
      const ret = startWorkers(
        takeObject(arg0),
        takeObject(arg1),
        wbg_rayon_PoolBuilder.__wrap(arg2)
      );
      return addHeapObject(ret);
    },
    __wbg_static_accessor_GLOBAL_12837167ad935116: function () {
      const ret = typeof global === 'undefined' ? null : global;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    },
    __wbg_static_accessor_GLOBAL_THIS_e628e89ab3b1c95f: function () {
      const ret = typeof globalThis === 'undefined' ? null : globalThis;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    },
    __wbg_static_accessor_SELF_a621d3dfbb60d0ce: function () {
      const ret = typeof self === 'undefined' ? null : self;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    },
    __wbg_static_accessor_URL_151cb8815849ce83: function () {
      const ret = import.meta.url;
      return addHeapObject(ret);
    },
    __wbg_static_accessor_WINDOW_f8727f0cf888e0bd: function () {
      const ret = typeof window === 'undefined' ? null : window;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    },
    __wbg_subarray_a96e1fef17ed23cb: function (arg0, arg1, arg2) {
      const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
      return addHeapObject(ret);
    },
    __wbg_versions_4e31226f5e8dc909: function (arg0) {
      const ret = getObject(arg0).versions;
      return addHeapObject(ret);
    },
    __wbindgen_cast_0000000000000001: function (arg0) {
      // Cast intrinsic for `F64 -> Externref`.
      const ret = arg0;
      return addHeapObject(ret);
    },
    __wbindgen_cast_0000000000000002: function (arg0, arg1) {
      // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
      const ret = getArrayU8FromWasm0(arg0, arg1);
      return addHeapObject(ret);
    },
    __wbindgen_cast_0000000000000003: function (arg0, arg1) {
      // Cast intrinsic for `Ref(String) -> Externref`.
      const ret = getStringFromWasm0(arg0, arg1);
      return addHeapObject(ret);
    },
    __wbindgen_object_clone_ref: function (arg0) {
      const ret = getObject(arg0);
      return addHeapObject(ret);
    },
    __wbindgen_object_drop_ref: function (arg0) {
      takeObject(arg0);
    },
    memory: memory || new WebAssembly.Memory({ initial: 18, maximum: 16384, shared: true }),
  };
  return {
    __proto__: null,
    './pvac_rs_bg.js': import0,
  };
}

const PvacContextFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_pvaccontext_free(ptr >>> 0, 1));
const wbg_rayon_PoolBuilderFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_wbg_rayon_poolbuilder_free(ptr >>> 0, 1));

function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];

  heap[idx] = obj;
  return idx;
}

function addBorrowedObject(obj) {
  if (stack_pointer == 1) throw new Error('out of js stack');
  heap[--stack_pointer] = obj;
  return stack_pointer;
}

function dropObject(idx) {
  if (idx < 132) return;
  heap[idx] = heap_next;
  heap_next = idx;
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.buffer !== wasm.memory.buffer) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function getObject(idx) {
  return heap[idx];
}

function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    wasm.__wbindgen_export(addHeapObject(e));
  }
}

let heap = new Array(128).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
  return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

let stack_pointer = 128;

function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}

let cachedTextDecoder =
  typeof TextDecoder !== 'undefined'
    ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true })
    : undefined;
if (cachedTextDecoder) cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(getUint8ArrayMemory0().slice(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module, thread_stack_size) {
  wasm = instance.exports;
  wasmModule = module;
  cachedDataViewMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  if (
    typeof thread_stack_size !== 'undefined' &&
    (typeof thread_stack_size !== 'number' ||
      thread_stack_size === 0 ||
      thread_stack_size % 65536 !== 0)
  ) {
    throw 'invalid stack size';
  }
  wasm.__wbindgen_start(thread_stack_size);
  return wasm;
}

async function __wbg_load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse = module.ok && expectedResponseType(module.type);

        if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
          console.warn(
            '`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
            e
          );
        } else {
          throw e;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);

    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }

  function expectedResponseType(type) {
    switch (type) {
      case 'basic':
      case 'cors':
      case 'default':
        return true;
    }
    return false;
  }
}

function initSync(module, memory) {
  if (wasm !== undefined) return wasm;

  let thread_stack_size;
  if (module !== undefined) {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module, memory, thread_stack_size } = module);
    } else {
      console.warn('using deprecated parameters for `initSync()`; pass a single object instead');
    }
  }

  const imports = __wbg_get_imports(memory);
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module, thread_stack_size);
}

async function __wbg_init(module_or_path, memory) {
  if (wasm !== undefined) return wasm;

  let thread_stack_size;
  if (module_or_path !== undefined) {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path, memory, thread_stack_size } = module_or_path);
    } else {
      console.warn(
        'using deprecated parameters for the initialization function; pass a single object instead'
      );
    }
  }

  if (module_or_path === undefined) {
    module_or_path = new URL('pvac_rs_bg.wasm', import.meta.url);
  }
  const imports = __wbg_get_imports(memory);

  if (
    typeof module_or_path === 'string' ||
    (typeof Request === 'function' && module_or_path instanceof Request) ||
    (typeof URL === 'function' && module_or_path instanceof URL)
  ) {
    module_or_path = fetch(module_or_path);
  }

  const { instance, module } = await __wbg_load(await module_or_path, imports);

  return __wbg_finalize_init(instance, module, thread_stack_size);
}

export { initSync, __wbg_init as default };
