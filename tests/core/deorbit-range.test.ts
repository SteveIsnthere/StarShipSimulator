/**
 * DEORBIT_ENTRY_RANGE is not stale: the deorbit acceptance flight touches down
 * within 1 km of the pad (measured 0.01 km on 2026-10-01).
 *
 * `orbit-demo.test.ts` holds the 10 km acceptance bound; this is the tighter
 * staleness check Phase 5 added, so a guidance change that moves autoLand's
 * range fails here first and the constant is re-derived in the same commit
 * (`npm run deorbit:range` prints the new value: the constant plus the miss).
 */
import { describe, expect, it } from 'vitest';
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

describe('an engine out on the deorbit still lands, with propellant to spare', () => {
  /*
    A regression net, not a margin. With any one engine failed the deorbit
    lands on a knife edge: 0.11, 0.21 and 0.22 t left (Phase 5; it was 0.00 t
    before Phase 5 Task 4). The cause is the 12 t dumpLimit, which leaves no
    engine-out reserve (backlog). A guidance change that spends a few hundred
    kilograms more fails here, by name, instead of quietly crashing a flight
    nobody re-flies.
  */
  it.each([0, 1, 2] as const)('engine %i out', (engine) => {
    const m = measureDeorbitRange((s) => {
      s.engines.failed[engine] = true;
    });
    expect(m.outcome).toBe('landed');
    expect(m.propellant, `${m.propellant.toFixed(3)} t left`).toBeGreaterThan(0);
  });
});
