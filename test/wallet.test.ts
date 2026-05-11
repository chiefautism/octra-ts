import { describe, expect, test } from 'bun:test';
import { createWalletClient, custom, type Account, type PvacBackend, type SignableMessage, type UnsignedTransaction } from '../src/index.js';

const address = 'oct11111111111111111111111111111111111111111111';
const recipient = 'oct22222222222222222222222222222222222222222222';
const contract = 'oct33333333333333333333333333333333333333333333';

describe('wallet client', () => {
  test('throws for account-required actions when no account is configured', async () => {
    const wallet = createWalletClient({ transport: custom({ request: async () => ({}) }) });
    expect(() => wallet.signTransaction({
      transaction: {
        from: address,
        to: recipient,
        amount: '1',
        nonce: 1,
        ou: '1000',
      },
    })).toThrow('wallet account is required');
  });

  test('signTransaction delegates to the configured account', async () => {
    const account = makeAccount();
    const wallet = createWalletClient({ account, transport: custom({ request: async () => ({}) }) });
    const signed = await wallet.signTransaction({
      transaction: { from: address, to: recipient, amount: '1', nonce: 1, ou: '1000' },
    });

    expect(signed.signature).toBe('sig-1');
    expect(account.signedTransactions).toHaveLength(1);
  });

  test('submitTransaction and submitBatch route already-signed transactions', async () => {
    const calls: unknown[] = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          calls.push(request);
          return request.method === 'octra_submitBatch'
            ? { total: 1, accepted: 1, rejected: 0, results: [] }
            : { tx_hash: 'hash', status: 'accepted', nonce: 1, ou_cost: '1000' };
        },
      }),
    });
    const signed = await account.signTransaction({ from: address, to: recipient, amount: '1', nonce: 1, ou: '1000' });

    await wallet.submitTransaction({ transaction: signed });
    await wallet.submitBatch({ transactions: [signed] });

    expect(calls).toEqual([
      { method: 'octra_submit', params: [signed] },
      { method: 'octra_submitBatch', params: [[signed]] },
    ]);
  });

  test('sendTransfer fetches pending nonce, signs webcli-shaped tx, and submits', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          calls.push(request);
          if (request.method === 'octra_balance') {
            return { address, balance: '1', balance_raw: '1000000', nonce: 3, pending_nonce: 9, has_public_key: true };
          }
          return { tx_hash: 'hash', status: 'accepted', nonce: 10, ou_cost: '10000' };
        },
      }),
    });

    const result = await wallet.sendTransfer({ to: recipient, amount: 999999999n, message: 'hi' });

    expect(result.tx_hash).toBe('hash');
    expect(calls.map((call) => call.method)).toEqual(['octra_balance', 'octra_submit']);
    expect(account.signedTransactions[0]).toMatchObject({
      from: address,
      to: recipient,
      amount: '999999999',
      nonce: 10,
      ou: '10000',
      opType: 'standard',
      message: 'hi',
    });
  });

  test('sendTransfer respects explicit nonce and high amount default OU', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          calls.push(request);
          return { tx_hash: 'hash', status: 'accepted', nonce: 99, ou_cost: '30000' };
        },
      }),
    });

    await wallet.sendTransfer({ to: recipient, amount: 1000000000n, nonce: 99 });

    expect(calls.map((call) => call.method)).toEqual(['octra_submit']);
    expect(account.signedTransactions[0]).toMatchObject({ nonce: 99, ou: '30000' });
  });

  test('sendTransaction fills from with account address when omitted', async () => {
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({ request: async () => ({ tx_hash: 'hash', status: 'accepted', nonce: 1, ou_cost: '1' }) }),
    });

    await wallet.sendTransaction({
      transaction: { to: recipient, amount: '1', nonce: 1, ou: '1000' },
    });

    expect(account.signedTransactions[0].from).toBe(address);
  });

  test('sendTransaction prepares missing nonce and OU', async () => {
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          if (request.method === 'octra_balance') return { address, balance: '1', balance_raw: '1', nonce: 1, pending_nonce: 3, has_public_key: true };
          return { tx_hash: 'hash', status: 'accepted', nonce: 4, ou_cost: '10000' };
        },
      }),
    });

    await wallet.sendTransaction({
      transaction: { to: recipient, amount: '1' },
    });

    expect(account.signedTransactions[0]).toMatchObject({
      from: address,
      nonce: 4,
      ou: '10000',
    });
  });

  test('sendTransferAndWait submits then polls transaction status', async () => {
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          if (request.method === 'octra_balance') return { address, balance: '1', balance_raw: '1', nonce: 1, pending_nonce: 1, has_public_key: true };
          if (request.method === 'octra_submit') return { tx_hash: 'hash', status: 'accepted', nonce: 2, ou_cost: '10000' };
          if (request.method === 'octra_transaction') return {
            status: 'confirmed',
            tx_hash: 'hash',
            epoch: 1,
            from: address,
            to: recipient,
            amount: '1',
            amount_raw: '1',
            nonce: 2,
            ou: '10000',
            timestamp: 1,
            op_type: 'standard',
          };
          return {};
        },
      }),
    });

    await expect(wallet.sendTransferAndWait({
      to: recipient,
      amount: '1',
      wait: { pollingInterval: 0 },
    })).resolves.toMatchObject({
      tx_hash: 'hash',
      transaction: { status: 'confirmed' },
    });
  });

  test('deployContract computes address with next nonce and submits deploy transaction', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          calls.push(request);
          if (request.method === 'octra_balance') return { address, balance: '1', balance_raw: '1', nonce: 1, pending_nonce: 2, has_public_key: true };
          if (request.method === 'octra_computeContractAddress') return { address: contract, deployer: address, nonce: 3 };
          if (request.method === 'octra_recommendedFee') {
            return {
              minimum: '1',
              base_fee: '100000',
              recommended: '200000',
              fast: '400000',
              staging_size: 0,
              staging_ou: '0',
              epoch_capacity: '10000000000',
              usage_pct: 0,
            };
          }
          return { tx_hash: 'hash', status: 'accepted', nonce: 3, ou_cost: '200000' };
        },
      }),
    });

    const result = await wallet.deployContract({ bytecode: 'BYTECODE', params: ['init'] });

    expect(result.contract_address).toBe(contract);
    expect(calls).toEqual([
      { method: 'octra_balance', params: [address] },
      { method: 'octra_computeContractAddress', params: ['BYTECODE', address, 3] },
      { method: 'octra_recommendedFee', params: ['deploy'] },
      { method: 'octra_submit', params: [expect.objectContaining({ to_: contract, op_type: 'deploy' })] },
    ]);
    expect(account.signedTransactions[0]).toMatchObject({
      to: contract,
      amount: '0',
      nonce: 3,
      ou: '200000',
      opType: 'deploy',
      encryptedData: 'BYTECODE',
      message: '["init"]',
    });
  });

  test('writeContract signs call transactions with method and JSON params', async () => {
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          if (request.method === 'octra_balance') return { address, balance: '1', balance_raw: '1', nonce: 4, pending_nonce: 4, has_public_key: true };
          return { tx_hash: 'hash', status: 'accepted', nonce: 5, ou_cost: '1000' };
        },
      }),
    });

    await wallet.writeContract({ address: contract, method: 'set', params: [1, 'x'], amount: '10' });

    expect(account.signedTransactions[0]).toMatchObject({
      from: address,
      to: contract,
      amount: '10',
      nonce: 5,
      ou: '1000',
      opType: 'call',
      encryptedData: 'set',
      message: '[1,"x"]',
    });
  });

  test('register proof actions sign and call the matching RPC methods', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          calls.push(request);
          return { ok: true, address };
        },
      }),
    });

    await wallet.registerPublicKey();
    await wallet.registerPvacPubkey({ pubkeyBlob: new Uint8Array([1, 2, 3]) });
    await wallet.getEncryptedBalanceForAccount();

    expect(calls).toEqual([
      { method: 'octra_registerPublicKey', params: [address, 'pubkey', 'register-public-key-sig'] },
      { method: 'octra_registerPvacPubkey', params: [address, 'AQID', 'register-pvac-sig', 'pubkey'] },
      { method: 'octra_encryptedBalance', params: [address, 'encrypted-balance-sig', 'pubkey'] },
    ]);
  });

  test('ensure registration helpers skip or submit as needed', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          calls.push(request);
          if (request.method === 'octra_publicKey') return { address, public_key: 'pubkey' };
          if (request.method === 'octra_pvacPubkey') return { address, pvac_pubkey: 'AQID', pubkey_size: 3 };
          return { ok: true, address };
        },
      }),
    });

    await expect(wallet.ensurePublicKeyRegistered()).resolves.toEqual({
      ok: true,
      address,
      status: 'already_registered',
    });
    await expect(wallet.ensurePvacPubkeyRegistered({ pubkeyBlob: new Uint8Array([1, 2, 3]) })).resolves.toMatchObject({
      address,
      status: 'already_registered',
    });
    expect(calls.map((call) => call.method)).toEqual(['octra_publicKey', 'octra_pvacPubkey']);
  });

  test('PVAC backend registration action supplies pubkey and AES KAT', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      pvac: makePvacBackend(),
      transport: custom({
        request: async (request) => {
          calls.push(request);
          return { address, pubkey_size: 3, pubkey_format: 'compressed', status: 'ok' };
        },
      }),
    });

    await wallet.registerPvacPubkeyFromBackend();

    expect(calls).toEqual([
      { method: 'octra_registerPvacPubkey', params: [address, 'AQID', 'register-pvac-sig', 'pubkey', 'aabbccdd'] },
    ]);
  });

  test('encryptBalance builds a real PVAC payload through the backend and submits self transaction', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      pvac: makePvacBackend(),
      transport: custom({
        request: async (request) => {
          calls.push(request);
          if (request.method === 'octra_balance') return { address, balance: '1', balance_raw: '1', nonce: 2, pending_nonce: 2, has_public_key: true };
          if (request.method === 'octra_recommendedFee') return feeResult();
          return { tx_hash: 'encrypt-hash', status: 'accepted', nonce: 3, ou_cost: '10000' };
        },
      }),
    });

    await wallet.encryptBalance({ amount: '123' });

    expect(calls.map((call) => call.method)).toEqual(['octra_balance', 'octra_recommendedFee', 'octra_submit']);
    expect(account.signedTransactions[0]).toMatchObject({
      from: address,
      to: address,
      amount: '123',
      nonce: 3,
      ou: '5000000',
      opType: 'encrypt',
      encryptedData: JSON.stringify({ cipher: 'hfhe_v1|cipher', zero_proof: 'zkzp_v2|proof' }),
    });
  });

  test('decryptBalance fetches encrypted balance proof, decrypts with backend, builds range payload, and submits', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      pvac: makePvacBackend(),
      transport: custom({
        request: async (request) => {
          calls.push(request);
          if (request.method === 'octra_encryptedBalance') return { address, cipher: 'hfhe_v1|current', has_pvac_pubkey: true };
          if (request.method === 'octra_balance') return { address, balance: '1', balance_raw: '1', nonce: 7, pending_nonce: 8, has_public_key: true };
          if (request.method === 'octra_recommendedFee') return feeResult();
          return { tx_hash: 'decrypt-hash', status: 'accepted', nonce: 9, ou_cost: '10000' };
        },
      }),
    });

    await wallet.decryptBalance({ amount: '5' });

    expect(calls.map((call) => call.method)).toEqual(['octra_encryptedBalance', 'octra_balance', 'octra_recommendedFee', 'octra_submit']);
    expect(calls[0]).toEqual({ method: 'octra_encryptedBalance', params: [address, 'encrypted-balance-sig', 'pubkey'] });
    expect(account.signedTransactions[0]).toMatchObject({
      from: address,
      to: address,
      amount: '5',
      nonce: 9,
      ou: '5000000',
      opType: 'decrypt',
      encryptedData: JSON.stringify({ cipher: 'hfhe_v1|decrypt', range_proof_balance: 'rp_v1|range' }),
    });
  });

  test('privateTransfer signs and routes to private transfer RPC', async () => {
    const calls: unknown[] = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          calls.push(request);
          return { tx_hash: 'private-hash', status: 'pending' };
        },
      }),
    });

    await wallet.privateTransfer({
      transaction: { from: address, to: 'stealth', amount: '1', nonce: 1, ou: '1000', opType: 'stealth' },
    });

    expect(calls).toEqual([
      { method: 'octra_privateTransfer', params: [expect.objectContaining({ to_: 'stealth', op_type: 'stealth' })] },
    ]);
  });

  test('sendPrivateTransfer prepares stealth transaction and routes to private RPC', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const account = makeAccount();
    const wallet = createWalletClient({
      account,
      transport: custom({
        request: async (request) => {
          calls.push(request);
          if (request.method === 'octra_balance') return { address, balance: '1', balance_raw: '1', nonce: 1, pending_nonce: 1, has_public_key: true };
          if (request.method === 'octra_recommendedFee') return {
            minimum: '1',
            base_fee: '10',
            recommended: '20',
            fast: '40',
            staging_size: 0,
            staging_ou: '0',
            epoch_capacity: '100',
            usage_pct: 0,
          };
          return { tx_hash: 'private-hash', status: 'pending' };
        },
      }),
    });

    await wallet.sendPrivateTransfer({
      to: 'stealth',
      amount: '1',
      encryptedData: 'cipher',
    });

    expect(calls.map((call) => call.method)).toEqual(['octra_balance', 'octra_recommendedFee', 'octra_privateTransfer']);
    expect(account.signedTransactions[0]).toMatchObject({
      from: address,
      to: 'stealth',
      nonce: 2,
      ou: '5000000',
      opType: 'stealth',
      encryptedData: 'cipher',
    });
  });
});

function feeResult() {
  return {
    minimum: '1',
    base_fee: '10',
    recommended: '20',
    fast: '40',
    staging_size: 0,
    staging_ou: '0',
    epoch_capacity: '100',
    usage_pct: 0,
  };
}

function makeAccount(): Account & { signedTransactions: UnsignedTransaction[] } {
  const signedTransactions: UnsignedTransaction[] = [];
  return {
    address,
    publicKey: 'pubkey',
    signedTransactions,
    signMessage: async ({ message }: { message: SignableMessage }) =>
      typeof message === 'string' ? `sig:${message}` : `sig:${Array.from(message).join(',')}`,
    signTransaction: async (transaction: UnsignedTransaction) => {
      signedTransactions.push(transaction);
      return {
        from: transaction.from,
        to_: transaction.to,
        amount: String(transaction.amount),
        nonce: transaction.nonce,
        ou: String(transaction.ou),
        timestamp: transaction.timestamp ?? 1,
        op_type: transaction.opType ?? 'standard',
        ...(transaction.encryptedData ? { encrypted_data: transaction.encryptedData } : {}),
        ...(transaction.message ? { message: transaction.message } : {}),
        signature: `sig-${signedTransactions.length}`,
        public_key: 'pubkey',
      };
    },
    signEncryptedBalanceRequest: async () => 'encrypted-balance-sig',
    signRegisterPublicKeyRequest: async () => 'register-public-key-sig',
    signRegisterPvacPubkeyRequest: async () => 'register-pvac-sig',
  };
}

function makePvacBackend(): PvacBackend {
  return {
    kind: 'test-pvac',
    serializePubkey: () => new Uint8Array([1, 2, 3]),
    computeAesKat: () => 'aabbccdd',
    decryptCipher: () => 42n,
    buildEncryptPayload: ({ amount }) => ({
      encryptedData: JSON.stringify({ cipher: 'hfhe_v1|cipher', zero_proof: 'zkzp_v2|proof' }),
      opType: 'encrypt',
      amount: amount.toString(),
    }),
    buildDecryptPayload: ({ amount }) => ({
      encryptedData: JSON.stringify({ cipher: 'hfhe_v1|decrypt', range_proof_balance: 'rp_v1|range' }),
      opType: 'decrypt',
      amount: amount.toString(),
    }),
  };
}
