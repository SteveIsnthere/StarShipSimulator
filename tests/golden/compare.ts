/**
 * How a replayed sample is compared with its golden.
 *
 * The fixtures were recorded on x86-64 Linux under Node 22. There, replay is
 * bit-identical and is checked with `Object.is`. Elsewhere — Steve's arm64 Mac,
 * a different V8 — `Math.exp`, `**` and `Math.sqrt` can round the last bit
 * differently, and those differences compound over thousands of steps. Measured
 * on arm64 macOS, Node 25.8.1, over every sample of all eight fixtures: the
 * largest relative difference was 2.03e-11 (rtls-boostback,
 * kinematics.angularAcceleration, a value near 1e-6 where cancellation inflates
 * the relative error). Everything else was at or below 1e-14.
 *
 * GOLDEN_REL_TOL is 100x that measurement rounded up to a power of ten. A real
 * physics change moves values by far more: tests/golden/compare.test.ts proves
 * a 1e-6 relative change in one input fails the replay.
 */

/** The platform the fixtures were recorded on, where replay must be exact. */
export function isRecordingPlatform(): boolean {
  return (
    process.platform === 'linux' &&
    process.arch === 'x64' &&
    process.versions.node.split('.')[0] === '22'
  );
}

export const GOLDEN_REL_TOL = 1e-8;

/** The tolerance in force on this machine: exact on the recording platform. */
export const ACTIVE_REL_TOL = isRecordingPlatform() ? 0 : GOLDEN_REL_TOL;

/** Relative difference, robust at zero and for non-finite sentinels. */
export function relDiff(got: unknown, want: unknown): number {
  if (Object.is(got, want)) return 0;
  if (typeof got !== 'number' || typeof want !== 'number') return Infinity;
  if (!Number.isFinite(got) || !Number.isFinite(want)) return Infinity;
  const scale = Math.max(Math.abs(got), Math.abs(want), Number.MIN_VALUE);
  return Math.abs(got - want) / scale;
}
