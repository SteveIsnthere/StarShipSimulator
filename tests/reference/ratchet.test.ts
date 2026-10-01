/**
 * The ratchet: a tier-A reference row, once in band, stays in band.
 *
 * in-band.json lists the gated rows. A tier-A row that is in band but not
 * listed fails too, so a row that comes in band cannot quietly stay ungated.
 * Tier-A rows out of band are reported by `npm run truth:report`, not gated —
 * there is no list of tolerated failures.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BANDS } from './anchors';
import { judge } from './bands';

const gated: string[] = JSON.parse(
  readFileSync(new URL('./in-band.json', import.meta.url), 'utf8'),
);

describe('the reference ratchet', () => {
  it('every gated row is a tier-A row in the registry', () => {
    for (const id of gated) {
      const band = BANDS.find((b) => b.id === id);
      expect(band, `${id} is in in-band.json but not in anchors.ts`).toBeDefined();
      expect(band!.tier, `${id} is tier B; only tier-A rows gate`).toBe('A');
    }
  });

  it('every gated row is in band', () => {
    for (const id of gated) {
      const v = judge(BANDS.find((b) => b.id === id)!);
      expect(v.status, `${id} left its band: ${v.value} (x${v.factor})`).toBe('IN');
    }
  });

  it('every tier-A row in band is gated', () => {
    for (const band of BANDS.filter((b) => b.tier === 'A')) {
      if (judge(band).status === 'IN') {
        expect(gated, `add ${band.id} to tests/reference/in-band.json`).toContain(band.id);
      }
    }
  });
});
