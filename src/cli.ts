#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient } from './publicClient.js';
import { createWalletClient } from './walletClient.js';
import { octraPreMainnet } from './chains.js';
import { http } from './transports/http.js';
import { parseOctra } from './utils/amount.js';
import { privateKeyToAccount, mnemonicToAccount } from './accounts/index.js';
import { createPvacWasmBackend } from './pvac/index.js';
import type { Account, AmlFile, ContractAddress, Json, OctraAddress, RpcMethod } from './types.js';

type CliOptions = {
  amount?: string;
  abi?: string;
  bytecode?: string;
  caller?: string;
  format: 'json' | 'pretty';
  files: string[];
  from?: string;
  help: boolean;
  key?: string;
  main?: string;
  mnemonic?: string;
  nonce?: number;
  ou?: string;
  params: string[];
  raw: boolean;
  rpc: string;
  saveAbi: boolean;
  threads?: string;
  verify: boolean;
  wait: boolean;
  yes: boolean;
};

type ParsedArgs = {
  command?: string;
  options: CliOptions;
  positionals: string[];
};

const defaultOptions: CliOptions = {
  format: 'json',
  files: [],
  help: false,
  params: [],
  raw: false,
  rpc: process.env.OCTRA_RPC_URL ?? octraPreMainnet.rpcUrls.default.http[0],
  saveAbi: false,
  verify: false,
  wait: false,
  yes: false,
};

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseArgs(argv);
  if (!parsed.command || parsed.options.help) {
    printHelp();
    return;
  }

  const client = createPublicClient({
    chain: octraPreMainnet,
    transport: http(parsed.options.rpc, { timeout: 30_000, retryCount: 1, retryDelay: 150 }),
  });

  switch (parsed.command) {
    case 'version':
      print(await client.nodeVersion(), parsed.options);
      return;
    case 'status':
      print(await client.nodeStatus(), parsed.options);
      return;
    case 'stats':
      print(await client.nodeStats(), parsed.options);
      return;
    case 'balance': {
      const address = requireArg(parsed, 0, 'address') as OctraAddress;
      print(await client.getBalance({ address }), parsed.options);
      return;
    }
    case 'account': {
      const account = loadAccount(parsed.options);
      print({ address: account.address, public_key: account.publicKey }, parsed.options);
      return;
    }
    case 'tx': {
      const hash = requireArg(parsed, 0, 'hash');
      print(await client.getTransaction({ hash }), parsed.options);
      return;
    }
    case 'fee': {
      const opType = parsed.positionals[0] ?? 'standard';
      print(await client.estimateFee({ opType }), parsed.options);
      return;
    }
    case 'rpc': {
      const method = requireArg(parsed, 0, 'method') as RpcMethod;
      const params = parsed.positionals.slice(1).map(parseParam);
      print(await client.request({ method, params: params as never }), parsed.options);
      return;
    }
    case 'send': {
      if (!parsed.options.yes) throw new Error('send broadcasts a transaction; pass --yes to continue');
      const account = loadAccount(parsed.options);
      const to = requireArg(parsed, 0, 'to') as OctraAddress;
      const amount = requireValue(parsed.options.amount, '--amount');
      const wallet = createWalletClient({
        account,
        chain: octraPreMainnet,
        transport: http(parsed.options.rpc, { timeout: 30_000, retryCount: 1, retryDelay: 150 }),
      });
      const rawAmount = parsed.options.raw ? amount : parseOctra(amount).toString();
      const result = parsed.options.wait
        ? await wallet.sendTransferAndWait({
          to,
          amount: rawAmount,
          wait: { timeout: 90_000, pollingInterval: 2_000 },
        })
        : await wallet.sendTransfer({ to, amount: rawAmount });
      print(result, parsed.options);
      return;
    }
    case 'contract': {
      await runContractCommand(parsed, client);
      return;
    }
    case 'pvac': {
      await runPvacCommand(parsed);
      return;
    }
    default:
      throw new Error(`Unknown command "${parsed.command}"`);
  }
}

async function runContractCommand(
  parsed: ParsedArgs,
  client: ReturnType<typeof createPublicClient>,
): Promise<void> {
  const subcommand = requireArg(parsed, 0, 'contract subcommand');

  switch (subcommand) {
    case 'compile': {
      const entry = requireArg(parsed, 1, 'contract source file');
      const project = await readAmlProject(entry, parsed.options);
      const compiled = await compileProject(client, project);
      print(compiled, parsed.options);
      return;
    }
    case 'deploy': {
      if (!parsed.options.yes) throw new Error('contract deploy broadcasts a transaction; pass --yes to continue');
      const account = loadAccount(parsed.options);
      const wallet = createWallet(parsed.options, account);
      const deployment = await resolveDeploymentInput(parsed, client);
      const shouldWait = parsed.options.wait || parsed.options.verify || parsed.options.saveAbi;
      const deployParameters = {
        bytecode: deployment.bytecode,
        nonce: parsed.options.nonce,
        ou: parsed.options.ou,
        params: parsed.options.params.map(parseParam),
        wait: { timeout: 120_000, pollingInterval: 2_000 },
      };
      const deploy = shouldWait
        ? await wallet.deployContractAndWait(deployParameters)
        : await wallet.deployContract(deployParameters);
      const output: Record<string, unknown> = { deploy };
      const deployStatus = transactionStatus(deploy);
      if ((parsed.options.verify || parsed.options.saveAbi)
        && deployStatus
        && deployStatus !== 'confirmed') {
        throw new Error(`Deploy transaction reached ${deployStatus}; refusing post-deploy verify/save-abi`);
      }

      if (parsed.options.verify) {
        const project = deployment.project;
        if (!project) throw new Error('--verify requires an AML source file, not only --bytecode');
        output.verify = await retry(() => client.verifyContract({
          address: deploy.contract_address as ContractAddress,
          source: project.main.source,
          files: project.extra.length > 0 ? project.extra : undefined,
        }));
      }

      if (parsed.options.saveAbi) {
        const compiled = deployment.compiled;
        if (!compiled?.abi) throw new Error('--save-abi requires compiler ABI output');
        output.save_abi = await retry(() => client.saveContractAbi({
          address: deploy.contract_address as ContractAddress,
          abi: compiled.abi,
        }));
      }

      print(output, parsed.options);
      return;
    }
    case 'verify': {
      const address = requireArg(parsed, 1, 'contract address') as ContractAddress;
      const entry = requireArg(parsed, 2, 'contract source file');
      const project = await readAmlProject(entry, parsed.options);
      print(await client.verifyContract({
        address,
        source: project.main.source,
        files: project.extra.length > 0 ? project.extra : undefined,
      }), parsed.options);
      return;
    }
    case 'save-abi': {
      const address = requireArg(parsed, 1, 'contract address') as ContractAddress;
      const abi = parsed.options.abi
        ? await readText(parsed.options.abi)
        : requireArg(parsed, 2, 'ABI JSON or ABI file');
      print(await client.saveContractAbi({ address, abi: await maybeReadFile(abi) }), parsed.options);
      return;
    }
    case 'abi': {
      const address = requireArg(parsed, 1, 'contract address') as ContractAddress;
      print(await client.getContractAbi({ address }), parsed.options);
      return;
    }
    case 'list': {
      print(await client.listContracts(), parsed.options);
      return;
    }
    case 'source': {
      const address = requireArg(parsed, 1, 'contract address') as ContractAddress;
      print(await client.getContractSource({ address }), parsed.options);
      return;
    }
    case 'meta':
    case 'info': {
      const address = requireArg(parsed, 1, 'contract address') as ContractAddress;
      print(await client.getContract({ address }), parsed.options);
      return;
    }
    case 'storage': {
      const address = requireArg(parsed, 1, 'contract address') as ContractAddress;
      const key = requireArg(parsed, 2, 'storage key');
      print(await client.getContractStorage({ address, key }), parsed.options);
      return;
    }
    case 'receipt': {
      const hash = requireArg(parsed, 1, 'transaction hash');
      print(await client.getContractReceipt({ hash }), parsed.options);
      return;
    }
    case 'read':
    case 'call': {
      const address = requireArg(parsed, 1, 'contract address') as ContractAddress;
      const method = requireArg(parsed, 2, 'method');
      const params = parsed.positionals.slice(3).map(parseParam);
      print(await client.readContract({
        address,
        method,
        params,
        caller: parsed.options.caller as OctraAddress | undefined,
      }), parsed.options);
      return;
    }
    case 'write': {
      if (!parsed.options.yes) throw new Error('contract write broadcasts a transaction; pass --yes to continue');
      const account = loadAccount(parsed.options);
      const wallet = createWallet(parsed.options, account);
      const address = requireArg(parsed, 1, 'contract address') as ContractAddress;
      const method = requireArg(parsed, 2, 'method');
      const params = parsed.positionals.slice(3).map(parseParam);
      const amount = parsed.options.amount
        ? parsed.options.raw ? parsed.options.amount : parseOctra(parsed.options.amount).toString()
        : undefined;
      const result = parsed.options.wait
        ? await wallet.writeContractAndWait({
          address,
          method,
          params,
          amount,
          nonce: parsed.options.nonce,
          ou: parsed.options.ou,
          wait: { timeout: 90_000, pollingInterval: 2_000 },
        })
        : await wallet.writeContract({
          address,
          method,
          params,
          amount,
          nonce: parsed.options.nonce,
          ou: parsed.options.ou,
        });
      print(result, parsed.options);
      return;
    }
    default:
      throw new Error(`Unknown contract subcommand "${subcommand}"`);
  }
}

async function runPvacCommand(parsed: ParsedArgs): Promise<void> {
  const subcommand = requireArg(parsed, 0, 'pvac subcommand');
  const account = loadAccount(parsed.options);
  const pvac = await createPvacWasmBackend({
    seed: parsed.options.key ?? accountSeedFromOptions(parsed.options),
    threads: parseThreads(parsed.options.threads),
    preWarm: false,
  });
  try {
    if (subcommand === 'info') {
      print({
        address: account.address,
        pubkey_size: (await pvac.serializePubkey()).length,
        aes_kat: await pvac.computeAesKat(),
        rayon_threads: pvac.rayonThreadCount(),
      }, parsed.options);
      return;
    }
    throw new Error(`Unknown pvac subcommand "${subcommand}"`);
  } finally {
    pvac.free();
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const options: CliOptions = { ...defaultOptions, files: [], params: [] };
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--wait') options.wait = true;
    else if (arg === '--raw') options.raw = true;
    else if (arg === '--pretty') options.format = 'pretty';
    else if (arg === '--json') options.format = 'json';
    else if (arg === '--rpc') options.rpc = requireNext(argv, ++index, '--rpc');
    else if (arg === '--key') options.key = requireNext(argv, ++index, '--key');
    else if (arg === '--mnemonic') options.mnemonic = requireNext(argv, ++index, '--mnemonic');
    else if (arg === '--amount') options.amount = requireNext(argv, ++index, '--amount');
    else if (arg === '--abi') options.abi = requireNext(argv, ++index, '--abi');
    else if (arg === '--bytecode') options.bytecode = requireNext(argv, ++index, '--bytecode');
    else if (arg === '--caller') options.caller = requireNext(argv, ++index, '--caller');
    else if (arg === '--file') options.files.push(requireNext(argv, ++index, '--file'));
    else if (arg === '--main') options.main = requireNext(argv, ++index, '--main');
    else if (arg === '--nonce') options.nonce = parseIntegerOption(requireNext(argv, ++index, '--nonce'), '--nonce');
    else if (arg === '--ou') options.ou = requireNext(argv, ++index, '--ou');
    else if (arg === '--param') options.params.push(requireNext(argv, ++index, '--param'));
    else if (arg === '--save-abi') options.saveAbi = true;
    else if (arg === '--threads') options.threads = requireNext(argv, ++index, '--threads');
    else if (arg === '--verify') options.verify = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown option "${arg}"`);
    else positionals.push(arg);
  }

  return {
    command: positionals.shift(),
    options,
    positionals,
  };
}

function loadAccount(options: CliOptions): Account {
  if (options.mnemonic) return mnemonicToAccount(options.mnemonic);
  return privateKeyToAccount(accountSeedFromOptions(options));
}

function createWallet(options: CliOptions, account: Account): ReturnType<typeof createWalletClient> {
  return createWalletClient({
    account,
    chain: octraPreMainnet,
    transport: http(options.rpc, { timeout: 30_000, retryCount: 1, retryDelay: 150 }),
  });
}

function accountSeedFromOptions(options: CliOptions): string {
  const key = options.key ?? process.env.OCTRA_PRIVATE_KEY_HEX ?? process.env.OCTRA_PRIVATE_KEY_B64;
  if (!key) throw new Error('Set --key, OCTRA_PRIVATE_KEY_HEX, or OCTRA_PRIVATE_KEY_B64');
  return key;
}

function parseThreads(value: string | undefined): number | 'auto' | false | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'auto') return 'auto';
  if (normalized === 'false' || normalized === 'off' || normalized === '0') return false;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error('--threads must be a positive integer, auto, or false');
  return parsed;
}

function parseParam(value: string): Json {
  try {
    return JSON.parse(value) as Json;
  } catch {
    return value;
  }
}

function parseIntegerOption(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${option} must be a non-negative integer`);
  return parsed;
}

type AmlProject = {
  files: AmlFile[];
  main: AmlFile;
  extra: AmlFile[];
};

type DeploymentInput = {
  bytecode: string;
  compiled?: Awaited<ReturnType<ReturnType<typeof createPublicClient>['compileAml']>>;
  project?: AmlProject;
};

async function resolveDeploymentInput(
  parsed: ParsedArgs,
  client: ReturnType<typeof createPublicClient>,
): Promise<DeploymentInput> {
  if (parsed.options.bytecode) return { bytecode: await maybeReadFile(parsed.options.bytecode) };
  const entry = requireArg(parsed, 1, 'contract source file or --bytecode');
  const project = await readAmlProject(entry, parsed.options);
  const compiled = await compileProject(client, project);
  return { bytecode: compiled.bytecode, compiled, project };
}

async function compileProject(
  client: ReturnType<typeof createPublicClient>,
  project: AmlProject,
) {
  if (project.files.length === 1 && !project.extra.length) {
    return client.compileAml({ source: project.main.source });
  }
  return client.compileAmlMulti({ files: project.files, main: project.main.path });
}

async function readAmlProject(entry: string, options: CliOptions): Promise<AmlProject> {
  const paths = unique([entry, ...options.files]);
  const files = await Promise.all(paths.map(async (path) => ({
    path,
    source: await readText(path),
  })));
  const mainPath = options.main ?? entry;
  const main = files.find((file) => file.path === mainPath);
  if (!main) throw new Error(`--main must match one of the source files (${paths.join(', ')})`);
  return {
    files,
    main,
    extra: files.filter((file) => file.path !== main.path),
  };
}

async function readText(path: string): Promise<string> {
  return readFile(resolve(path), 'utf8');
}

async function maybeReadFile(value: string): Promise<string> {
  if (looksLikeInlineJsonOrBytecode(value)) return value;
  try {
    return await readText(value);
  } catch {
    return value;
  }
}

function looksLikeInlineJsonOrBytecode(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[') || /^[A-Za-z0-9+/=_-]{80,}$/.test(trimmed);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function transactionStatus(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('transaction' in value)) return undefined;
  const transaction = (value as { transaction?: unknown }).transaction;
  if (!transaction || typeof transaction !== 'object' || !('status' in transaction)) return undefined;
  const status = (transaction as { status?: unknown }).status;
  return typeof status === 'string' ? status : undefined;
}

async function retry<result>(task: () => Promise<result>, attempts = 10, delayMs = 1_000): Promise<result> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(delayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function print(value: unknown, options: CliOptions): void {
  if (options.format === 'pretty') {
    console.log(JSON.stringify(value, bigintReplacer, 2));
    return;
  }
  console.log(JSON.stringify(value, bigintReplacer));
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

function requireArg(parsed: ParsedArgs, index: number, name: string): string {
  const value = parsed.positionals[index];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function requireValue(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function requireNext(argv: string[], index: number, option: string): string {
  const value = argv[index];
  if (!value) throw new Error(`Missing value for ${option}`);
  return value;
}

function printHelp(): void {
  console.log(`octra-ts CLI

Usage:
  octra version [--rpc URL]
  octra status [--rpc URL]
  octra stats [--rpc URL]
  octra balance <address> [--rpc URL]
  octra tx <hash> [--rpc URL]
  octra fee [op_type] [--rpc URL]
  octra rpc <method> [...json_params] [--rpc URL]
  octra account --key <hex|base64>
  octra send <to> --amount <oct|raw> --key <hex|base64> --yes [--raw] [--wait]
  octra contract compile <main.aml> [--file dep.aml ...] [--main main.aml]
  octra contract deploy <main.aml> --key <hex|base64> --yes [--wait] [--verify] [--save-abi]
  octra contract deploy --bytecode <base64|file> --key <hex|base64> --yes [--param JSON ...]
  octra contract verify <address> <main.aml> [--file dep.aml ...] [--main main.aml]
  octra contract read <address> <method> [...json_params] [--caller address]
  octra contract write <address> <method> [...json_params] --key <hex|base64> --yes [--wait]
  octra contract abi|source|meta|info <address>
  octra contract list
  octra contract storage <address> <key>
  octra contract receipt <tx_hash>
  octra pvac info --key <hex|base64> [--threads auto|N|false]

Options:
  --json              JSON output (default)
  --pretty           Pretty JSON output
  --rpc URL          RPC endpoint (default: OCTRA_RPC_URL or pre-mainnet RPC)
  --key KEY          Private key seed as hex or base64
  --mnemonic WORDS   Mnemonic for account command
  --amount VALUE     OCT amount by default; raw microOCT with --raw
  --ou VALUE         Raw operation units for write/deploy
  --nonce N          Explicit nonce for write/deploy
  --param JSON       Constructor parameter; repeat for multiple params
  --file PATH        Additional AML source file
  --bytecode VALUE   Deploy base64 bytecode, or read it from a file path
  --verify           Verify source after deploy
  --save-abi         Save compiler ABI after deploy
  --yes              Required for broadcasting commands
  --wait             Wait for transaction confirmation where supported
`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli().then(() => {
    process.exit(0);
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`octra: ${message}`);
    process.exit(1);
  });
}
