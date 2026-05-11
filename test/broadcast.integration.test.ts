import { describe, expect, test } from 'bun:test';
import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  octraPreMainnet,
  OctraRpcError,
  parseContractAbi,
  sha256,
  type ContractAddress,
  type PublicClient,
  type Transaction,
  utf8ToBytes,
} from '../src/index.js';
import { privateKeyToAccount } from '../src/accounts/index.js';

const privateKey = process.env.OCTRA_PRIVATE_KEY_B64
  ?? process.env.OCTRA_PRIVATE_KEY_HEX;

const runBroadcast = process.env.OCTRA_BROADCAST === '1' && privateKey;
const maybeBroadcast = runBroadcast ? describe : describe.skip;
const rpcUrl = process.env.OCTRA_RPC_URL ?? octraPreMainnet.rpcUrls.default.http[0];

maybeBroadcast('broadcast Octra RPC integration', () => {
  test('registers a recipient public key, submits a transfer, and submits two batch transactions', async () => {
    const sender = privateKeyToAccount(privateKey!);
    const recipient = getRecipientAccount();
    expect(recipient.address).not.toBe(sender.address);

    const publicClient = createPublicClient({
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 20_000, retryCount: 1, retryDelay: 100 }),
    });
    const wallet = createWalletClient({
      account: sender,
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 20_000, retryCount: 1, retryDelay: 100 }),
    });

    await ensurePublicKeyRegistered(recipient);

    const amount = process.env.OCTRA_BROADCAST_AMOUNT_RAW ?? '1';
    const fee = await publicClient.estimateFee({ opType: 'standard', speed: 'fast' });
    const ou = maxBigIntString(process.env.OCTRA_BROADCAST_OU ?? '10000', fee.fee);
    const balance = await publicClient.getBalance({ address: sender.address });
    expect(BigInt(balance.balance_raw)).toBeGreaterThan(BigInt(amount) * 2n);

    const submit = await wallet.sendTransfer({
      to: recipient.address,
      amount,
      ou,
      message: 'octra-ts broadcast test',
    });
    expect(submit.tx_hash).toHaveLength(64);
    expect(submit.status).toBeString();

    const firstTx = await findTransaction(publicClient, submit.tx_hash);
    expect(firstTx.tx_hash).toBe(submit.tx_hash);
    expect(['pending', 'confirmed', 'rejected', 'dropped']).toContain(firstTx.status);
    expect(firstTx.status).not.toBe('rejected');
    expect(firstTx.status).not.toBe('dropped');

    const next = await publicClient.getBalance({ address: sender.address });
    const nonce = Math.max(next.pending_nonce ?? next.nonce, next.nonce) + 1;
    const signedA = await sender.signTransaction({
      from: sender.address,
      to: recipient.address,
      amount,
      nonce,
      ou,
      opType: 'standard',
      message: 'octra-ts broadcast batch test a',
    });
    const signedB = await sender.signTransaction({
      from: sender.address,
      to: recipient.address,
      amount,
      nonce: nonce + 1,
      ou,
      opType: 'standard',
      message: 'octra-ts broadcast batch test b',
    });

    const batch = await wallet.submitBatch({ transactions: [signedA, signedB] });
    expect(batch.total).toBe(2);
    expect(batch.accepted).toBe(2);
    expect(batch.rejected).toBe(0);
    const batchHashes = batch.results
      .map((result) => result.tx_hash ?? result.hash)
      .filter((hash): hash is string => typeof hash === 'string');
    expect(batchHashes).toHaveLength(2);

    for (const batchHash of batchHashes) {
      const tx = await findTransaction(publicClient, batchHash);
      expect(tx.tx_hash).toBe(batchHash);
      expect(tx.status).not.toBe('rejected');
      expect(tx.status).not.toBe('dropped');
    }
  }, 60_000);

  test('submits and observes a transfer through sendTransferAndWait', async () => {
    const sender = privateKeyToAccount(privateKey!);
    const recipient = getRecipientAccount();
    const wallet = createWalletClient({
      account: sender,
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 20_000, retryCount: 1, retryDelay: 100 }),
    });
    const publicClient = createPublicClient({
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 20_000, retryCount: 1, retryDelay: 100 }),
    });

    await ensurePublicKeyRegistered(recipient);
    await expect(wallet.ensurePublicKeyRegistered()).resolves.toMatchObject({
      address: sender.address,
    });

    const amount = process.env.OCTRA_BROADCAST_AMOUNT_RAW ?? '1';
    const fee = await publicClient.estimateFee({ opType: 'standard', speed: 'fast' });
    const ou = maxBigIntString(process.env.OCTRA_BROADCAST_OU ?? '10000', fee.fee);

    const result = await wallet.sendTransferAndWait({
      to: recipient.address,
      amount,
      ou,
      message: 'octra-ts broadcast wait test',
      wait: {
        pollingInterval: 1_000,
        statuses: ['pending', 'confirmed'],
        timeout: 30_000,
      },
    });

    expect(result.tx_hash).toHaveLength(64);
    expect(result.transaction.tx_hash).toBe(result.tx_hash);
    expect(['pending', 'confirmed']).toContain(result.transaction.status);
  }, 60_000);

  test('rejects duplicate transaction, invalid nonce, fee too low, and self transfer', async () => {
    const sender = privateKeyToAccount(privateKey!);
    const recipient = getRecipientAccount();
    const publicClient = createPublicClient({
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 20_000, retryCount: 1, retryDelay: 100 }),
    });
    const wallet = createWalletClient({
      account: sender,
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 20_000, retryCount: 1, retryDelay: 100 }),
    });

    await ensurePublicKeyRegistered(recipient);
    const amount = process.env.OCTRA_BROADCAST_AMOUNT_RAW ?? '1';
    const fee = await publicClient.estimateFee({ opType: 'standard', speed: 'fast' });
    const ou = maxBigIntString(process.env.OCTRA_BROADCAST_OU ?? '10000', fee.fee);
    const balance = await publicClient.getBalance({ address: sender.address });
    const nonce = Math.max(balance.pending_nonce ?? balance.nonce, balance.nonce) + 1;

    const duplicate = await sender.signTransaction({
      from: sender.address,
      to: recipient.address,
      amount,
      nonce,
      ou,
      opType: 'standard',
      message: 'octra-ts duplicate failure test',
    });
    const accepted = await wallet.submitTransaction({ transaction: duplicate });
    expect(accepted.tx_hash).toHaveLength(64);
    await expectRpcFailure(
      () => wallet.submitTransaction({ transaction: duplicate }),
      ['duplicate'],
    );

    const invalidNonce = await sender.signTransaction({
      from: sender.address,
      to: recipient.address,
      amount,
      nonce: 1,
      ou,
      opType: 'standard',
      message: 'octra-ts invalid nonce failure test',
    });
    await expectRpcFailure(
      () => wallet.submitTransaction({ transaction: invalidNonce }),
      ['nonce'],
    );

    const next = await publicClient.getBalance({ address: sender.address });
    const nextNonce = Math.max(next.pending_nonce ?? next.nonce, next.nonce) + 1;
    const lowFee = await sender.signTransaction({
      from: sender.address,
      to: recipient.address,
      amount,
      nonce: nextNonce,
      ou: '0',
      opType: 'standard',
      message: 'octra-ts fee too low failure test',
    });
    await expectRpcFailure(
      () => wallet.submitTransaction({ transaction: lowFee }),
      ['fee', 'ou'],
    );

    const selfTransfer = await sender.signTransaction({
      from: sender.address,
      to: sender.address,
      amount,
      nonce: nextNonce,
      ou,
      opType: 'standard',
      message: 'octra-ts self transfer failure test',
    });
    await expectRpcFailure(
      () => wallet.submitTransaction({ transaction: selfTransfer }),
      ['self'],
    );
  }, 60_000);

  test('compiles, deploys, reads, writes, and checks receipt for a counter contract', async () => {
    const sender = privateKeyToAccount(privateKey!);
    const publicClient = createPublicClient({
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 30_000, retryCount: 1, retryDelay: 100 }),
    });
    const wallet = createWalletClient({
      account: sender,
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 30_000, retryCount: 1, retryDelay: 100 }),
    });

    const compiled = await publicClient.compileAml({ source: counterSource });
    expect(compiled.bytecode).toBeString();
    expect(compiled.instructions).toBeGreaterThan(0);
    const abi = parseContractAbi(compiled.abi);
    expect(abi.map((entry) => entry.name)).toContain('inc');
    expect(abi.map((entry) => entry.name)).toContain('get');

    const deployFee = await publicClient.estimateFee({ opType: 'deploy', speed: 'fast' });
    const deploy = await wallet.deployContract({
      bytecode: compiled.bytecode,
      ou: deployFee.fee,
    });
    expect(deploy.tx_hash).toHaveLength(64);
    expect(deploy.contract_address).toBeString();

    const contractAddress = deploy.contract_address as ContractAddress;
    const deployTx = await waitForStatus(publicClient, deploy.tx_hash, ['confirmed'], 90_000);
    expect(deployTx.status).toBe('confirmed');
    const metadata = await waitForContract(publicClient, contractAddress);
    expect(metadata.address).toBe(contractAddress);

    const verify = await retry(() => publicClient.verifyContract({
      address: contractAddress,
      source: counterSource,
    }), 5, 1_000);
    expect(verify.verified).toBe(true);
    expect(verify.code_hash).toBeString();

    const abiText = JSON.stringify(abi);
    const savedAbi = await publicClient.saveContractAbi({
      address: contractAddress,
      abi: abiText,
    });
    expect(savedAbi.saved).toBe(true);

    const storedAbi = await retry(() => publicClient.getContractAbi({ address: contractAddress }), 10, 1_000);
    expect(storedAbi.address).toBe(contractAddress);
    expect(JSON.stringify(storedAbi.abi ?? storedAbi.methods ?? [])).toContain('inc');

    const storedSource = await retry(() => publicClient.getContractSource({ address: contractAddress }), 10, 1_000);
    expect(`${storedSource.source ?? ''}${JSON.stringify(storedSource.files)}`).toContain('Counter');

    const counter = getContract({
      address: contractAddress,
      abi,
      client: { public: publicClient, wallet },
    });

    const before = await retry(() => counter.read.get<number>(), 20, 1_000);
    expect(Number(before)).toBeGreaterThanOrEqual(0);

    const callFee = await publicClient.estimateFee({ opType: 'call', speed: 'fast' });
    const write = await counter.write.inc([], {
      ou: maxBigIntString('1000', callFee.fee),
    });
    expect(write.tx_hash).toHaveLength(64);

    const writeTx = await waitForStatus(publicClient, write.tx_hash, ['confirmed'], 90_000);
    expect(writeTx.status).toBe('confirmed');
    const receipt = await retry(() => publicClient.getContractReceipt({ hash: write.tx_hash }), 20, 1_000);
    expect(receipt.contract).toBe(contractAddress);
    expect(receipt.method).toBe('inc');
    expect(receipt.success).toBe(true);

    const after = await retry(() => counter.read.get<number>(), 20, 1_000);
    expect(Number(after)).toBe(Number(before) + 1);
  }, 180_000);
});

const counterSource = `contract Counter {
  state {
    owner: address
    count: int
  }

  event Incremented(by: address, value: int)

  constructor() {
    self.owner = origin
    self.count = 0
  }

  fn inc(): int {
    self.count += 1
    emit Incremented(caller, self.count)
    return self.count
  }

  view fn get(): int {
    return self.count
  }
}`;

function getRecipientAccount() {
  const seed = sha256(utf8ToBytes(process.env.OCTRA_BROADCAST_RECIPIENT_SEED ?? 'octra-ts broadcast recipient v1'));
  return privateKeyToAccount(seed);
}

async function ensurePublicKeyRegistered(account: ReturnType<typeof privateKeyToAccount>) {
  const publicClient = createPublicClient({
    chain: octraPreMainnet,
    transport: http(rpcUrl, { timeout: 20_000, retryCount: 1, retryDelay: 100 }),
  });
  try {
    const publicKey = await publicClient.getPublicKey({ address: account.address });
    if (publicKey.public_key === account.publicKey) return;
  } catch {
    // Continue to registration. Fresh recipient accounts commonly have no stored public key.
  }

  const wallet = createWalletClient({
    account,
    chain: octraPreMainnet,
    transport: http(rpcUrl, { timeout: 20_000, retryCount: 1, retryDelay: 100 }),
  });
  const result = await wallet.registerPublicKey();
  expect(result.address).toBe(account.address);
}

async function findTransaction(
  client: PublicClient,
  hash: string,
  attempts = 20,
): Promise<Transaction> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await client.getTransaction({ hash });
    } catch (error) {
      lastError = error;
      await sleep(1_000);
    }
  }
  throw lastError ?? new Error(`Transaction ${hash} was not found`);
}

async function waitForStatus(
  client: PublicClient,
  hash: string,
  statuses: readonly string[],
  timeout: number,
): Promise<Transaction> {
  const started = Date.now();
  let lastTransaction: Transaction | undefined;
  while (Date.now() - started < timeout) {
    try {
      const transaction = await client.getTransaction({ hash });
      lastTransaction = transaction;
      if (statuses.includes(transaction.status)) return transaction;
      if (transaction.status === 'rejected' || transaction.status === 'dropped') return transaction;
    } catch {
      // The tx index can lag immediately after submit.
    }
    await sleep(1_000);
  }
  throw new Error(`Timed out waiting for ${hash}; last status ${lastTransaction?.status ?? 'unknown'}`);
}

async function waitForContract(
  client: PublicClient,
  address: ContractAddress,
) {
  return retry(() => client.getContract({ address }), 30, 1_000);
}

async function retry<result>(
  run: () => Promise<result>,
  attempts: number,
  delay: number,
): Promise<result> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      await sleep(delay);
    }
  }
  throw lastError ?? new Error('Retry attempts exhausted');
}

function maxBigIntString(left: string, right: string): string {
  return (BigInt(left) > BigInt(right) ? BigInt(left) : BigInt(right)).toString();
}

async function expectRpcFailure(
  run: () => Promise<unknown>,
  hints: readonly string[],
): Promise<void> {
  try {
    await run();
    throw new Error('expected RPC failure');
  } catch (error) {
    expect(error).toBeInstanceOf(OctraRpcError);
    const message = error instanceof OctraRpcError
      ? `${error.message} ${JSON.stringify(error.data ?? '')}`.toLowerCase()
      : String(error).toLowerCase();
    expect(hints.some((hint) => message.includes(hint))).toBe(true);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
