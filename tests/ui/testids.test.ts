/**
 * M6.1: the test-id contract closes its own loop.
 *
 * `src/ui/testids.ts` deliberately has no imports, so that Playwright — which
 * compiles specs without vite's path aliases — can read it. The price is that
 * the readout ids are transcribed rather than derived, and a transcription can
 * drift from its source silently.
 *
 * This is the test that makes drift loud. It is the only place the contract and
 * `$hud/readouts` are compared, and it runs in the unit suite where both are
 * reachable.
 */
import { describe, expect, it } from 'vitest';
import { READOUTS } from '$hud/readouts';
import { INDICATORS } from '$hud/indicators';
import {
  ALL_TESTIDS,
  byTestId,
  CONTROL_TESTIDS,
  READOUT_IDS,
  readoutTestId,
  readoutUnitTestId,
  readoutValueTestId,
} from '$ui/testids';

describe('the contract matches what the HUD actually renders', () => {
  it('names every readout, in the order they are displayed', () => {
    expect([...READOUT_IDS]).toEqual(READOUTS.map((r) => r.id));
  });

  it('gives every readout three ids: row, value, unit', () => {
    for (const id of READOUT_IDS) {
      expect(ALL_TESTIDS).toContain(readoutTestId(id));
      expect(ALL_TESTIDS).toContain(readoutValueTestId(id));
      expect(ALL_TESTIDS).toContain(readoutUnitTestId(id));
    }
  });
});

describe('the contract covers every lit control', () => {
  /**
   * Indicator ids are camelCase (they match the ControlEvent union); test ids
   * are kebab-case. The mapping is mechanical, and asserting it here is what
   * stops a new autopilot mode from arriving with a light and no test id.
   */
  const kebab = (id: string) => id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

  it('has a test id for each indicator', () => {
    for (const indicator of INDICATORS) {
      // raptor0 -> raptor-0; the digits do not get a hyphen from the rule above.
      const expected = kebab(indicator.id).replace(/(\d)$/, '-$1');
      expect(CONTROL_TESTIDS, indicator.id).toContain(expected);
    }
  });
});

describe('the ids themselves are usable', () => {
  it('are unique — a duplicate would make a locator ambiguous', () => {
    expect(new Set(ALL_TESTIDS).size).toBe(ALL_TESTIDS.length);
  });

  it('are kebab-case, so nothing needs quoting or escaping', () => {
    for (const id of CONTROL_TESTIDS) expect(id, id).toMatch(/^[a-z0-9-]+$/);
  });

  it('build the selector a spec would write by hand', () => {
    expect(byTestId('auto-land')).toBe('[data-testid="auto-land"]');
  });
});
