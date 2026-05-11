/** Raw FHE ciphertext bytes. */
export type Cipher = Uint8Array;

/** Range proof bytes proving value >= 0 without revealing it. */
export type RangeProof = Uint8Array;

export type BoundProof = {
  proof: Uint8Array;
  commitment: Uint8Array;
  blinding: Uint8Array;
};

export type PedersenCommitment = {
  commitment: Uint8Array;
  blinding: Uint8Array;
};

export type EncryptResult = {
  cipher: Cipher;
  cipherB64: string;
  boundProof: BoundProof;
  boundProofEncoded: string;
};

export type EncryptPayload = {
  cipher: string;
  amount_commitment: string;
  zero_proof: string;
  blinding: string;
};

export type DecryptPayload = EncryptPayload & {
  range_proof_balance: string;
};

export type PvacWasmModule = {
  PvacContext: new (seed: Uint8Array) => PvacWasmContext;
  initThreadPool: (numThreads: number) => Promise<unknown>;
  pvac_pre_warm_generators: (n: number) => void;
  pvac_encode_cipher: (cipherBytes: Uint8Array) => string;
  pvac_encode_range_proof: (proofBytes: Uint8Array) => string;
  pvac_encode_zero_proof: (proofBytes: Uint8Array) => string;
  pvac_compute_aes_kat: () => string;
  pvac_deserialize_pubkey: (data: Uint8Array) => Uint8Array;
};

export type PvacWasmContext = {
  free: () => void;
  encrypt: (value: bigint) => Uint8Array;
  encrypt_seeded: (value: bigint, seed: Uint8Array) => Uint8Array;
  encrypt_zero: () => Uint8Array;
  encrypt_zero_seeded: (seed: Uint8Array) => Uint8Array;
  decrypt: (cipherBytes: Uint8Array) => bigint;
  commit: (cipherBytes: Uint8Array) => Uint8Array;
  ct_add: (a: Uint8Array, b: Uint8Array) => Uint8Array;
  ct_sub: (a: Uint8Array, b: Uint8Array) => Uint8Array;
  serialize_pubkey: () => Uint8Array;
  make_range_proof: (cipherBytes: Uint8Array, value: bigint) => Uint8Array;
  make_range_proof_parallel: (cipherBytes: Uint8Array, value: bigint) => Uint8Array;
  make_aggregated_range_proof: (cipherBytes: Uint8Array, value: bigint) => Uint8Array;
  make_bound_proof: (cipherBytes: Uint8Array, amount: bigint, blinding: Uint8Array) => Uint8Array;
  pedersen_commit: (amount: bigint, blinding: Uint8Array) => Uint8Array;
  verify_range_proof: (cipherBytes: Uint8Array, proofBytes: Uint8Array) => boolean;
  verify_range_any: (cipherBytes: Uint8Array, proofBytes: Uint8Array) => boolean;
  verify_aggregated_range_proof: (cipherBytes: Uint8Array, proofBytes: Uint8Array) => boolean;
  verify_bound_proof: (cipherBytes: Uint8Array, proofBytes: Uint8Array, commitment: Uint8Array) => boolean;
  rayon_thread_count: () => number;
  diagnose_proof: (proofBytes: Uint8Array) => string;
  diagnose_cipher: (cipherBytes: Uint8Array) => string;
};
