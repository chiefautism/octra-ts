import type {
  Account,
  Client,
  ContractAddress,
  Json,
  OctraAddress,
  SignedTransaction,
  Transaction,
  TransactionHash,
  UnsignedTransaction,
} from '../types.js';
import type { PvacBackend } from '../pvac/index.js';
import { defaultTransferOu } from '../utils/transaction.js';
import { toRawAmount } from '../utils/amount.js';
import { bytesToBase64 } from '../utils/bytes.js';
import {
  estimateFee,
  prepareTransaction,
  waitForTransaction,
  type WaitForTransactionParameters,
} from './public.js';

export type WalletActionsParameters = {
  account?: Account;
  pvac?: PvacBackend;
};

type WaitOptions = Omit<WaitForTransactionParameters, 'hash'>;

type WithWait<result> = result & {
  transaction: Transaction;
};

export function walletActions(client: Client, parameters: WalletActionsParameters = {}) {
  const defaultAccount = parameters.account;
  const defaultPvac = parameters.pvac;
  const accountOrThrow = (account = defaultAccount) => {
    if (!account) throw new Error('A wallet account is required for this action');
    return account;
  };
  const pvacOrThrow = (pvac = defaultPvac) => {
    if (!pvac) throw new Error('A PVAC backend is required for this action');
    return pvac;
  };

  return {
    signTransaction: (parameters: { account?: Account; transaction: UnsignedTransaction }) =>
      accountOrThrow(parameters.account).signTransaction(parameters.transaction),
    submitTransaction: (parameters: { transaction: SignedTransaction }) =>
      client.request({ method: 'octra_submit', params: [parameters.transaction] }),
    submitBatch: (parameters: { transactions: SignedTransaction[] }) =>
      client.request({ method: 'octra_submitBatch', params: [parameters.transactions] }),
    sendTransaction: async (parameters: {
      account?: Account;
      transaction: Omit<UnsignedTransaction, 'from' | 'nonce' | 'ou'> & {
        from?: OctraAddress;
        nonce?: number;
        ou?: bigint | number | string;
      };
    }) => {
      const account = accountOrThrow(parameters.account);
      const unsigned: UnsignedTransaction = parameters.transaction.nonce === undefined || parameters.transaction.ou === undefined
        ? await prepareTransaction(client, {
          ...parameters.transaction,
          from: parameters.transaction.from ?? account.address,
        })
        : {
          ...parameters.transaction,
          from: parameters.transaction.from ?? account.address,
          nonce: parameters.transaction.nonce,
          ou: parameters.transaction.ou,
        };
      const transaction = await account.signTransaction({
        ...unsigned,
      });
      return client.request({ method: 'octra_submit', params: [transaction] });
    },
    sendTransactionAndWait: async (parameters: {
      account?: Account;
      transaction: Omit<UnsignedTransaction, 'from' | 'nonce' | 'ou'> & {
        from?: OctraAddress;
        nonce?: number;
        ou?: bigint | number | string;
      };
      wait?: WaitOptions;
    }) => {
      const submit = await walletActions(client, { account: parameters.account ?? defaultAccount }).sendTransaction({
        account: parameters.account,
        transaction: parameters.transaction,
      });
      return attachWait(client, submit, parameters.wait);
    },
    prepareTransfer: async (parameters: {
      account?: Account;
      to: OctraAddress;
      amount: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
      message?: string;
    }) => {
      const account = accountOrThrow(parameters.account);
      return prepareTransaction(client, {
        from: account.address,
        to: parameters.to,
        amount: parameters.amount,
        nonce: parameters.nonce,
        ou: parameters.ou,
        opType: 'standard',
        message: parameters.message,
      });
    },
    sendTransfer: async (parameters: {
      account?: Account;
      to: OctraAddress;
      amount: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
      message?: string;
    }) => {
      const account = accountOrThrow(parameters.account);
      const rawAmount = toRawAmount(parameters.amount);
      const nonce = parameters.nonce ?? await getNextNonce(client, account.address);
      const transaction = await account.signTransaction({
        from: account.address,
        to: parameters.to,
        amount: rawAmount,
        nonce,
        ou: parameters.ou ? toRawAmount(parameters.ou) : defaultTransferOu(rawAmount),
        opType: 'standard',
        message: parameters.message,
      });
      return client.request({ method: 'octra_submit', params: [transaction] });
    },
    sendTransferAndWait: async (parameters: {
      account?: Account;
      to: OctraAddress;
      amount: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
      message?: string;
      wait?: WaitOptions;
    }) => {
      const submit = await walletActions(client, { account: parameters.account ?? defaultAccount }).sendTransfer(parameters);
      return attachWait(client, submit, parameters.wait);
    },
    deployContract: async (parameters: {
      account?: Account;
      bytecode: string;
      nonce?: number;
      ou?: bigint | number | string;
      params?: Json[];
    }) => {
      const account = accountOrThrow(parameters.account);
      const nonce = parameters.nonce ?? await getNextNonce(client, account.address);
      const addressResult = await client.request({
        method: 'octra_computeContractAddress',
        params: [parameters.bytecode, account.address, nonce],
      });
      const ou = parameters.ou
        ? toRawAmount(parameters.ou)
        : (await estimateFee(client, { opType: 'deploy' })).fee;
      const transaction = await account.signTransaction({
        from: account.address,
        to: addressResult.address,
        amount: '0',
        nonce,
        ou,
        opType: 'deploy',
        encryptedData: parameters.bytecode,
        message: parameters.params ? JSON.stringify(parameters.params) : undefined,
      });
      const submit = await client.request({ method: 'octra_submit', params: [transaction] });
      return { ...submit, contract_address: addressResult.address };
    },
    deployContractAndWait: async (parameters: {
      account?: Account;
      bytecode: string;
      nonce?: number;
      ou?: bigint | number | string;
      params?: Json[];
      wait?: WaitOptions;
    }) => {
      const submit = await walletActions(client, { account: parameters.account ?? defaultAccount }).deployContract(parameters);
      return attachWait(client, submit, parameters.wait);
    },
    writeContract: async (parameters: {
      account?: Account;
      address: ContractAddress;
      method: string;
      params?: Json[];
      amount?: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
    }) => {
      const account = accountOrThrow(parameters.account);
      const nonce = parameters.nonce ?? await getNextNonce(client, account.address);
      const transaction = await account.signTransaction({
        from: account.address,
        to: parameters.address,
        amount: parameters.amount ? toRawAmount(parameters.amount) : '0',
        nonce,
        ou: parameters.ou ? toRawAmount(parameters.ou) : '1000',
        opType: 'call',
        encryptedData: parameters.method,
        message: JSON.stringify(parameters.params ?? []),
      });
      return client.request({ method: 'octra_submit', params: [transaction] });
    },
    writeContractAndWait: async (parameters: {
      account?: Account;
      address: ContractAddress;
      method: string;
      params?: Json[];
      amount?: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
      wait?: WaitOptions;
    }) => {
      const submit = await walletActions(client, { account: parameters.account ?? defaultAccount }).writeContract(parameters);
      return attachWait(client, submit, parameters.wait);
    },
    registerPublicKey: async (parameters: { account?: Account } = {}) => {
      const account = accountOrThrow(parameters.account);
      const signature = await account.signRegisterPublicKeyRequest();
      return client.request({
        method: 'octra_registerPublicKey',
        params: [account.address, account.publicKey, signature],
      });
    },
    registerPvacPubkey: async (parameters: {
      account?: Account;
      pubkeyBlob: string | Uint8Array;
      aesKat?: string;
    }) => {
      const account = accountOrThrow(parameters.account);
      const signature = await account.signRegisterPvacPubkeyRequest({ pubkeyBlob: parameters.pubkeyBlob });
      const pubkeyBlob = typeof parameters.pubkeyBlob === 'string'
        ? parameters.pubkeyBlob
        : bytesToBase64(parameters.pubkeyBlob);
      const params = compact([account.address, pubkeyBlob, signature, account.publicKey, parameters.aesKat]) as [
        OctraAddress,
        string,
        string,
        string,
        string?,
      ];
      return client.request({
        method: 'octra_registerPvacPubkey',
        params,
      });
    },
    registerPvacPubkeyFromBackend: async (parameters: {
      account?: Account;
      pvac?: PvacBackend;
    } = {}) => {
      const pvac = pvacOrThrow(parameters.pvac);
      return walletActions(client, { account: parameters.account ?? defaultAccount }).registerPvacPubkey({
        account: parameters.account,
        pubkeyBlob: await pvac.serializePubkey(),
        aesKat: await pvac.computeAesKat(),
      });
    },
    getEncryptedBalanceForAccount: async (parameters: { account?: Account } = {}) => {
      const account = accountOrThrow(parameters.account);
      const signature = await account.signEncryptedBalanceRequest();
      return client.request({
        method: 'octra_encryptedBalance',
        params: [account.address, signature, account.publicKey],
      });
    },
    ensurePublicKeyRegistered: async (parameters: { account?: Account } = {}) => {
      const account = accountOrThrow(parameters.account);
      try {
        const publicKey = await client.request({ method: 'octra_publicKey', params: [account.address] });
        if (publicKey.public_key === account.publicKey) return { ok: true, address: account.address, status: 'already_registered' as const };
      } catch {
        // Missing public keys are represented as RPC errors by some nodes; registration below is idempotent enough.
      }
      const result = await walletActions(client, { account }).registerPublicKey();
      return { ...result, status: 'registered' as const };
    },
    ensurePvacPubkeyRegistered: async (parameters: {
      account?: Account;
      pubkeyBlob: string | Uint8Array;
      aesKat?: string;
    }) => {
      const account = accountOrThrow(parameters.account);
      const pubkeyBlob = typeof parameters.pubkeyBlob === 'string'
        ? parameters.pubkeyBlob
        : bytesToBase64(parameters.pubkeyBlob);
      const remote = await client.request({ method: 'octra_pvacPubkey', params: [account.address] }).catch(() => undefined);
      if (remote?.pvac_pubkey === pubkeyBlob) {
        return {
          address: account.address,
          pubkey_format: 'compressed',
          pubkey_size: remote.pubkey_size ?? 0,
          status: 'already_registered' as const,
        };
      }
      return walletActions(client, { account }).registerPvacPubkey({
        pubkeyBlob: parameters.pubkeyBlob,
        aesKat: parameters.aesKat,
      });
    },
    ensurePvacPubkeyRegisteredFromBackend: async (parameters: {
      account?: Account;
      pvac?: PvacBackend;
    } = {}) => {
      const pvac = pvacOrThrow(parameters.pvac);
      return walletActions(client, { account: parameters.account ?? defaultAccount }).ensurePvacPubkeyRegistered({
        account: parameters.account,
        pubkeyBlob: await pvac.serializePubkey(),
        aesKat: await pvac.computeAesKat(),
      });
    },
    encryptBalance: async (parameters: {
      account?: Account;
      pvac?: PvacBackend;
      amount: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
      onProgress?: (phase: string, pct: number) => void;
    }) => {
      const account = accountOrThrow(parameters.account);
      const pvac = pvacOrThrow(parameters.pvac);
      const rawAmount = toRawAmount(parameters.amount);
      const payload = await pvac.buildEncryptPayload({
        amount: BigInt(rawAmount),
        onProgress: parameters.onProgress,
      });
      const unsigned = await prepareTransaction(client, {
        from: account.address,
        to: account.address,
        amount: rawAmount,
        nonce: parameters.nonce,
        ou: parameters.ou,
        opType: payload.opType,
        encryptedData: payload.encryptedData,
      });
      const transaction = await account.signTransaction(unsigned);
      return client.request({ method: 'octra_submit', params: [transaction] });
    },
    encryptBalanceAndWait: async (parameters: {
      account?: Account;
      pvac?: PvacBackend;
      amount: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
      onProgress?: (phase: string, pct: number) => void;
      wait?: WaitOptions;
    }) => {
      const submit = await walletActions(client, {
        account: parameters.account ?? defaultAccount,
        pvac: parameters.pvac ?? defaultPvac,
      }).encryptBalance(parameters);
      return attachWait(client, submit, parameters.wait);
    },
    decryptBalance: async (parameters: {
      account?: Account;
      pvac?: PvacBackend;
      amount: bigint | number | string;
      currentCipher?: string | Uint8Array;
      currentBalance?: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
      onProgress?: (phase: string, pct: number) => void;
    }) => {
      const account = accountOrThrow(parameters.account);
      const pvac = pvacOrThrow(parameters.pvac);
      const rawAmount = toRawAmount(parameters.amount);
      const encryptedBalance = parameters.currentCipher === undefined || parameters.currentBalance === undefined
        ? await walletActions(client, { account }).getEncryptedBalanceForAccount()
        : undefined;
      const currentCipher = parameters.currentCipher ?? encryptedBalance?.cipher ?? '0';
      const currentBalance = parameters.currentBalance === undefined
        ? await pvac.decryptCipher(currentCipher)
        : BigInt(toRawAmount(parameters.currentBalance));
      const payload = await pvac.buildDecryptPayload({
        amount: BigInt(rawAmount),
        currentCipher,
        currentBalance,
        onProgress: parameters.onProgress,
      });
      const unsigned = await prepareTransaction(client, {
        from: account.address,
        to: account.address,
        amount: rawAmount,
        nonce: parameters.nonce,
        ou: parameters.ou,
        opType: payload.opType,
        encryptedData: payload.encryptedData,
      });
      const transaction = await account.signTransaction(unsigned);
      return client.request({ method: 'octra_submit', params: [transaction] });
    },
    decryptBalanceAndWait: async (parameters: {
      account?: Account;
      pvac?: PvacBackend;
      amount: bigint | number | string;
      currentCipher?: string | Uint8Array;
      currentBalance?: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
      onProgress?: (phase: string, pct: number) => void;
      wait?: WaitOptions;
    }) => {
      const submit = await walletActions(client, {
        account: parameters.account ?? defaultAccount,
        pvac: parameters.pvac ?? defaultPvac,
      }).decryptBalance(parameters);
      return attachWait(client, submit, parameters.wait);
    },
    privateTransfer: async (parameters: { account?: Account; transaction: UnsignedTransaction }) => {
      const account = accountOrThrow(parameters.account);
      const transaction = await account.signTransaction(parameters.transaction);
      return client.request({ method: 'octra_privateTransfer', params: [transaction] });
    },
    sendPrivateTransfer: async (parameters: {
      account?: Account;
      to: string;
      amount: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
      encryptedData?: string;
      message?: string;
    }) => {
      const account = accountOrThrow(parameters.account);
      const transaction = await prepareTransaction(client, {
        from: account.address,
        to: parameters.to,
        amount: parameters.amount,
        nonce: parameters.nonce,
        ou: parameters.ou,
        opType: 'stealth',
        encryptedData: parameters.encryptedData,
        message: parameters.message,
      });
      const signed = await account.signTransaction(transaction);
      return client.request({ method: 'octra_privateTransfer', params: [signed] });
    },
    sendPrivateTransferAndWait: async (parameters: {
      account?: Account;
      to: string;
      amount: bigint | number | string;
      nonce?: number;
      ou?: bigint | number | string;
      encryptedData?: string;
      message?: string;
      wait?: WaitOptions;
    }) => {
      const submit = await walletActions(client, { account: parameters.account ?? defaultAccount }).sendPrivateTransfer(parameters);
      return attachWait(client, submit, parameters.wait);
    },
  };
}

async function getNextNonce(client: Client, address: OctraAddress): Promise<number> {
  const balance = await client.request({ method: 'octra_balance', params: [address] });
  return Math.max(balance.pending_nonce ?? balance.nonce, balance.nonce) + 1;
}

function compact<const values extends readonly unknown[]>(values: values): values {
  const output = [...values];
  while (output.length > 0 && output[output.length - 1] === undefined) output.pop();
  return output as unknown as values;
}

async function attachWait<result extends { tx_hash: TransactionHash }>(
  client: Client,
  result: result,
  wait?: WaitOptions,
): Promise<WithWait<result>> {
  const transaction = await waitForTransaction(client, {
    ...wait,
    hash: result.tx_hash,
  });
  return { ...result, transaction };
}
