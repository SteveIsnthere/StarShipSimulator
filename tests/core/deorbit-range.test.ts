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
