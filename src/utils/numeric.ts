/**
 * Safe numeric normalization layer
 * Guarantees zero runtime crashes from undefined, null, or non-finite values.
 */

export function safeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function safeToFixed(value: unknown, digits = 2, fallback = '0.00'): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return n.toFixed(digits);
}

export function safePercent(value: unknown, digits = 1, fallback = '0.0'): string {
  const n = safeNumber(value, 0);
  return n.toFixed(digits);
}
