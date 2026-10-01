/**
 * Every number on screen is tabular: a value never slides as its digits change.
 *
 * The rule that chose the 2021 rebuild's typeface still holds for this one: a
 * test measures `1111` against `0000` and fails if they differ by more than a
 * pixel at the largest size a numeral is drawn. D-DIN, the face the first plan
 * nominated, failed it by about 20 px; the record of that stays below.
 *
 * WHAT THIS FILE CAN AND CANNOT PROVE. It works from advance widths read off
 * the shipped woff2 files and pinned in src/ui/shell/fonts/metrics.ts. For
 * digits that is the browser's answer, not an approximation of it. What it
 * cannot see is whether the CSS actually asks for the tabular set, or whether
 * the font loaded — tests/e2e/typography.spec.ts measures a real canvas in a
 * real browser for that.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  digitStringWidth,
  FACES,
  FAMILY,
  FAMILY_DISPLAY,
  FAMILY_MONO,
  LARGEST_NUMERAL_PX,
  MONOSPACED,
  REJECTED_D_DIN,
  TABULAR_SPREAD_EM,
} from '$ui/shell/fonts/metrics';

/** The comparison the plan named: four ones against four zeroes. */
const ONES = '1111';
const ZEROES = '0000';

/** The plan's tolerance, at the largest size any numeral is drawn. */
const TOLERANCE_PX = 1;

const FONT_DIR = new URL('../../src/ui/shell/fonts/', import.meta.url);
const css = readFileSync(fileURLToPath(new URL('../index.css', FONT_DIR)), 'utf8');
const kitTokens = readFileSync(fileURLToPath(new URL('../../src/ui/kit/tokens.css', import.meta.url)), 'utf8');

const spread = (widths: readonly number[]) => Math.max(...widths) - Math.min(...widths);

describe('the shipped faces have tabular figures', () => {
  it.each(Object.keys(FACES))('%s: 1111 and 0000 are the same width', (name) => {
    const face = FACES[name]!;
    const ones = digitStringWidth(face, ONES, LARGEST_NUMERAL_PX, true);
    const zeroes = digitStringWidth(face, ZEROES, LARGEST_NUMERAL_PX, true);
    expect(Math.abs(ones - zeroes)).toBeLessThanOrEqual(TOLERANCE_PX);
  });

  it.each(Object.keys(FACES))('%s: every digit within 1/200 em of the others', (name) => {
    // Stronger than the 1111/0000 pair, which two compensating errors could pass.
    const face = FACES[name]!;
    expect(spread(face.tabular) / face.unitsPerEm).toBeLessThanOrEqual(TABULAR_SPREAD_EM);
  });

  it('the DEFAULT figures of the proportional faces are not tabular, which is why the CSS matters', () => {
    // If they were already uniform, `font-variant-numeric` would be decoration
    // and could be deleted without symptom. They are not, so it cannot.
    for (const [name, face] of Object.entries(FACES)) {
      if (name === MONOSPACED) continue;
      expect(spread(face.proportional) / face.unitsPerEm, `${name} default figures`).toBeGreaterThan(
        TABULAR_SPREAD_EM,
      );
    }
  });
});

describe('D-DIN was rejected on the evidence, and stays rejected', () => {
  it('fails the width test', () => {
    const ones = digitStringWidth(REJECTED_D_DIN, ONES, LARGEST_NUMERAL_PX, true);
    const zeroes = digitStringWidth(REJECTED_D_DIN, ZEROES, LARGEST_NUMERAL_PX, true);
    expect(Math.abs(ones - zeroes)).toBeGreaterThan(15);
  });

  it('fails the spread rule by far more than any shipped face passes it', () => {
    expect(spread(REJECTED_D_DIN.tabular) / REJECTED_D_DIN.unitsPerEm).toBeGreaterThan(30 * TABULAR_SPREAD_EM);
  });
});

describe('the stylesheet asks for what the measurement chose', () => {
  it('declares the three families, as the kit tokens name them', () => {
    for (const family of [FAMILY, FAMILY_DISPLAY, FAMILY_MONO]) {
      expect(css, family).toContain(`font-family: '${family}'`);
      expect(kitTokens, family).toContain(`'${family}'`);
    }
  });

  it('declares a @font-face for every measured face', () => {
    for (const name of Object.keys(FACES)) expect(css, name).toContain(`./fonts/${name}.woff2`);
  });

  it('reaches for the tabular set, without which the Inter faces jitter', () => {
    expect(css).toContain('font-variant-numeric: tabular-nums');
  });

  it('references the fonts relatively, so a subpath deployment still finds them', () => {
    expect(css).not.toMatch(/url\(['"]?\//);
  });
});

describe('the shipped bytes are the ones that were measured', () => {
  it.each(Object.keys(FACES))('%s.woff2 exists and is a woff2', (name) => {
    const bytes = readFileSync(fileURLToPath(new URL(`${name}.woff2`, FONT_DIR)));
    // 'wOF2'. A .ttf renamed to .woff2 would load nowhere and pass a size check.
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2');
  });

  it.each(['Inter', 'InterTight', 'JetBrainsMono'])('the %s OFL licence travels with it', (family) => {
    const licence = readFileSync(fileURLToPath(new URL(`${family}-OFL.txt`, FONT_DIR)), 'utf8');
    expect(licence).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });
});
