import { describe, expect, test } from 'bun:test';

import { runCli } from '../src/cli.js';

const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';

describe('CLI', () => {
  test('prints help', async () => {
    const output = await captureStdout(() => runCli(['--help']));

    expect(output).toContain('octra-ts CLI');
    expect(output).toContain('octra balance <address>');
    expect(output).toContain('octra send <to> --amount <oct|raw> --key <hex|base64> --yes');
    expect(output).toContain('octra contract deploy <main.aml> --key <hex|base64> --yes');
    expect(output).toContain('octra contract verify <address> <main.aml>');
  });

  test('derives account JSON from a private key', async () => {
    const output = await captureStdout(() => runCli(['account', '--key', key]));
    const account = JSON.parse(output);

    expect(account.address).toBe('oct6ooAjytx2tERAi6rpXCqxMKCBr4z6Kw3UoRDbuuAUiGT');
    expect(account.public_key).toBe('A6EHv/POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg=');
  });

  test('requires explicit confirmation before send broadcasts', async () => {
    await expect(
      runCli([
        'send',
        'oct11111111111111111111111111111111111111111111',
        '--amount',
        '1',
        '--key',
        key,
      ]),
    ).rejects.toThrow('pass --yes');
  });

  test('requires explicit confirmation before contract deploy broadcasts', async () => {
    await expect(
      runCli([
        'contract',
        'deploy',
        '--bytecode',
        'AAAA',
        '--key',
        key,
      ]),
    ).rejects.toThrow('pass --yes');
  });

  test('requires explicit confirmation before contract write broadcasts', async () => {
    await expect(
      runCli([
        'contract',
        'write',
        'oct11111111111111111111111111111111111111111111',
        'inc',
        '--key',
        key,
      ]),
    ).rejects.toThrow('pass --yes');
  });
});

async function captureStdout(task: () => Promise<void>): Promise<string> {
  const original = console.log;
  const lines: string[] = [];
  console.log = (...values: unknown[]) => {
    lines.push(values.join(' '));
  };

  try {
    await task();
  } finally {
    console.log = original;
  }

  return lines.join('\n');
}
