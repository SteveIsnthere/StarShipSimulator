/**
 * The shipped faces' figures, measured, so "every number is tabular" is a
 * checked claim rather than a font's promise.
 *
 * Measured from the woff2 files beside this one with fontTools (the `hmtx`
 * advances, and the `tnum` substitution from `GSUB`); `scripts/subset-fonts.mjs
 * --metrics` reprints this record after a re-subset. Advance widths are what a
 * canvas `measureText` returns for a run of digits (no face here kerns between
 * figures), which is what lets the headless test ask the browser's question.
 *
 * WHY THE TOLERANCE. Inter's and JetBrains Mono's tabular figures are exactly
 * uniform. Inter Tight's are not quite: its tabular `4` is 2/2048 em narrower
 * than the other nine, 0.03 px at the largest size a numeral is drawn. That is
 * below a device pixel and below anything a reader can see, so the rule is
 * "within 1/200 em", which this face passes by a factor of five and a face
 * without a real `tnum` (D-DIN, below) fails by a factor of thirty.
 */

export interface DigitMetrics {
  readonly unitsPerEm: number;
  /** Advance widths of 0-9 as the face draws them by default. */
  readonly proportional: readonly number[];
  /** Figures after the `tnum` substitution — what `tabular-nums` selects. */
  readonly tabular: readonly number[];
}

/**
 * The four shipped faces (design-system.md §5): Inter for the interface,
 * Inter Tight for display numerals, JetBrains Mono for measured values.
 * `font-variant-numeric: tabular-nums` in index.css is load-bearing for the
 * three Inter faces, whose default figures jitter; JetBrains Mono is
 * monospaced and tabular either way.
 */
export const FACES: Readonly<Record<string, DigitMetrics>> = {
  'Inter-Regular': {
    unitsPerEm: 2048,
    proportional: [1292, 833, 1249, 1265, 1323, 1215, 1270, 1159, 1267, 1270],
    tabular: [1328, 1328, 1328, 1328, 1328, 1328, 1328, 1328, 1328, 1328],
  },
  'Inter-SemiBold': {
    unitsPerEm: 2048,
    proportional: [1351, 866, 1276, 1303, 1364, 1254, 1310, 1180, 1311, 1310],
    tabular: [1325, 1325, 1325, 1325, 1325, 1325, 1325, 1325, 1325, 1325],
  },
  'InterTight-SemiBold': {
    unitsPerEm: 2048,
    proportional: [1290, 788, 1197, 1258, 1287, 1217, 1248, 1105, 1249, 1248],
    tabular: [1296, 1296, 1296, 1296, 1294, 1296, 1296, 1296, 1296, 1296],
  },
  'JetBrainsMono-Medium': {
    unitsPerEm: 1000,
    proportional: [600, 600, 600, 600, 600, 600, 600, 600, 600, 600],
    tabular: [600, 600, 600, 600, 600, 600, 600, 600, 600, 600],
  },
};

/** The monospaced face: uniform by construction, not by `tnum`. */
export const MONOSPACED = 'JetBrainsMono-Medium';

/** The widest spread any face's tabular digits may have, as a fraction of the em. */
export const TABULAR_SPREAD_EM = 1 / 200;

/**
 * D-DIN as measured in 2026, kept so its rejection is evidence rather than an
 * anecdote: no `tnum`, and nine distinct digit widths.
 */
export const REJECTED_D_DIN: DigitMetrics = {
  unitsPerEm: 1000,
  proportional: [512, 329, 495, 493, 512, 494, 499, 431, 499, 484],
  // No `tnum` feature exists; asking for tabular figures returns the same set.
  tabular: [512, 329, 495, 493, 512, 494, 499, 431, 499, 484],
};

/** The family names index.css declares, as the kit's --font-* tokens name them. */
export const FAMILY = 'Inter';
export const FAMILY_DISPLAY = 'Inter Tight';
export const FAMILY_MONO = 'JetBrains Mono';

/** Largest size any numeral is rendered at (the primary readouts) — the worst case for jitter. */
export const LARGEST_NUMERAL_PX = 34;

/** The width of a string of digits, in px, at a given size. */
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
