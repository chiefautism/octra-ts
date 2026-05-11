/**
 * Re-export the pvac-rs WASM module for convenience.
 * Consumers can import directly:
 *   import { initPvac } from '@0xio/pvac';
 *   const wasm = await initPvac();
 */

// Dynamic import path — NOT resolved by rollup at build time
const WASM_PATH = '../wasm/pvac_rs.js';

export async function initPvac(): Promise<any> {
  const mod = await import(WASM_PATH);
  await mod.default(await getWasmInitInput()); // calls wasm init
  return mod;
}

async function getWasmInitInput(): Promise<unknown> {
  const processLike = (globalThis as { process?: { versions?: { node?: string } } }).process;
  if (!processLike?.versions?.node || typeof window !== 'undefined') return undefined;

  const { readFile } = await import('node:fs/promises');
  return {
    module_or_path: await readFile(new URL('../wasm/pvac_rs_bg.wasm', import.meta.url)),
  };
}
