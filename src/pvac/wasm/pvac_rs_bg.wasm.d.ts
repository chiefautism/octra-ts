/* tslint:disable */
/* eslint-disable */
export const __wbg_pvaccontext_free: (a: number, b: number) => void;
export const pvac_deserialize_pubkey: (a: number, b: number) => [number, number, number, number];
export const pvac_deserialize_seckey: (a: number, b: number) => [number, number, number, number];
export const pvac_encode_cipher: (a: number, b: number) => [number, number];
export const pvac_encode_range_proof: (a: number, b: number) => [number, number];
export const pvac_encode_zero_proof: (a: number, b: number) => [number, number];
export const pvaccontext_assemble_range_proof: (
  a: number,
  b: number,
  c: number,
  d: any
) => [number, number, number, number];
export const pvaccontext_commit: (
  a: number,
  b: number,
  c: number
) => [number, number, number, number];
export const pvaccontext_ct_add: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number, number, number];
export const pvaccontext_ct_sub: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number, number, number];
export const pvaccontext_decrypt: (a: number, b: number, c: number) => [bigint, number, number];
export const pvaccontext_diagnose_cipher: (
  a: number,
  b: number,
  c: number
) => [number, number, number, number];
export const pvaccontext_diagnose_proof: (
  a: number,
  b: number,
  c: number
) => [number, number, number, number];
export const pvaccontext_encrypt: (a: number, b: bigint) => [number, number, number, number];
export const pvaccontext_encrypt_seeded: (
  a: number,
  b: bigint,
  c: number,
  d: number
) => [number, number, number, number];
export const pvaccontext_encrypt_zero: (a: number) => [number, number, number, number];
export const pvaccontext_encrypt_zero_seeded: (
  a: number,
  b: number,
  c: number
) => [number, number, number, number];
export const pvaccontext_make_bit_proofs_batch: (
  a: number,
  b: bigint,
  c: number,
  d: number,
  e: any
) => [number, number, number, number];
export const pvaccontext_make_bound_proof: (
  a: number,
  b: number,
  c: number,
  d: bigint,
  e: number,
  f: number
) => [number, number, number, number];
export const pvaccontext_make_range_proof: (
  a: number,
  b: number,
  c: number,
  d: bigint
) => [number, number, number, number];
export const pvaccontext_make_range_proof_parallel: (
  a: number,
  b: number,
  c: number,
  d: bigint
) => [number, number, number, number];
export const pvaccontext_make_range_proof_with_progress: (
  a: number,
  b: number,
  c: number,
  d: bigint,
  e: any
) => [number, number, number, number];
export const pvaccontext_new: (a: number, b: number) => [number, number, number];
export const pvaccontext_pedersen_commit: (
  a: number,
  b: bigint,
  c: number,
  d: number
) => [number, number, number, number];
export const pvaccontext_serialize_pubkey: (a: number) => [number, number];
export const pvaccontext_serialize_seckey: (a: number) => [number, number];
export const pvaccontext_verify_bound_proof: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number
) => [number, number, number];
export const pvaccontext_verify_range_proof: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number, number];
export const __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
export const initThreadPool: (a: number) => any;
export const wbg_rayon_poolbuilder_build: (a: number) => void;
export const wbg_rayon_poolbuilder_mainJS: (a: number) => any;
export const wbg_rayon_poolbuilder_numThreads: (a: number) => number;
export const wbg_rayon_poolbuilder_receiver: (a: number) => number;
export const wbg_rayon_start_worker: (a: number) => void;
export const memory: WebAssembly.Memory;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
export const __wbindgen_start: (a: number) => void;
