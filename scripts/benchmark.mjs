#!/usr/bin/env bun
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { cpus } from 'node:os';

const args = new Set(process.argv.slice(2));
const includeCommands = !args.has('--skip-commands');
const includePvac = args.has('--pvac') || process.env.OCTRA_BENCH_PVAC === '1';

const rows = [];

function formatMs(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(2)}ms`;
}

function formatRate(iterations, ms) {
  return `${Math.round((iterations / ms) * 1000).toLocaleString('en-US')}/s`;
}

function addRow(section, name, value, notes = '') {
  rows.push({ section, name, value, notes });
}

function printRows() {
  const widths = {
    section: Math.max('section'.length, ...rows.map((row) => row.section.length)),
    name: Math.max('benchmark'.length, ...rows.map((row) => row.name.length)),
    value: Math.max('result'.length, ...rows.map((row) => row.value.length)),
  };

  console.log(`| ${'section'.padEnd(widths.section)} | ${'benchmark'.padEnd(widths.name)} | ${'result'.padEnd(widths.value)} | notes |`);
  console.log(`| ${'-'.repeat(widths.section)} | ${'-'.repeat(widths.name)} | ${'-'.repeat(widths.value)} | ----- |`);
  for (const row of rows) {
    console.log(`| ${row.section.padEnd(widths.section)} | ${row.name.padEnd(widths.name)} | ${row.value.padEnd(widths.value)} | ${row.notes} |`);
  }
}

function runCommand(name, command, parameters) {
  const started = performance.now();
  const result = spawnSync(command, parameters, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const elapsed = performance.now() - started;

  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`${name} failed with exit code ${result.status}`);
  }

  addRow('commands', name, formatMs(elapsed), `${command} ${parameters.join(' ')}`);
}

async function benchAsync(section, name, iterations, task) {
  await task();
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    await task(index);
  }
  const elapsed = performance.now() - started;
  addRow(section, name, formatMs(elapsed), `${iterations.toLocaleString('en-US')} ops, ${formatRate(iterations, elapsed)}`);
}

async function timeAsync(section, name, task, notes = '') {
  const started = performance.now();
  const value = await task();
  const elapsed = performance.now() - started;
  addRow(section, name, formatMs(elapsed), notes || String(value ?? ''));
  return value;
}

function parseThreadOption(value) {
  if (!value || value === 'auto') return 'auto';
  if (value === 'false' || value === 'off' || value === '0') return false;
  return Number(value);
}

if (includeCommands) {
  runCommand('bun test', 'bun', ['test']);
  runCommand('bun run build', 'bun', ['run', 'build']);
  runCommand('bun run pack:smoke', 'bun', ['run', 'pack:smoke']);
}

const {
  createPublicClient,
  createWalletClient,
  custom,
  formatOctra,
  parseOctra,
  serializeTransactionForRpc,
  sha256,
  utf8ToBytes,
} = await import('../dist/index.js');
const { privateKeyToAccount, mnemonicToAccount } = await import('../dist/accounts/index.js');

const publicMnemonic = 'test test test test test test test test test test test junk';
const seed = new Uint8Array(32).fill(7);
const account = privateKeyToAccount(seed);
const recipient = 'oct22222222222222222222222222222222222222222222';
const unsigned = {
  from: account.address,
  to: recipient,
  amount: '1',
  nonce: 1,
  ou: '10000',
  opType: 'standard',
  message: 'benchmark',
};
const publicClient = createPublicClient({
  transport: custom({
    request: async (request) => {
      if (request.method === 'octra_balance') {
        return {
          address: account.address,
          balance: '1',
          balance_raw: '1000000',
          nonce: 1,
          pending_nonce: 1,
          has_public_key: true,
        };
      }
      if (request.method === 'octra_recommendedFee') {
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
      return {};
    },
  }),
});
const wallet = createWalletClient({
  account,
  transport: custom({
    request: async (request) => {
      if (request.method === 'octra_balance') {
        return {
          address: account.address,
          balance: '1',
          balance_raw: '1000000',
          nonce: 1,
          pending_nonce: 1,
          has_public_key: true,
        };
      }
      return { tx_hash: 'a'.repeat(64), status: 'accepted', nonce: 2, ou_cost: '10000' };
    },
  }),
});

addRow('runtime', 'cpu count', String(cpus().length), 'logical CPUs visible to Node');
addRow('runtime', 'navigator.hardwareConcurrency', String(globalThis.navigator?.hardwareConcurrency ?? 'n/a'));

await benchAsync('utils', 'parseOctra + formatOctra', 100_000, () => {
  const parsed = parseOctra('123.456789');
  formatOctra(parsed);
});
await benchAsync('utils', 'sha256(32 bytes)', 100_000, () => {
  sha256(seed);
});
await benchAsync('tx', 'serializeTransactionForRpc', 50_000, () => {
  serializeTransactionForRpc(unsigned, 'sig', account.publicKey);
});
await benchAsync('account', 'signTransaction', 5_000, () => account.signTransaction(unsigned));
await benchAsync('account', 'privateKeyToAccount', 2_000, () => {
  privateKeyToAccount(seed);
});
await benchAsync('account', 'mnemonicToAccount', 100, () => {
  mnemonicToAccount(publicMnemonic);
});
await benchAsync('client', 'custom getBalance', 50_000, () => publicClient.getBalance({ address: account.address }));
await benchAsync('client', 'prepareTransaction standard', 10_000, () => publicClient.prepareTransaction({
  from: account.address,
  to: recipient,
  amount: '1',
}));
await benchAsync('wallet', 'sendTransfer mocked submit', 5_000, () => wallet.sendTransfer({
  to: recipient,
  amount: '1',
  nonce: 1,
  ou: '10000',
}));

if (includePvac) {
  const { createPvacWasmBackend } = await import('../dist/pvac/index.js');
  const threads = parseThreadOption(process.env.OCTRA_BENCH_PVAC_THREADS ?? 'auto');
  let pvac;
  try {
    pvac = await timeAsync('pvac', 'createPvacWasmBackend', () => createPvacWasmBackend({
      seed,
      threads,
      preWarm: true,
    }), `threads=${String(threads)}`);
    addRow('pvac', 'rayonThreadCount', String(pvac.rayonThreadCount()));
    await timeAsync('pvac', 'serializePubkey', () => pvac.serializePubkey(), 'registration blob');
    const encrypted = await timeAsync('pvac', 'buildEncryptPayload', () => pvac.buildEncryptPayload({ amount: 10n }), 'encrypt + bound proof');
    const cipher = JSON.parse(encrypted.encryptedData).cipher;
    await timeAsync('pvac', 'decryptCipher', () => pvac.decryptCipher(cipher));
    await timeAsync('pvac', 'buildDecryptPayload', () => pvac.buildDecryptPayload({
      amount: 1n,
      currentCipher: cipher,
      currentBalance: 10n,
    }), 'range proof hot path');
  } finally {
    pvac?.free();
  }
}

printRows();

if (includePvac) {
  process.exit(0);
}
