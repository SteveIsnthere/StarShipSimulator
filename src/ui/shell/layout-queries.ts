/**
 * The layout media queries, import-free so the Playwright specs ask the browser
 * exactly what the app asks it (tests/e2e/helpers.ts). `layout.ts` owns their
 * meaning; this file only holds the strings.
 */

/** Portrait and narrow: the primary strip above one sheet, controls behind tabs. */
export const PHONE_PORTRAIT = '(max-width: 37.5rem) and (orientation: portrait)';

/** A phone held sideways: wide enough to look like a laptop, with no height to spend. */
export const SHORT_LANDSCAPE = '(height < 31.25rem) and (orientation: landscape)';
