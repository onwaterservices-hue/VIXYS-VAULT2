/**
 * Universal Precision Countdown & Cycle Sync Utilities
 * Guarantees jitter-free, second-by-second countdowns across the entire application.
 */

export function calculateCycleSecondsRemaining(
  durationSec: number = 900,
  cycleEndMs?: number,
  nowMs: number = Date.now()
): number {
  if (cycleEndMs && cycleEndMs > nowMs) {
    const diff = Math.max(0, Math.floor((cycleEndMs - nowMs) / 1000));
    // If cycleEnd diff is within a valid cycle window (<= durationSec + 30), use it
    if (diff > 0 && diff <= durationSec + 30) {
      return diff;
    }
  }

  // Exact UTC-epoch modulo alignment
  const epochSec = Math.floor(nowMs / 1000);
  const mod = epochSec % durationSec;
  const rem = durationSec - mod;
  return rem === 0 ? durationSec : rem;
}

export function formatCountdownMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatCountdownHhMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
