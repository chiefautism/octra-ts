import { chmod, cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await mkdir(resolve(root, 'dist/pvac'), { recursive: true });
await cp(
  resolve(root, 'src/pvac/wasm'),
  resolve(root, 'dist/pvac/wasm'),
  { recursive: true },
);

await chmod(resolve(root, 'dist/cli.js'), 0o755).catch(() => {});
