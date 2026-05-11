const OCTRA_DECIMALS = 6n;
const OCTRA_SCALE = 10n ** OCTRA_DECIMALS;

export function parseOctra(value: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error('Invalid OCT amount');
  const [integerPart, fractionPart = ''] = trimmed.split('.');
  if (fractionPart.length > Number(OCTRA_DECIMALS)) {
    throw new Error('OCT amount has more than 6 decimal places');
  }
  const integer = BigInt(integerPart || '0') * OCTRA_SCALE;
  const fraction = BigInt(fractionPart.padEnd(Number(OCTRA_DECIMALS), '0') || '0');
  return integer + fraction;
}

export function formatOctra(value: bigint | number | string): string {
  const raw = BigInt(value);
  const sign = raw < 0n ? '-' : '';
  const absolute = raw < 0n ? -raw : raw;
  const integer = absolute / OCTRA_SCALE;
  const fraction = (absolute % OCTRA_SCALE).toString().padStart(Number(OCTRA_DECIMALS), '0');
  const trimmedFraction = fraction.replace(/0+$/, '');
  return `${sign}${integer.toString()}${trimmedFraction ? `.${trimmedFraction}` : ''}`;
}

export function toRawAmount(value: bigint | number | string): string {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Raw amount number must be a positive safe integer');
    return String(value);
  }
  if (typeof value === 'bigint') {
    if (value < 0n) throw new Error('Raw amount must be positive');
    return value.toString();
  }
  if (!/^\d+$/.test(value)) throw new Error('Raw amount string must be an integer');
  return value;
}
