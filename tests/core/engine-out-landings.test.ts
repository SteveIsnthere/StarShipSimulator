/**
 * Engine-out landings: what happens today when one or two Raptors are lost
 * before the landing burn, held as a regression net through Phase 5.
 *
 * These are the outcomes as measured (`npm run margins`, landing-margins.json),
 * not as hoped: two engines out on the landing-burn scenario crashes today, and
 * that is recorded rather than asserted away. A guidance change may turn a
 * crash into a landing (update the record in the same commit); it may not turn
 * a landing into a crash.
 */
import { describe, expect, it } from 'vitest';
import record from '../golden/landing-margins.json';
import { buildEngineOut, ENGINE_OUT, flyAndMeasure } from '../golden/landing-margins';

describe('engine-out landings hold their recorded outcome', () => {
  for (const variant of ENGINE_OUT) {
    const recorded = record.engineOut.find((f) => f.id === variant.id)!;
    it(`${variant.id}: ${recorded.outcome}`, () => {
      const flown = flyAndMeasure(variant.id, buildEngineOut(variant), false);
      if (recorded.outcome === 'landed') {
        expect(flown.outcome).toBe('landed');
        expect(Math.abs(flown.speedY)).toBeLessThan(10);
      } else {
        // A crash today may become a landing; it is recorded either way.
        expect(['landed', recorded.outcome]).toContain(flown.outcome);
      }
    });
  }
});
