/**
 * M6.1: the typeface is chosen by measurement.
 *
 * docs/BROADCAST-UI-PLAN.md § 2 wrote the rule before the work started: "a unit
 * test measures rendered widths of `1111` vs `0000` and fails if they differ by
 * > 1px. If D-DIN fails that test, the fallback (decided by the same test, not
 * by taste) is an OFL DIN-grotesque with true `tnum`." This is that test, and
 * it did what it was written to do — it rejected the font the plan nominated.
 *
 * WHAT THIS FILE CAN AND CANNOT PROVE. It works from advance widths read off
 * the shipped woff2 files and pinned in src/ui/fonts.ts. For digits that is not
 * an approximation of the browser's answer, it IS the browser's answer: a run
 * of figures has no kerning in any of these faces, so `measureText` returns the
 * sum of the advances and nothing else. What it cannot see is whether the CSS
 * actually asks for the tabular set, or whether the font file even loaded —
 * tests/e2e/typography.spec.ts measures a real canvas in a real browser for
 * that. Two tests, two different lies to catch.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  digitStringWidth,
  FACES,
  FAMILY,
  FAMILY_CONDENSED,
  LARGEST_NUMERAL_PX,
  REJECTED_D_DIN,
} from '$ui/fonts';

/** The comparison the plan named: four ones against four zeroes. */
const ONES = '1111';
const ZEROES = '0000';

/** The plan's tolerance, at the largest size any numeral is drawn. */
const TOLERANCE_PX = 1;

const themeCss = readFileSync(
  fileURLToPath(new URL('../../src/ui/theme.css', import.meta.url)),
  'utf8',
);

describe('the shipped faces have tabular figures', () => {
  it.each(Object.keys(FACES))('%s: 1111 and 0000 are the same width', (name) => {
    const face = FACES[name]!;
    const ones = digitStringWidth(face, ONES, LARGEST_NUMERAL_PX, true);
    const zeroes = digitStringWidth(face, ZEROES, LARGEST_NUMERAL_PX, true);
    expect(Math.abs(ones - zeroes)).toBeLessThanOrEqual(TOLERANCE_PX);
  });

  it.each(Object.keys(FACES))('%s: every digit shares one advance width', (name) => {
    // Stronger than the 1111/0000 pair, which two compensating errors could
    // pass. Ten identical advances is what "tabular" actually means.
    expect(new Set(FACES[name]!.tabular).size).toBe(1);
  });

  it('the DEFAULT figures are not tabular, which is why the CSS matters', () => {
    // If Barlow's proportional figures were already uniform, the
    // `font-variant-numeric` declaration would be decoration and could be
    // deleted without symptom. They are not, so it cannot.
    for (const [name, face] of Object.entries(FACES)) {
      expect(new Set(face.proportional).size, `${name} default figures`).toBeGreaterThan(1);
    }
  });
});

describe('D-DIN was rejected on the evidence, and stays rejected', () => {
  it('fails the width test the plan nominated it for', () => {
    const ones = digitStringWidth(REJECTED_D_DIN, ONES, LARGEST_NUMERAL_PX, true);
    const zeroes = digitStringWidth(REJECTED_D_DIN, ZEROES, LARGEST_NUMERAL_PX, true);
    // Not a near miss: about 29 px of horizontal slide on a four-digit readout.
    expect(Math.abs(ones - zeroes)).toBeGreaterThan(20);
  });

  it('has no tabular set to fall back on', () => {
    // The `tabular` row is identical to `proportional` because the font ships
    // no `tnum` feature — asking for lining figures gets you the same glyphs.
    expect(REJECTED_D_DIN.tabular).toEqual(REJECTED_D_DIN.proportional);
  });
});

describe('the stylesheet asks for what the measurement chose', () => {
  it('declares both families the metrics record describes', () => {
    expect(themeCss).toContain(`font-family: '${FAMILY}'`);
    expect(themeCss).toContain(`font-family: '${FAMILY_CONDENSED}'`);
  });

  it('declares a @font-face for every measured face', () => {
    for (const name of Object.keys(FACES)) {
      expect(themeCss, name).toContain(`./fonts/${name}.woff2`);
    }
  });

  it('reaches for the tabular set, without which the faces jitter', () => {
    expect(themeCss).toContain('font-variant-numeric: tabular-nums');
  });

  it('references the fonts relatively, so a subpath deployment still finds them', () => {
    // tests/deploy/subpath.spec.ts holds this line at the whole-app level; here
    // it is checked at the source, where an absolute URL would be written.
    expect(themeCss).not.toMatch(/url\(['"]?\//);
  });
});

describe('the shipped bytes are the ones that were measured', () => {
  const dir = fileURLToPath(new URL('../../src/ui/fonts/', import.meta.url));

  it.each(Object.keys(FACES))('%s.woff2 exists and is a woff2', (name) => {
    const bytes = readFileSync(`${dir}${name}.woff2`);
    // 'wOF2'. A .ttf renamed to .woff2 would load nowhere and pass a size check.
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2');
  });

  it('the OFL licence travels with them', () => {
    const licence = readFileSync(`${dir}OFL.txt`, 'utf8');
    expect(licence).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(licence).toContain('Barlow Project Authors');
  });
});
