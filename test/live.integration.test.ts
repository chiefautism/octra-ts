import { describe, expect, test } from 'bun:test';
import { createPublicClient, createWalletClient, http, octraPreMainnet, parseContractAbi, type JsonObject } from '../src/index.js';
import { privateKeyToAccount } from '../src/accounts/index.js';

const privateKey = process.env.OCTRA_PRIVATE_KEY_B64
  ?? process.env.OCTRA_PRIVATE_KEY_HEX;

const runLive = process.env.OCTRA_LIVE === '1' && privateKey;
const maybeLive = runLive ? describe : describe.skip;
const rpcUrl = process.env.OCTRA_RPC_URL ?? octraPreMainnet.rpcUrls.default.http[0];

maybeLive('live Octra RPC integration', () => {
  test('derives the same account from the provided key and reads public network data', async () => {
    const account = privateKeyToAccount(privateKey!);
    const publicClient = createPublicClient({
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 15_000, retryCount: 1, retryDelay: 50 }),
    });

    const [version, status, validation, balance, fee] = await Promise.all([
      publicClient.nodeVersion(),
      publicClient.nodeStatus(),
      publicClient.validateAddress({ address: account.address }),
      publicClient.getBalance({ address: account.address }),
      publicClient.getRecommendedFee({ opType: 'standard' }),
    ]);

    expect(version.node).toBe('octra');
    expect(version.protocol).toBe('json-rpc-2.0');
    expect(status.epoch).toBeNumber();
    expect(validation.valid).toBe(true);
    expect(balance.address).toBe(account.address);
    expect(balance.nonce).toBeNumber();
    expect(balance.pending_nonce).toBeNumber();
    expect(fee.recommended).toBeString();
  }, 20_000);

  test('signs a wallet transaction offline without broadcasting it', async () => {
    const account = privateKeyToAccount(privateKey!);
    const wallet = createWalletClient({
      account,
      transport: http(rpcUrl, { timeout: 15_000 }),
    });
    const balance = await wallet.getBalance({ address: account.address });

    const signed = await wallet.signTransaction({
      transaction: {
        from: account.address,
        to: account.address,
        amount: '0',
        nonce: Math.max(balance.pending_nonce ?? balance.nonce, balance.nonce) + 1,
        ou: '1000',
        timestamp: 1_700_000_000,
        opType: 'standard',
        message: 'octra-ts live offline signing test',
      },
    });

    expect(signed.from).toBe(account.address);
    expect(signed.to_).toBe(account.address);
    expect(signed.signature).toHaveLength(88);
    expect(signed.public_key).toBe(account.publicKey);
  }, 20_000);

  test('reads node, account, fee, staging, and epoch surfaces', async () => {
    const account = privateKeyToAccount(privateKey!);
    const publicClient = createPublicClient({
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 15_000, retryCount: 1, retryDelay: 50 }),
    });

    const [
      version,
      status,
      stats,
      supply,
      accountOverview,
      nonce,
      validation,
      standardFee,
      deployFee,
      staging,
      stagingStats,
      ouEstimate,
      currentEpoch,
      totalTransactions,
    ] = await Promise.all([
      publicClient.nodeVersion(),
      publicClient.nodeStatus(),
      publicClient.nodeStats(),
      publicClient.getSupply(),
      publicClient.getAccount({ address: account.address, limit: 5 }),
      publicClient.getNonce({ address: account.address }),
      publicClient.validateAddress({ address: account.address }),
      publicClient.estimateFee({ opType: 'standard' }),
      publicClient.estimateFee({ opType: 'deploy', speed: 'fast' }),
      publicClient.getStaging(),
      publicClient.getStagingStats(),
      publicClient.estimateOu(),
      publicClient.getCurrentEpoch(),
      publicClient.getTotalTransactions(),
    ]);

    expect(version.node).toBe('octra');
    expect(status.epoch).toBeNumber();
    expect(stats.total_accounts).toBeNumber();
    expect(supply.total_supply_raw).toBeString();
    expect(accountOverview.address).toBe(account.address);
    expect(nonce.address).toBe(account.address);
    expect(validation.valid).toBe(true);
    expect(BigInt(standardFee.fee)).toBeGreaterThanOrEqual(0n);
    expect(BigInt(deployFee.fee)).toBeGreaterThanOrEqual(BigInt(deployFee.recommended));
    expect(staging.count).toBeNumber();
    expect(stagingStats.total_transactions).toBeNumber();
    expect(ouEstimate.recommended).toBeString();
    expect(currentEpoch.epoch_id).toBeNumber();
    expect(totalTransactions.total).toBeNumber();
  }, 20_000);

  test('reads transaction and epoch indexes without assuming chain activity', async () => {
    const account = privateKeyToAccount(privateKey!);
    const publicClient = createPublicClient({
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 15_000, retryCount: 1, retryDelay: 50 }),
    });

    const [recent, lightweight, byAddress, epochList, search] = await Promise.all([
      publicClient.getRecentTransactions({ limit: 5, offset: 0 }),
      publicClient.getTransactions({ limit: 5 }),
      publicClient.getTransactionsByAddress({ address: account.address, limit: 5, offset: 0 }),
      publicClient.listEpochs({ limit: 5, offset: 0 }),
      publicClient.search({ query: account.address }),
    ]);

    expect(recent.count).toBeNumber();
    expect(lightweight.count).toBeNumber();
    expect(byAddress.address).toBe(account.address);
    expect(epochList.total).toBeNumber();
    expect(search.type).toBeString();

    const epochId = epochList.epochs[0];
    if (typeof epochId === 'number') {
      const [epoch, summaries, transactionsByEpoch] = await Promise.all([
        publicClient.getEpoch({ epochId }),
        publicClient.getEpochSummaries({ epochIds: [epochId] }),
        publicClient.getTransactionsByEpoch({ epochId, limit: 5, offset: 0 }),
      ]);
      expect(epoch.epoch_id).toBe(epochId);
      expect(summaries[0]?.epoch_id).toBe(epochId);
      expect(transactionsByEpoch.epoch_id).toBe(epochId);
    }

    const hash = firstHash(recent.transactions)
      ?? firstHash(recent.rejected)
      ?? firstHash(lightweight.transactions)
      ?? firstHash(byAddress.transactions)
      ?? firstHash(byAddress.rejected);
    if (hash) {
      const transaction = await publicClient.getTransaction({ hash });
      expect(transaction.tx_hash).toBe(hash);
      expect(transaction.status).toBeString();
    }
  }, 20_000);

  test('reads contract and privacy-related public surfaces', async () => {
    const account = privateKeyToAccount(privateKey!);
    const publicClient = createPublicClient({
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 15_000, retryCount: 1, retryDelay: 50 }),
    });

    const currentEpoch = await publicClient.getCurrentEpoch();
    const fromEpoch = Math.max(0, currentEpoch.epoch_id - 10);
    const [contracts, pvacPubkey, encryptedCipher, viewPubkey, stealthOutputs] = await Promise.all([
      publicClient.listContracts(),
      publicClient.getPvacPubkey({ address: account.address }),
      publicClient.getEncryptedCipher({ address: account.address }),
      publicClient.getViewPubkey({ address: account.address }),
      publicClient.getStealthOutputs({ fromEpoch }),
    ]);

    expect(contracts.count).toBeNumber();
    expect(pvacPubkey.address).toBe(account.address);
    expect(encryptedCipher.address).toBe(account.address);
    expect(encryptedCipher.cipher_type).toBeString();
    expect(viewPubkey.address).toBe(account.address);
    expect(stealthOutputs.count).toBeNumber();

    const contract = contracts.contracts[0];
    if (contract?.address) {
      const [metadata, abi] = await Promise.all([
        publicClient.getContract({ address: contract.address }),
        publicClient.getContractAbi({ address: contract.address }),
      ]);
      expect(metadata.address).toBe(contract.address);
      expect(abi.address).toBe(contract.address);
    }
  }, 20_000);

  test('compiles a multi-file AML project', async () => {
    const publicClient = createPublicClient({
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 20_000, retryCount: 1, retryDelay: 50 }),
    });

    const compiled = await publicClient.compileAmlMulti({
      files: [
        { path: 'main.aml', source: tokenSource },
        { path: 'interfaces/IOCS01.aml', source: tokenInterfaceSource },
      ],
      main: 'main.aml',
    });
    expect(compiled.bytecode).toBeString();
    expect(compiled.instructions).toBeGreaterThan(0);
    const abi = parseContractAbi(compiled.abi);
    expect(abi.map((entry) => entry.name)).toContain('transfer');
    expect(abi.map((entry) => entry.name)).toContain('get_name');
  }, 30_000);
});

const tokenInterfaceSource = `interface IOCS01 {
  fn transfer(to: address, amount: int): bool
  fn grant(spender: address, amount: int): bool
  fn pull(from: address, to: address, amount: int): bool
  fn balance_of(addr: address): int
  fn allowance(owner: address, spender: address): int
  fn get_name(): string
  fn get_symbol(): string
  fn get_total_supply(): int
}`;

const tokenSource = `import IOCS01 from "interfaces/IOCS01.aml"

contract Token implements IOCS01 {
  state {
    name: string
    symbol: string
    total_supply: int
    decimals: int
    owner: address
    balances: map[address]int
    grants: map[address]map[address]int
  }

  event Transfer(from: address, to: address, amount: int)
  event Grant(owner: address, spender: address, amount: int)

  constructor(n: string, s: string, supply: int, dec: int) {
    require(len(n) > 0, "name empty")
    self.name = n
    self.symbol = s
    self.total_supply = supply
    self.decimals = dec
    self.owner = origin
    self.balances[origin] = supply
    emit Transfer(origin, origin, supply)
  }

  view fn decimals(): int { return self.decimals }
  view fn balance_of(addr: address): int { return self.balances[addr] }

  view fn allowance(owner: address, spender: address): int {
    return self.grants[owner][spender]
  }

  view fn get_name(): string { return self.name }
  view fn get_symbol(): string { return self.symbol }
  view fn get_total_supply(): int { return self.total_supply }

  fn transfer(to: address, amt: int): bool {
    assert_address(to)
    let bal = self.balances[caller]
    require(bal >= amt, "insufficient balance")
    self.balances[caller] = bal - amt
    self.balances[to] = self.balances[to] + amt
    emit Transfer(caller, to, amt)
    return true
  }

  fn grant(spender: address, amt: int): bool {
    assert_address(spender)
    self.grants[caller][spender] = amt
    emit Grant(caller, spender, amt)
    return true
  }

  fn pull(from: address, to: address, amt: int): bool {
    assert_address(to)
    let allowed = self.grants[from][caller]
    require(allowed >= amt, "not allowed")
    let bal = self.balances[from]
    require(bal >= amt, "insufficient balance")
    self.balances[from] = bal - amt
    self.balances[to] = self.balances[to] + amt
    self.grants[from][caller] = allowed - amt
    emit Transfer(from, to, amt)
    return true
  }
}`;

function firstHash(rows: JsonObject[]): string | undefined {
  for (const row of rows) {
    const hash = row.tx_hash ?? row.hash;
    if (typeof hash === 'string' && hash.length > 0) return hash;
  }
  return undefined;
}
