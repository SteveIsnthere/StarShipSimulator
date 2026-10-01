/**
 * DEORBIT_ENTRY_RANGE is not stale: the deorbit acceptance flight touches down
 * within 1 km of the pad (measured 0.00 km on 2026-10-01, Phase 6 Task 3).
 *
 * `orbit-demo.test.ts` holds the 10 km acceptance bound; this is the tighter
 * staleness check Phase 5 added, so a guidance change that moves autoLand's
 * range fails here first and the constant is re-derived in the same commit
 * (`npm run deorbit:range` prints the new value: the constant plus the miss).
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { measureDeorbitRange } from '../golden/deorbit-range';

describe('the deorbit aim matches the autoLand it aims for', () => {
  const m = measureDeorbitRange();

  it('lands', () => {
    expect(m.outcome).toBe('landed');
  });

  it('within 1 km of the pad', () => {
    expect(Math.abs(m.miss), `missed by ${(m.miss / 1000).toFixed(2)} km; re-derive with npm run deorbit:range`).toBeLessThan(1_000);
  });
});

describe('an engine out on the deorbit still lands, with the reserve doing its job', () => {
  /*
    The landing reserve's health check (constants.ts, `landingReserve`). With
    the old 12 t dump target an engine-out deorbit landed on a knife edge,
    0.00 to 0.22 t left. The 16 t reserve leaves 2.98 to 3.06 t (2026-10-01).
    The bound is an eighth of the reserve, 2 t: a change that makes the landing
    a tonne costlier fails here, by name, and the reserve is re-measured in the
    same commit (the engine-out use at the dump target, plus a third).
  */
  it.each([0, 1, 2] as const)('engine %i out', (engine) => {
    const m = measureDeorbitRange((s) => {
      s.engines.failed[engine] = true;
    });
    expect(m.outcome).toBe('landed');
    expect(m.propellant, `${m.propellant.toFixed(3)} t left`).toBeGreaterThan(C.landingReserve / 8 / 1000);
  });

  it('the reserve sits above the level a dump stops at on its own', () => {
    // autoLand stops its dump at the reserve; a reserve below dumpLimit would
    // be cut short at 12 t by the engine model instead.
    expect(C.landingReserve).toBeGreaterThan(C.dumpLimit);
  });
});
