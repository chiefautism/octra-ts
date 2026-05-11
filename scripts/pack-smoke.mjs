import { $ } from 'bun';
import { mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspace = mkdtempSync(join('/private/tmp', 'octra-ts-pack-smoke-'));
const packDir = join(workspace, 'pack');
const consumerDir = join(workspace, 'consumer');

try {
  mkdirSync(packDir, { recursive: true });
  mkdirSync(consumerDir, { recursive: true });
  await $`bun pm pack --destination ${packDir} --quiet`.cwd(root).env({ ...process.env, TMPDIR: '/private/tmp' });

  const tarball = readdirSync(packDir)
    .find((file) => file.endsWith('.tgz'));
  if (!tarball) throw new Error('bun pm pack did not produce a tarball');

  writeFileSync(join(consumerDir, 'package.json'), JSON.stringify({
    private: true,
    type: 'module',
  }, null, 2));
  const extractDir = join(workspace, 'extract');
  const nodeModulesDir = join(consumerDir, 'node_modules');
  mkdirSync(extractDir, { recursive: true });
  mkdirSync(nodeModulesDir, { recursive: true });
  await $`tar -xzf ${join(packDir, tarball)} -C ${extractDir}`;
  renameSync(join(extractDir, 'package'), join(nodeModulesDir, 'octra-ts'));
  writeFileSync(join(consumerDir, 'smoke.mjs'), `
import { createPublicClient, custom, getContract, defineAbi } from 'octra-ts'
import { privateKeyToAccount, mnemonicToAccount } from 'octra-ts/accounts'
import { parseContractAbi } from 'octra-ts/contract'
import { browserWallet } from 'octra-ts/adapters/browser'
import { fallback, http } from 'octra-ts/transports'
import { createPvacWasmBackendFromContext } from 'octra-ts/pvac'
import { existsSync } from 'node:fs'

if (!createPublicClient || !custom || !getContract || !defineAbi) throw new Error('root exports missing')
if (!privateKeyToAccount || !mnemonicToAccount) throw new Error('account exports missing')
if (!parseContractAbi) throw new Error('contract exports missing')
if (!browserWallet) throw new Error('browser adapter export missing')
if (!fallback || !http) throw new Error('transport exports missing')
if (!createPvacWasmBackendFromContext) throw new Error('pvac exports missing')
if (!existsSync('node_modules/octra-ts/dist/pvac/wasm/pvac_rs_bg.wasm')) throw new Error('pvac wasm asset missing')
if (!existsSync('node_modules/octra-ts/dist/cli.js')) throw new Error('cli bin missing')

const client = createPublicClient({ transport: custom({ request: async () => ({ node: 'octra' }) }) })
const result = await client.request({ method: 'node_version', params: [] })
if (result.node !== 'octra') throw new Error('client request failed')
`);
  await $`node smoke.mjs`.cwd(consumerDir);
  const account = await $`node node_modules/octra-ts/dist/cli.js account --key 000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`.cwd(consumerDir).text();
  if (!account.includes('oct6ooAjytx2tERAi6rpXCqxMKCBr4z6Kw3UoRDbuuAUiGT')) {
    throw new Error('cli account smoke failed');
  }
} finally {
  rmSync(workspace, { force: true, recursive: true });
}
