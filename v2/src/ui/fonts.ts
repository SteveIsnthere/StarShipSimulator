/**
 * The typeface decision, and the measurements that made it.
 *
 * docs/BROADCAST-UI-PLAN.md § 2 nominated D-DIN and then, deliberately, refused
 * to let taste decide: "a unit test measures rendered widths of `1111` vs
 * `0000` and fails if they differ by > 1px. If D-DIN fails that test, the
 * fallback (decided by the same test, not by taste) is an OFL DIN-grotesque
 * with true `tnum` — Saira or Barlow."
 *
 * D-DIN failed, and it was not close. Its ten digits carry NINE distinct
 * advance widths, measured off the 2017 Datto release:
 *
 *     0:512  1:329  2:495  3:493  4:512  5:494  6:499  7:431  8:499  9:484
 *
 * `1` is 36% narrower than `0`. At the 40px gauge numeral that is 7.3px of
 * horizontal movement per digit, so `1111` and `0000` differ by 29px — a speed
 * readout would visibly slide left and right as it counted. Nor is there a
 * `tnum` feature to switch to lining figures; the font simply has none.
 *
 * Saira Condensed was checked next and is the same story with no `tnum` at all.
 * Barlow has one, and its tabular figures are exactly uniform. So Barlow ships:
 * OFL 1.1, a DIN-grotesque, condensed in the way the reference overlay is.
 *
 * WHY THE NUMBERS LIVE HERE. They are read off the shipped woff2 files by
 * scripts/subset-fonts.mjs and pinned here so `tests/ui/tabular-digits.test.ts`
 * can run the decision headlessly, in Node, with no canvas. That test proves
 * the *font we chose* is tabular; `tests/e2e/typography.spec.ts` proves the
 * *bytes we ship* render that way, by measuring `1111` against `0000` on a real
 * canvas in a real browser with the real stylesheet applied. Neither alone is
 * enough — the record could drift from the files, and a browser test cannot
 * tell you why a font was rejected.
 */

/** Advance widths of `0`-`9`, in font units. */
export interface DigitMetrics {
  /** Font units per em, so widths can be converted to px at any size. */
  readonly unitsPerEm: number;
  /** Default figures, as the font renders them with no features applied. */
  readonly proportional: readonly number[];
  /** Figures after the `tnum` substitution — what `tabular-nums` selects. */
  readonly tabular: readonly number[];
}

/**
 * The four shipped faces, measured from `src/ui/fonts/*.woff2`.
 *
 * Note that `proportional` is not tabular for any of them — Barlow's *default*
 * figures jitter exactly like D-DIN's. What makes it usable is that the tabular
 * set exists and is reachable, which is why `font-variant-numeric: tabular-nums`
 * in theme.css is load-bearing rather than decorative, and why the subsetter
 * must keep the `tnum` feature (scripts/subset-fonts.mjs).
 */
export const FACES: Readonly<Record<string, DigitMetrics>> = {
  'BarlowSemiCondensed-Regular': {
    unitsPerEm: 1000,
    proportional: [504, 303, 469, 462, 483, 461, 462, 419, 472, 461],
    tabular: [481, 481, 481, 481, 481, 481, 481, 481, 481, 481],
  },
  'BarlowSemiCondensed-Bold': {
    unitsPerEm: 1000,
    proportional: [511, 319, 499, 487, 544, 488, 488, 451, 490, 482],
    tabular: [521, 521, 521, 521, 521, 521, 521, 521, 521, 521],
  },
  'BarlowCondensed-Regular': {
    unitsPerEm: 1000,
    proportional: [444, 256, 402, 408, 415, 409, 410, 366, 422, 403],
    tabular: [434, 434, 434, 434, 434, 434, 434, 434, 434, 434],
  },
  'BarlowCondensed-Bold': {
    unitsPerEm: 1000,
    proportional: [453, 284, 438, 436, 484, 439, 440, 407, 440, 435],
    tabular: [498, 498, 498, 498, 498, 498, 498, 498, 498, 498],
  },
};

/**
 * D-DIN as measured, kept so the rejection is evidence rather than an anecdote.
 *
 * The test asserts this fails, which is what stops a future session from
 * "restoring the intended font" without re-doing the measurement.
 */
export const REJECTED_D_DIN: DigitMetrics = {
  unitsPerEm: 1000,
  proportional: [512, 329, 495, 493, 512, 494, 499, 431, 499, 484],
  // No `tnum` feature exists; asking for tabular figures returns the same set.
  tabular: [512, 329, 495, 493, 512, 494, 499, 431, 499, 484],
};

/** The family names theme.css declares, in the order it declares them. */
export const FAMILY = 'Barlow Semi Condensed';
export const FAMILY_CONDENSED = 'Barlow Condensed';

/** The fallback chain, kept identical to theme.css's `--font`. */
export const FALLBACK_STACK = "'Helvetica Neue', Arial, sans-serif";

/** Largest size any numeral is rendered at — the worst case for jitter. */
export const LARGEST_NUMERAL_PX = 44;

/**
 * The width of a string of digits, in px, at a given size.
 *
 * This is exactly what a canvas `measureText` returns for digits — advance
 * widths summed, no kerning between figures in any of these faces — which is
 * what lets the headless test ask the same question the browser one asks.
 */
export function digitStringWidth(
  metrics: DigitMetrics,
  digits: string,
  sizePx: number,
  tabular: boolean,
): number {
  const widths = tabular ? metrics.tabular : metrics.proportional;
  let units = 0;
  for (const character of digits) units += widths[Number(character)] ?? 0;
  return (units / metrics.unitsPerEm) * sizePx;
}
