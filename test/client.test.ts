import { describe, expect, test } from 'bun:test';
import { createPublicClient, custom, octraPreMainnet } from '../src/index.js';

const address = 'oct11111111111111111111111111111111111111111111';
const contract = 'oct22222222222222222222222222222222222222222222';
const hash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('public client', () => {
  test('keeps chain and transport on the client', () => {
    const transport = custom({ request: async () => null });
    const client = createPublicClient({ chain: octraPreMainnet, transport });
    expect(client.chain).toBe(octraPreMainnet);
    expect(client.transport).toBe(transport);
  });

  test('raw request delegates to transport with typed method and params', async () => {
    const calls: unknown[] = [];
    const client = createPublicClient({
      transport: custom({
        request: async (request) => {
          calls.push(request);
          return { node: 'octra', version: '3.0.0', protocol: 'json-rpc-2.0' };
        },
      }),
    });

    const result = await client.request({ method: 'node_version', params: [] });
    expect(result.node).toBe('octra');
    expect(calls).toEqual([{ method: 'node_version', params: [] }]);
  });

  test('routes every public action to the expected RPC method and params', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const client = createPublicClient({
      transport: custom({
        request: async (request) => {
          calls.push(request);
          if (request.method === 'contract_call') return { result: 'ok' };
          return resultFor(request.method);
        },
      }),
    });

    const cases: Array<[string, () => Promise<unknown>, { method: string; params: unknown[] }]> = [
      ['nodeVersion', () => client.nodeVersion(), { method: 'node_version', params: [] }],
      ['nodeStatus', () => client.nodeStatus(), { method: 'node_status', params: [] }],
      ['nodeStats', () => client.nodeStats(), { method: 'node_stats', params: [] }],
      ['nodeMetrics', () => client.nodeMetrics(), { method: 'node_metrics', params: [] }],
      ['getBalance', () => client.getBalance({ address }), { method: 'octra_balance', params: [address] }],
      ['getAccount', () => client.getAccount({ address, limit: 7 }), { method: 'octra_account', params: [address, 7] }],
      ['getNonce', () => client.getNonce({ address }), { method: 'octra_nonce', params: [address] }],
      ['getPublicKey', () => client.getPublicKey({ address }), { method: 'octra_publicKey', params: [address] }],
      ['validateAddress', () => client.validateAddress({ address }), { method: 'octra_validateAddress', params: [address] }],
      ['getSupply', () => client.getSupply(), { method: 'octra_supply', params: [] }],
      ['getTransaction', () => client.getTransaction({ hash }), { method: 'octra_transaction', params: [hash] }],
      ['getRecentTransactions', () => client.getRecentTransactions({ limit: 15, offset: 2 }), { method: 'octra_recentTransactions', params: [15, 2] }],
      ['getTransactions', () => client.getTransactions({ epochId: 5, limit: 20 }), { method: 'octra_transactions', params: [5, 20] }],
      ['getTransactionsByAddress', () => client.getTransactionsByAddress({ address, limit: 10, offset: 1 }), { method: 'octra_transactionsByAddress', params: [address, 10, 1] }],
      ['getTransactionsByEpoch', () => client.getTransactionsByEpoch({ epochId: 6, limit: 11, offset: 3 }), { method: 'octra_transactionsByEpoch', params: [6, 11, 3] }],
      ['getTotalTransactions', () => client.getTotalTransactions(), { method: 'octra_totalTransactions', params: [] }],
      ['search', () => client.search({ query: address }), { method: 'octra_search', params: [address] }],
      ['getCurrentEpoch', () => client.getCurrentEpoch(), { method: 'epoch_current', params: [] }],
      ['getEpoch', () => client.getEpoch({ epochId: 9 }), { method: 'epoch_get', params: [9] }],
      ['listEpochs', () => client.listEpochs({ limit: 10, offset: 4 }), { method: 'epoch_list', params: [10, 4] }],
      ['getEpochSummaries', () => client.getEpochSummaries({ epochIds: [1, 2, 3] }), { method: 'epoch_summaries', params: [[1, 2, 3]] }],
      ['getRecommendedFee', () => client.getRecommendedFee({ opType: 'deploy' }), { method: 'octra_recommendedFee', params: ['deploy'] }],
      ['getStaging', () => client.getStaging(), { method: 'staging_view', params: [] }],
      ['getStagingStats', () => client.getStagingStats(), { method: 'staging_stats', params: [] }],
      ['estimateOu', () => client.estimateOu(), { method: 'staging_estimateOu', params: [] }],
      ['removeStagingTransaction', () => client.removeStagingTransaction({ hash }), { method: 'staging_remove', params: [hash] }],
      ['getContract', () => client.getContract({ address: contract }), { method: 'vm_contract', params: [contract] }],
      ['getContractAbi', () => client.getContractAbi({ address: contract }), { method: 'octra_contractAbi', params: [contract] }],
      ['getContractStorage', () => client.getContractStorage({ address: contract, key: 'owner' }), { method: 'octra_contractStorage', params: [contract, 'owner'] }],
      ['listContracts', () => client.listContracts(), { method: 'octra_listContracts', params: [] }],
      ['getContractReceipt', () => client.getContractReceipt({ hash }), { method: 'contract_receipt', params: [hash] }],
      ['readContract', () => client.readContract({ address: contract, method: 'name', params: ['x'], caller: address }), { method: 'contract_call', params: [contract, 'name', ['x'], address] }],
      ['computeContractAddress', () => client.computeContractAddress({ bytecode: 'AAAA', deployer: address, nonce: 3 }), { method: 'octra_computeContractAddress', params: ['AAAA', address, 3] }],
      ['compileAssembly', () => client.compileAssembly({ source: 'PUSH 1' }), { method: 'octra_compileAssembly', params: ['PUSH 1'] }],
      ['compileAml', () => client.compileAml({ source: 'contract X {}' }), { method: 'octra_compileAml', params: ['contract X {}'] }],
      ['compileAmlMulti', () => client.compileAmlMulti({ files: [{ path: 'main.aml', source: 'contract X {}' }], main: 'main.aml' }), { method: 'octra_compileAmlMulti', params: [{ files: [{ path: 'main.aml', source: 'contract X {}' }], main: 'main.aml' }] }],
      ['verifyContract', () => client.verifyContract({ address: contract, source: 'contract X {}', files: [{ path: 'x.aml', source: 'x' }] }), { method: 'contract_verify', params: [contract, 'contract X {}', [{ path: 'x.aml', source: 'x' }]] }],
      ['saveContractAbi', () => client.saveContractAbi({ address: contract, abi: '[]' }), { method: 'contract_saveAbi', params: [contract, '[]'] }],
      ['getContractSource', () => client.getContractSource({ address: contract }), { method: 'contract_source', params: [contract] }],
      ['getPvacPubkey', () => client.getPvacPubkey({ address }), { method: 'octra_pvacPubkey', params: [address] }],
      ['getEncryptedCipher', () => client.getEncryptedCipher({ address }), { method: 'octra_encryptedCipher', params: [address] }],
      ['getEncryptedBalance', () => client.getEncryptedBalance({ address, signature: 'sig', publicKey: 'pub' }), { method: 'octra_encryptedBalance', params: [address, 'sig', 'pub'] }],
      ['getViewPubkey', () => client.getViewPubkey({ address }), { method: 'octra_viewPubkey', params: [address] }],
      ['getStealthOutputs', () => client.getStealthOutputs({ fromEpoch: 4 }), { method: 'octra_stealthOutputs', params: [4] }],
    ];

    for (const [name, action, expected] of cases) {
      calls.length = 0;
      await action();
      expect(calls, name).toEqual([expected]);
    }
  });

  test('omits trailing optional params without dropping meaningful earlier params', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const client = createPublicClient({
      transport: custom({
        request: async (request) => {
          calls.push(request);
          return resultFor(request.method);
        },
      }),
    });

    await client.getRecentTransactions({ limit: 15 });
    await client.getTransactionsByAddress({ address });
    await client.readContract({ address: contract, method: 'balance_of' });

    expect(calls).toEqual([
      { method: 'octra_recentTransactions', params: [15] },
      { method: 'octra_transactionsByAddress', params: [address] },
      { method: 'contract_call', params: [contract, 'balance_of'] },
    ]);
  });

  test('extends a public client without dropping built-in actions', async () => {
    const client = createPublicClient({
      transport: custom({
        request: async (request) => {
          if (request.method === 'node_version') return resultFor(request.method);
          if (request.method === 'octra_totalTransactions') return { confirmed: 2, staging: 1, total: 3 };
          return {};
        },
      }),
    });

    const extended = client.extend((client) => ({
      getShortVersion: async () => (await client.nodeVersion()).version.split('.')[0],
    }));

    expect(await extended.getShortVersion()).toBe('3');
    expect(await extended.getTotalTransactions()).toEqual({ confirmed: 2, staging: 1, total: 3 });
  });

  test('estimates fees and prepares transactions', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const client = createPublicClient({
      transport: custom({
        request: async (request) => {
          calls.push(request);
          if (request.method === 'octra_balance') return { address, balance: '1', balance_raw: '1', nonce: 2, pending_nonce: 4, has_public_key: true };
          if (request.method === 'octra_recommendedFee') return feeResult();
          return resultFor(request.method);
        },
      }),
    });

    await expect(client.estimateFee({ opType: 'call', speed: 'fast' })).resolves.toMatchObject({
      fee: '40',
      speed: 'fast',
    });
    await expect(client.prepareTransaction({
      from: address,
      to: contract,
      amount: '1500000',
      opType: 'call',
    })).resolves.toMatchObject({
      amount: '1500000',
      nonce: 5,
      opType: 'call',
      ou: '20',
    });
    await expect(client.prepareTransaction({
      from: address,
      to: contract,
      amount: '1',
      opType: 'stealth',
    })).resolves.toMatchObject({
      amount: '1',
      nonce: 5,
      opType: 'stealth',
      ou: '5000000',
    });
    expect(calls).toEqual([
      { method: 'octra_recommendedFee', params: ['call'] },
      { method: 'octra_balance', params: [address] },
      { method: 'octra_recommendedFee', params: ['call'] },
      { method: 'octra_balance', params: [address] },
      { method: 'octra_recommendedFee', params: ['stealth'] },
    ]);
  });

  test('simulates contract calls and returns a write-ready request shape', async () => {
    const client = createPublicClient({
      transport: custom({
        request: async (request) => {
          expect(request).toEqual({ method: 'contract_call', params: [contract, 'count', [], address] });
          return { result: 42 };
        },
      }),
    });

    await expect(client.simulateContract<number>({
      address: contract,
      method: 'count',
      params: [],
      caller: address,
    })).resolves.toEqual({
      result: 42,
      request: { address: contract, method: 'count', params: [] },
    });
  });

  test('waits for transaction terminal status', async () => {
    const statuses = ['pending', 'confirmed'];
    const client = createPublicClient({
      transport: custom({
        request: async () => ({
          status: statuses.shift(),
          tx_hash: hash,
          epoch: 1,
          from: address,
          to: address,
          amount: '0',
          amount_raw: '0',
          nonce: 1,
          ou: '1000',
          timestamp: 1,
          op_type: 'standard',
        }),
      }),
    });

    await expect(client.waitForTransaction({ hash, pollingInterval: 0 })).resolves.toMatchObject({
      status: 'confirmed',
      tx_hash: hash,
    });
  });

  test('watchers emit changes and return unwatch functions', async () => {
    let epochUnwatch = () => {};
    let stagingUnwatch = () => {};
    const client = createPublicClient({
      transport: custom({
        request: async (request) => {
          if (request.method === 'epoch_current') return { epoch_id: 9, roots: 1 };
          if (request.method === 'staging_view') return { count: 1, transactions: [{ tx_hash: hash }] };
          return resultFor(request.method);
        },
      }),
    });
    const epochSeen = new Promise<number>((resolve) => {
      epochUnwatch = client.watchEpoch({
        pollingInterval: 0,
        onChange: (epoch) => {
          epochUnwatch();
          resolve(epoch.epoch_id);
        },
      });
    });
    const stagingSeen = new Promise<number>((resolve) => {
      stagingUnwatch = client.watchPendingTransactions({
        pollingInterval: 0,
        onChange: (staging) => {
          stagingUnwatch();
          resolve(staging.count);
        },
      });
    });

    await expect(epochSeen).resolves.toBe(9);
    await expect(stagingSeen).resolves.toBe(1);
  });
});

function resultFor(method: string): unknown {
  switch (method) {
    case 'node_version': return { node: 'octra', version: '3.0.0', protocol: 'json-rpc-2.0' };
    case 'octra_balance': return { address, balance: '1.000000', balance_raw: '1000000', nonce: 1, pending_nonce: 2, has_public_key: true };
    case 'octra_recommendedFee': return feeResult();
    case 'octra_computeContractAddress': return { address: contract, deployer: address, nonce: 3 };
    case 'octra_compileAssembly': return { bytecode: 'AAAA', size: 1, instructions: 1 };
    case 'octra_compileAml':
    case 'octra_compileAmlMulti': return { bytecode: 'AAAA', size: 1, instructions: 1, abi: '[]', version: 'test', disasm: '' };
    default: return {};
  }
}

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
