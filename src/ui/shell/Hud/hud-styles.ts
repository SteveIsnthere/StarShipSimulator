/**
 * The few class strings every part of the HUD shares, so a unit or a value
 * reads the same wherever it sits.
 */

/**
 * A unit beside its value: mono, quieter, lower case. The binder writes the
 * 2021 upper-case units (`M/S`, `KM`); SI writes them lower case.
 */
export const UNIT_CLASS = 'ml-1 font-mono font-medium lowercase text-ui-muted';

/** A secondary value: mono, tabular, small. */
export const SECONDARY_VALUE_CLASS = 'font-mono text-[12px] font-medium leading-none text-ui-fg';

/**
 * The two values that can end a flight (heat, Q) gain a colour AND a word past
 * their limits, never a colour alone (design-system.md §2.9). The metric binder
 * writes `data-state`; the word is generated content, so it never enters the
 * text the binder diffs.
 */
export const LIMIT_STATE_CLASS = [
  'data-[state=caution]:text-flight-caution',
  'data-[state=alarm]:text-flight-alarm',
  "data-[state=caution]:after:content-['_high']",
  "data-[state=alarm]:after:content-['_limit']",
  'after:text-[10px] after:uppercase after:tracking-[0.08em]',
].join(' ');
