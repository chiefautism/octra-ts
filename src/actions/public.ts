import type {
  AmlFile,
  Client,
  ContractAddress,
  CurrentEpoch,
  Json,
  JsonObject,
  OctraAddress,
  OperationType,
  RecommendedFee,
  RpcMethod,
  RpcParameters,
  RpcResult,
  StagingView,
  Transaction,
  TransactionHash,
  UnsignedTransaction,
} from '../types.js';
import { toRawAmount } from '../utils/amount.js';
import { defaultTransferOu } from '../utils/transaction.js';

type Tuple = readonly unknown[];

export type FeeSpeed = 'minimum' | 'base' | 'recommended' | 'fast';

const privateOperationMinimumOu = 5_000_000n;

export type EstimateFeeParameters = {
  opType?: OperationType;
  speed?: FeeSpeed;
};

export type EstimateFeeResult = RecommendedFee & {
  fee: string;
  speed: FeeSpeed;
};

export type PrepareTransactionParameters = Omit<UnsignedTransaction, 'amount' | 'nonce' | 'ou'> & {
  amount: bigint | number | string;
  nonce?: number;
  ou?: bigint | number | string;
};

export type SimulateContractParameters = {
  address: ContractAddress;
  method: string;
  params?: Json[];
  caller?: OctraAddress;
};

export type SimulateContractResult<result = Json> = {
  result: result;
  request: {
    address: ContractAddress;
    method: string;
    params: Json[];
  };
};

export type WaitForTransactionParameters = {
  hash: TransactionHash;
  pollingInterval?: number;
  signal?: AbortSignal;
  statuses?: readonly string[];
  timeout?: number;
  onPoll?: (transaction: Transaction) => void;
};

export type WatchEpochParameters = {
  emitImmediately?: boolean;
  onChange: (epoch: CurrentEpoch) => void;
  onError?: (error: unknown) => void;
  pollingInterval?: number;
  signal?: AbortSignal;
};

export type WatchPendingTransactionsParameters = {
  emitImmediately?: boolean;
  onChange: (staging: StagingView) => void;
  onError?: (error: unknown) => void;
  pollingInterval?: number;
  signal?: AbortSignal;
};

export function publicActions(client: Client) {
  const request = <method extends RpcMethod>(
    method: method,
    params: RpcParameters<method>,
  ): Promise<RpcResult<method>> => client.request({ method, params });

  return {
    nodeVersion: () => request('node_version', []),
    nodeStatus: () => request('node_status', []),
    nodeStats: () => request('node_stats', []),
    nodeMetrics: () => request('node_metrics', []),
    getBalance: (parameters: { address: OctraAddress }) => request('octra_balance', [parameters.address]),
    getAccount: (parameters: { address: OctraAddress; limit?: number }) =>
      request('octra_account', compact([parameters.address, parameters.limit]) as RpcParameters<'octra_account'>),
    getNonce: (parameters: { address: OctraAddress }) => request('octra_nonce', [parameters.address]),
    getPublicKey: (parameters: { address: OctraAddress }) => request('octra_publicKey', [parameters.address]),
    validateAddress: (parameters: { address: string }) => request('octra_validateAddress', [parameters.address]),
    getSupply: () => request('octra_supply', []),
    getTransaction: (parameters: { hash: TransactionHash }) => request('octra_transaction', [parameters.hash]),
    getRecentTransactions: (parameters: { limit?: number; offset?: number } = {}) =>
      request('octra_recentTransactions', compact([parameters.limit, parameters.offset]) as RpcParameters<'octra_recentTransactions'>),
    getTransactions: (parameters: { epochId?: number; limit?: number } = {}) =>
      request('octra_transactions', compact([parameters.epochId, parameters.limit]) as RpcParameters<'octra_transactions'>),
    getTransactionsByAddress: (parameters: { address: OctraAddress; limit?: number; offset?: number }) =>
      request(
        'octra_transactionsByAddress',
        compact([parameters.address, parameters.limit, parameters.offset]) as RpcParameters<'octra_transactionsByAddress'>,
      ),
    getTransactionsByEpoch: (parameters: { epochId: number; limit?: number; offset?: number }) =>
      request(
        'octra_transactionsByEpoch',
        compact([parameters.epochId, parameters.limit, parameters.offset]) as RpcParameters<'octra_transactionsByEpoch'>,
      ),
    getTotalTransactions: () => request('octra_totalTransactions', []),
    search: (parameters: { query: string }) => request('octra_search', [parameters.query]),
    getCurrentEpoch: () => request('epoch_current', []),
    getEpoch: (parameters: { epochId: number }) => request('epoch_get', [parameters.epochId]),
    listEpochs: (parameters: { limit?: number; offset?: number } = {}) =>
      request('epoch_list', compact([parameters.limit, parameters.offset]) as RpcParameters<'epoch_list'>),
    getEpochSummaries: (parameters: { epochIds: number[] }) => request('epoch_summaries', [parameters.epochIds]),
    getRecommendedFee: (parameters: { opType?: OperationType } = {}) =>
      request('octra_recommendedFee', compact([parameters.opType]) as RpcParameters<'octra_recommendedFee'>),
    estimateFee: (parameters: EstimateFeeParameters = {}) => estimateFee(client, parameters),
    prepareTransaction: (parameters: PrepareTransactionParameters) => prepareTransaction(client, parameters),
    getStaging: () => request('staging_view', []),
    getStagingStats: () => request('staging_stats', []),
    estimateOu: () => request('staging_estimateOu', []),
    removeStagingTransaction: (parameters: { hash: TransactionHash }) => request('staging_remove', [parameters.hash]),
    getContract: (parameters: { address: ContractAddress }) => request('vm_contract', [parameters.address]),
    getContractAbi: (parameters: { address: ContractAddress }) => request('octra_contractAbi', [parameters.address]),
    getContractStorage: (parameters: { address: ContractAddress; key: string }) =>
      request('octra_contractStorage', [parameters.address, parameters.key]),
    listContracts: () => request('octra_listContracts', []),
    getContractReceipt: (parameters: { hash: TransactionHash }) => request('contract_receipt', [parameters.hash]),
    readContract: <result = Json>(parameters: {
      address: ContractAddress;
      method: string;
      params?: Json[];
      caller?: OctraAddress;
    }) =>
      request(
        'contract_call',
        compact([parameters.address, parameters.method, parameters.params, parameters.caller]) as RpcParameters<'contract_call'>,
      )
        .then((value) => value as { result: result }),
    simulateContract: <result = Json>(parameters: SimulateContractParameters) => simulateContract<result>(client, parameters),
    computeContractAddress: (parameters: { bytecode: string; deployer: OctraAddress; nonce?: number }) =>
      request(
        'octra_computeContractAddress',
        compact([parameters.bytecode, parameters.deployer, parameters.nonce]) as RpcParameters<'octra_computeContractAddress'>,
      ),
    compileAssembly: (parameters: { source: string }) => request('octra_compileAssembly', [parameters.source]),
    compileAml: (parameters: { source: string }) => request('octra_compileAml', [parameters.source]),
    compileAmlMulti: (parameters: { files: AmlFile[]; main: string }) =>
      request('octra_compileAmlMulti', [{ files: parameters.files, main: parameters.main }]),
    verifyContract: (parameters: { address: ContractAddress; source: string; files?: AmlFile[] }) =>
      request('contract_verify', compact([parameters.address, parameters.source, parameters.files]) as RpcParameters<'contract_verify'>),
    saveContractAbi: (parameters: { address: ContractAddress; abi: string }) =>
      request('contract_saveAbi', [parameters.address, parameters.abi]),
    getContractSource: (parameters: { address: ContractAddress }) => request('contract_source', [parameters.address]),
    getPvacPubkey: (parameters: { address: OctraAddress }) => request('octra_pvacPubkey', [parameters.address]),
    getEncryptedCipher: (parameters: { address: OctraAddress }) => request('octra_encryptedCipher', [parameters.address]),
    getEncryptedBalance: (parameters: { address: OctraAddress; signature: string; publicKey: string }) =>
      request('octra_encryptedBalance', [parameters.address, parameters.signature, parameters.publicKey]),
    getViewPubkey: (parameters: { address: OctraAddress }) => request('octra_viewPubkey', [parameters.address]),
    getStealthOutputs: (parameters: { fromEpoch?: number } = {}) =>
      request('octra_stealthOutputs', compact([parameters.fromEpoch]) as RpcParameters<'octra_stealthOutputs'>),
    waitForTransaction: (parameters: WaitForTransactionParameters) => waitForTransaction(client, parameters),
    watchEpoch: (parameters: WatchEpochParameters) => watchEpoch(client, parameters),
    watchPendingTransactions: (parameters: WatchPendingTransactionsParameters) => watchPendingTransactions(client, parameters),
  };
}

export async function estimateFee(
  client: Client,
  parameters: EstimateFeeParameters = {},
): Promise<EstimateFeeResult> {
  const speed = parameters.speed ?? 'recommended';
  const fee = await client.request({
    method: 'octra_recommendedFee',
    params: compact([parameters.opType]) as RpcParameters<'octra_recommendedFee'>,
  });
  return {
    ...fee,
    fee: selectFee(fee, speed),
    speed,
  };
}

export async function prepareTransaction(
  client: Client,
  parameters: PrepareTransactionParameters,
): Promise<UnsignedTransaction> {
  const rawAmount = toRawAmount(parameters.amount);
  const opType = parameters.opType ?? 'standard';
  const nonce = parameters.nonce ?? await getNextNonce(client, parameters.from);
  const ou = parameters.ou
    ? toRawAmount(parameters.ou)
    : await defaultOuForOperation(client, opType, rawAmount);

  return {
    from: parameters.from,
    to: parameters.to,
    amount: rawAmount,
    nonce,
    ou,
    timestamp: parameters.timestamp,
    opType,
    encryptedData: parameters.encryptedData,
    message: parameters.message,
  };
}

export async function simulateContract<result = Json>(
  client: Client,
  parameters: SimulateContractParameters,
): Promise<SimulateContractResult<result>> {
  const response = await client.request({
    method: 'contract_call',
    params: compact([
      parameters.address,
      parameters.method,
      parameters.params,
      parameters.caller,
    ]) as RpcParameters<'contract_call'>,
  });
  return {
    result: response.result as result,
    request: {
      address: parameters.address,
      method: parameters.method,
      params: parameters.params ?? [],
    },
  };
}

export async function waitForTransaction(
  client: Client,
  parameters: WaitForTransactionParameters,
): Promise<Transaction> {
  const pollingInterval = parameters.pollingInterval ?? 2_000;
  const statuses = parameters.statuses ?? ['confirmed', 'rejected', 'dropped'];
  const started = Date.now();

  while (true) {
    throwIfAborted(parameters.signal);
    const transaction = await client.request({
      method: 'octra_transaction',
      params: [parameters.hash],
      signal: parameters.signal,
    });
    parameters.onPoll?.(transaction);
    if (statuses.includes(transaction.status)) return transaction;
    if (parameters.timeout !== undefined && Date.now() - started >= parameters.timeout) {
      throw new Error(`Timed out waiting for transaction ${parameters.hash}`);
    }
    await sleep(pollingInterval, parameters.signal);
  }
}

export function watchEpoch(
  client: Client,
  parameters: WatchEpochParameters,
): () => void {
  let active = true;
  let lastEpoch: number | undefined;
  const emitImmediately = parameters.emitImmediately ?? true;

  void (async () => {
    while (active) {
      try {
        throwIfAborted(parameters.signal);
        const epoch = await client.request({
          method: 'epoch_current',
          params: [],
          signal: parameters.signal,
        });
        if ((emitImmediately && lastEpoch === undefined) || epoch.epoch_id !== lastEpoch) {
          lastEpoch = epoch.epoch_id;
          parameters.onChange(epoch);
        }
      } catch (error) {
        if (!active || isAbortError(error)) return;
        parameters.onError?.(error);
      }
      await sleep(parameters.pollingInterval ?? 2_000, parameters.signal).catch((error) => {
        if (!isAbortError(error)) parameters.onError?.(error);
      });
    }
  })();

  return () => {
    active = false;
  };
}

export function watchPendingTransactions(
  client: Client,
  parameters: WatchPendingTransactionsParameters,
): () => void {
  let active = true;
  let lastFingerprint: string | undefined;
  const emitImmediately = parameters.emitImmediately ?? true;

  void (async () => {
    while (active) {
      try {
        throwIfAborted(parameters.signal);
        const staging = await client.request({
          method: 'staging_view',
          params: [],
          signal: parameters.signal,
        });
        const fingerprint = fingerprintStaging(staging);
        if ((emitImmediately && lastFingerprint === undefined) || fingerprint !== lastFingerprint) {
          lastFingerprint = fingerprint;
          parameters.onChange(staging);
        }
      } catch (error) {
        if (!active || isAbortError(error)) return;
        parameters.onError?.(error);
      }
      await sleep(parameters.pollingInterval ?? 2_000, parameters.signal).catch((error) => {
        if (!isAbortError(error)) parameters.onError?.(error);
      });
    }
  })();

  return () => {
    active = false;
  };
}

async function getNextNonce(client: Client, address: OctraAddress): Promise<number> {
  const balance = await client.request({ method: 'octra_balance', params: [address] });
  return Math.max(balance.pending_nonce ?? balance.nonce, balance.nonce) + 1;
}

async function defaultOuForOperation(
  client: Client,
  opType: OperationType,
  rawAmount: string,
): Promise<string> {
  if (opType === 'standard') return defaultTransferOu(rawAmount);
  return applyOperationMinimumOu(opType, (await estimateFee(client, { opType })).fee);
}

function applyOperationMinimumOu(opType: OperationType, ou: string): string {
  if (opType !== 'stealth' && opType !== 'encrypt' && opType !== 'decrypt') return ou;
  const value = BigInt(ou);
  return value < privateOperationMinimumOu ? privateOperationMinimumOu.toString() : ou;
}

function selectFee(fee: RecommendedFee, speed: FeeSpeed): string {
  if (speed === 'minimum') return fee.minimum;
  if (speed === 'base') return fee.base_fee;
  if (speed === 'fast') return fee.fast;
  return fee.recommended;
}

function fingerprintStaging(staging: StagingView): string {
  return JSON.stringify(staging.transactions.map(transactionFingerprint).sort());
}

function transactionFingerprint(transaction: JsonObject): string {
  const hash = transaction.hash ?? transaction.tx_hash;
  if (typeof hash === 'string') return hash;
  return JSON.stringify(transaction);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(abortError(signal));
    }, { once: true });
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal);
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The operation was aborted', 'AbortError');
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function compact<const values extends Tuple>(values: values): values {
  const output = [...values];
  while (output.length > 0 && output[output.length - 1] === undefined) output.pop();
  return output as unknown as values;
}
