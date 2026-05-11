export type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export type OctraAddress = `oct${string}`;
export type ContractAddress = string;
export type TransactionHash = string;
export type Base64 = string;
export type Hex = string;
export type RawAmount = string;

export type OperationType =
  | 'standard'
  | 'stealth'
  | 'encrypt'
  | 'decrypt'
  | 'key_switch'
  | 'call'
  | 'deploy'
  | 'upgrade'
  | string;

export type Chain = {
  id: string;
  name: string;
  rpcUrls: {
    default: {
      http: readonly string[];
    };
  };
};

export type NodeVersion = {
  node: string;
  version: string;
  protocol: string;
};

export type NodeStatus = {
  epoch: number;
  validator: string;
  roots: number;
  timestamp: number;
  network_version: string;
};

export type NodeStats = {
  total_accounts: number;
  active_accounts: number;
  total_supply: string;
  total_supply_raw: RawAmount;
  max_supply: string;
  max_supply_raw: RawAmount;
  supply_remaining: string;
  supply_pct: number;
  total_transactions: number;
  recent_tx_count: number;
  staging_size: number;
  latest_epochs: number[];
};

export type Balance = {
  address: OctraAddress;
  balance: string;
  balance_raw: RawAmount;
  nonce: number;
  pending_nonce: number;
  has_public_key: boolean;
};

export type AccountOverview = {
  address: OctraAddress;
  balance: string;
  balance_raw: RawAmount;
  nonce: number;
  has_public_key: boolean;
  has_encrypted_balance: boolean;
  tx_count: number;
  recent_txs: JsonObject[];
  rejected_txs: JsonObject[];
};

export type Nonce = {
  address: OctraAddress;
  nonce: number;
};

export type PublicKey = {
  address: OctraAddress;
  public_key: Base64;
};

export type AddressValidation = {
  address: string;
  valid: boolean;
  error: string | null;
};

export type Supply = {
  total_supply: string;
  total_supply_raw: RawAmount;
  max_supply: string;
  max_supply_raw: RawAmount;
  burned: string;
};

export type UnsignedTransaction = {
  from: OctraAddress;
  to: string;
  amount: RawAmount | bigint | number;
  nonce: number;
  ou: RawAmount | bigint | number;
  timestamp?: number;
  opType?: OperationType;
  encryptedData?: string;
  message?: string;
};

export type NormalizedTransaction = {
  from: OctraAddress;
  to_: string;
  amount: RawAmount;
  nonce: number;
  ou: RawAmount;
  timestamp: number;
  op_type: OperationType;
  encrypted_data?: string;
  message?: string;
};

export type SignedTransaction = NormalizedTransaction & {
  signature: Base64;
  public_key: Base64;
};

export type SubmitResult = {
  tx_hash: TransactionHash;
  status: string;
  nonce: number;
  ou_cost: string;
};

export type SubmitBatchResult = {
  total: number;
  accepted: number;
  rejected: number;
  results: JsonObject[];
};

export type Transaction = {
  status: 'pending' | 'confirmed' | 'rejected' | 'dropped' | string;
  tx_hash: TransactionHash;
  epoch: number | null;
  from: OctraAddress;
  to: string;
  amount: string;
  amount_raw: RawAmount;
  nonce: number;
  ou: string;
  timestamp: number;
  op_type: OperationType;
  message?: string;
  [key: string]: Json | undefined;
};

export type RecentTransactions = {
  count: number;
  transactions: JsonObject[];
  rejected: JsonObject[];
};

export type Transactions = {
  count: number;
  transactions: JsonObject[];
};

export type TransactionsByAddress = {
  address: OctraAddress;
  total: number;
  count: number;
  offset: number;
  limit: number;
  has_more: boolean;
  transactions: JsonObject[];
  rejected: JsonObject[];
};

export type TransactionsByEpoch = {
  epoch_id: number;
  count: number;
  offset: number;
  limit: number;
  has_more: boolean;
  transactions: JsonObject[];
  rejected: JsonObject[];
};

export type TotalTransactions = {
  confirmed: number;
  staging: number;
  total: number;
};

export type SearchResult = {
  type: 'transaction' | 'account' | 'epoch' | string;
  status?: string;
  hash?: TransactionHash;
  address?: OctraAddress;
  epoch_id?: number;
  [key: string]: Json | undefined;
};

export type CurrentEpoch = {
  epoch_id: number;
  roots: number;
};

export type Epoch = {
  epoch_id: number;
  tx_count: number;
  finalized_by: string;
  finalized_at: number;
  parent_commit: string;
  state_root: string;
  tree_hash: string;
};

export type EpochList = {
  total: number;
  epochs: number[];
  has_more: boolean;
};

export type RecommendedFee = {
  minimum: string;
  base_fee: string;
  recommended: string;
  fast: string;
  staging_size: number;
  staging_ou: string;
  epoch_capacity: string;
  usage_pct: number;
};

export type StagingView = {
  count: number;
  transactions: JsonObject[];
};

export type StagingStats = {
  total_transactions: number;
  total_ou: string;
  max_ou: string;
  ou_remaining: string;
  by_sender: JsonObject[];
};

export type StagingEstimateOu = {
  staging_size: number;
  p50: string;
  p75: string;
  p95: string;
  recommended: string;
  staging_ou: string;
  epoch_capacity: string;
};

export type StagingRemoveResult = {
  removed: boolean;
  tx_hash: TransactionHash;
};

export type Contract = {
  address: ContractAddress;
  version: string;
  code_hash: string;
  balance: RawAmount;
  owner: OctraAddress;
};

export type ContractAbi = {
  address: ContractAddress;
  abi?: Json;
  methods?: JsonObject[];
  instruction_count: number;
};

export type ContractStorage = {
  key: string;
  value: string | null;
};

export type ContractList = {
  contracts: Contract[];
  count: number;
};

export type ContractReceipt = {
  contract: ContractAddress;
  method: string;
  success: boolean;
  effort: number;
  events: Json;
  error: string | null;
  epoch: number;
  ts: number;
};

export type ContractCallResult<T = Json> = {
  result: T;
};

export type ComputeContractAddressResult = {
  address: ContractAddress;
  deployer: OctraAddress;
  nonce: number;
};

export type CompileAssemblyResult = {
  bytecode: Base64;
  size: number;
  instructions: number;
};

export type CompileAmlResult = CompileAssemblyResult & {
  abi: string;
  version: string;
  disasm: string;
};

export type AmlFile = {
  path: string;
  source: string;
};

export type ContractVerifyResult = {
  verified: boolean;
  code_hash: string;
};

export type ContractSaveAbiResult = {
  saved: boolean;
};

export type ContractSourceResult = {
  source: string | null;
  files: JsonObject;
};

export type RegisterPublicKeyResult = {
  ok: boolean;
  address: OctraAddress;
};

export type RegisterPvacPubkeyResult = {
  address: OctraAddress;
  pubkey_size: number;
  pubkey_format: string;
  status: string;
};

export type PvacPubkey = {
  address: OctraAddress;
  pvac_pubkey: Base64 | null;
  pubkey_size?: number;
};

export type EncryptedCipher = {
  address: OctraAddress;
  cipher: string;
  cipher_type: 'pvac_fhe' | 'legacy_aes_gcm' | 'none' | string;
};

export type EncryptedBalance = {
  address: OctraAddress;
  cipher: string;
  has_pvac_pubkey: boolean;
};

export type PrivateTransferResult = {
  tx_hash: TransactionHash;
  status: string;
};

export type ViewPubkey = {
  address: OctraAddress;
  view_pubkey: Base64 | null;
  reason?: string;
};

export type StealthOutputs = {
  from_epoch: number;
  count: number;
  outputs: JsonObject[];
};

export type OctraRpcSchema = {
  node_version: { params: []; result: NodeVersion };
  node_status: { params: []; result: NodeStatus };
  node_stats: { params: []; result: NodeStats };
  node_metrics: { params: []; result: { metrics: JsonObject } };
  octra_balance: { params: [address: OctraAddress]; result: Balance };
  octra_account: { params: [address: OctraAddress, limit?: number]; result: AccountOverview };
  octra_nonce: { params: [address: OctraAddress]; result: Nonce };
  octra_publicKey: { params: [address: OctraAddress]; result: PublicKey };
  octra_validateAddress: { params: [address: string]; result: AddressValidation };
  octra_supply: { params: []; result: Supply };
  octra_submit: { params: [tx: SignedTransaction]; result: SubmitResult };
  octra_submitBatch: { params: [transactions: SignedTransaction[]]; result: SubmitBatchResult };
  octra_transaction: { params: [hash: TransactionHash]; result: Transaction };
  octra_recentTransactions: { params: [limit?: number, offset?: number]; result: RecentTransactions };
  octra_transactions: { params: [epochId?: number, limit?: number]; result: Transactions };
  octra_transactionsByAddress: {
    params: [address: OctraAddress, limit?: number, offset?: number];
    result: TransactionsByAddress;
  };
  octra_transactionsByEpoch: {
    params: [epochId: number, limit?: number, offset?: number];
    result: TransactionsByEpoch;
  };
  octra_totalTransactions: { params: []; result: TotalTransactions };
  octra_search: { params: [query: string]; result: SearchResult };
  epoch_current: { params: []; result: CurrentEpoch };
  epoch_get: { params: [epochId: number]; result: Epoch };
  epoch_list: { params: [limit?: number, offset?: number]; result: EpochList };
  epoch_summaries: { params: [epochIds: number[]]; result: Epoch[] };
  octra_recommendedFee: { params: [opType?: OperationType]; result: RecommendedFee };
  staging_view: { params: []; result: StagingView };
  staging_stats: { params: []; result: StagingStats };
  staging_estimateOu: { params: []; result: StagingEstimateOu };
  staging_remove: { params: [txHash: TransactionHash]; result: StagingRemoveResult };
  vm_contract: { params: [address: ContractAddress]; result: Contract };
  octra_contractAbi: { params: [address: ContractAddress]; result: ContractAbi };
  octra_contractStorage: { params: [address: ContractAddress, key: string]; result: ContractStorage };
  octra_listContracts: { params: []; result: ContractList };
  contract_receipt: { params: [hash: TransactionHash]; result: ContractReceipt };
  contract_call: {
    params: [address: ContractAddress, method: string, params?: Json[], caller?: OctraAddress];
    result: ContractCallResult;
  };
  octra_computeContractAddress: {
    params: [bytecodeB64: Base64, deployer: OctraAddress, nonce?: number];
    result: ComputeContractAddressResult;
  };
  octra_compileAssembly: { params: [source: string]; result: CompileAssemblyResult };
  octra_compileAml: { params: [source: string]; result: CompileAmlResult };
  octra_compileAmlMulti: {
    params: [project: { files: AmlFile[]; main: string }];
    result: CompileAmlResult;
  };
  contract_verify: {
    params: [address: ContractAddress, source: string, files?: AmlFile[]];
    result: ContractVerifyResult;
  };
  contract_saveAbi: { params: [address: ContractAddress, abi: string]; result: ContractSaveAbiResult };
  contract_source: { params: [address: ContractAddress]; result: ContractSourceResult };
  octra_registerPublicKey: {
    params: [address: OctraAddress, publicKey: Base64, signature: Base64];
    result: RegisterPublicKeyResult;
  };
  octra_registerPvacPubkey: {
    params: [address: OctraAddress, pubkeyBlob: Base64, signature: Base64, publicKey: Base64, aesKat?: Hex];
    result: RegisterPvacPubkeyResult;
  };
  octra_pvacPubkey: { params: [address: OctraAddress]; result: PvacPubkey };
  octra_encryptedCipher: { params: [address: OctraAddress]; result: EncryptedCipher };
  octra_encryptedBalance: {
    params: [address: OctraAddress, signature: Base64, publicKey: Base64];
    result: EncryptedBalance;
  };
  octra_privateTransfer: { params: [tx: SignedTransaction]; result: PrivateTransferResult };
  octra_viewPubkey: { params: [address: OctraAddress]; result: ViewPubkey };
  octra_stealthOutputs: { params: [fromEpoch?: number]; result: StealthOutputs };
};

export type RpcMethod = keyof OctraRpcSchema;
export type RpcParameters<method extends RpcMethod> = OctraRpcSchema[method]['params'];
export type RpcResult<method extends RpcMethod> = OctraRpcSchema[method]['result'];

export type RpcRequest<method extends RpcMethod = RpcMethod> = {
  method: method;
  params?: RpcParameters<method>;
  signal?: AbortSignal;
};

export type Transport = {
  key: string;
  name: string;
  request: <result = unknown>(request: {
    method: string;
    params?: readonly unknown[];
    signal?: AbortSignal;
  }) => Promise<result>;
  requestBatch?: <result = unknown>(
    requests: readonly { method: string; params?: readonly unknown[]; signal?: AbortSignal }[],
  ) => Promise<result[]>;
};

export type Client = {
  chain?: Chain;
  transport: Transport;
  request: <method extends RpcMethod>(
    request: RpcRequest<method>,
  ) => Promise<RpcResult<method>>;
  extend: <extension>(
    extender: (client: Client) => extension,
  ) => Client & extension;
};

export type SignableMessage = string | Uint8Array;

export type Account = {
  address: OctraAddress;
  publicKey: Base64;
  signMessage: (parameters: { message: SignableMessage }) => Promise<Base64>;
  signTransaction: (transaction: UnsignedTransaction) => Promise<SignedTransaction>;
  signEncryptedBalanceRequest: (address?: OctraAddress) => Promise<Base64>;
  signRegisterPublicKeyRequest: (address?: OctraAddress) => Promise<Base64>;
  signRegisterPvacPubkeyRequest: (parameters: { pubkeyBlob: Base64 | Uint8Array; address?: OctraAddress }) => Promise<Base64>;
};
