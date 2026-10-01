/**
 * The controls' class strings, in one place so every button in both groups
 * reads as the same object (docs/design/design-system.md §2, §8).
 *
 * Square, a light boundary on the flight backing, no hue. Selection is white
 * fill with black content (§2.5); for a stateful control "selected" is what
 * the indicator binder writes, so the lit rule keys on its `aria-pressed`
 * rather than on React state. Not on its `is-on` class through a class-selector
 * variant: that would put the literal `is-on` in every control's class
 * attribute, lit or not, and blind any check that reads the attribute. Density is the kit's: `ui-target` is 32 px for a fine
 * pointer and 44 px wherever a coarse one exists.
 *
 * A stateful control's className must never change after mount: React would
 * rewrite the attribute and wipe the binder's class until the state next flips.
 */

/**
 * A button on the flight backing. Alignment and padding are the caller's
 * (two utilities for one property would be decided by stylesheet order).
 */
export const CONTROL =
  'ui-target depress inline-flex items-center gap-2 border border-ui-line/70 bg-transparent text-[12.5px] font-medium leading-tight text-ui-fg transition-colors duration-100 hover:border-ui-line select-none';

/** The binder's lit state: white fill, black content. */
export const LIT = 'aria-pressed:border-ui-line aria-pressed:bg-ui-selected aria-pressed:text-ui-on-selected';

/** A cell of the autopilot's segmented choice; the grid draws the dividers. */
export const SEGMENT =
  'ui-target depress flex items-center justify-center bg-ui-bg px-1.5 py-1 text-center text-[12px] font-medium leading-tight text-ui-fg transition-colors duration-100 hover:not-aria-pressed:bg-ui-surface-raised select-none aria-pressed:bg-ui-selected aria-pressed:text-ui-on-selected';

/** An engine: the dot is the visual, the square around it only the target. */
export const ENGINE =
  'ui-icon-target depress inline-flex shrink-0 items-center justify-center border border-transparent transition-colors duration-100 hover:border-ui-line/70';

/** A square icon-sized control (zoom). */
export const SQUARE =
  'ui-icon-target depress inline-flex shrink-0 items-center justify-center border border-ui-line/70 bg-transparent text-[15px] leading-none text-ui-fg transition-colors duration-100 hover:border-ui-line select-none';

/** The small word that names a control's state beside it (On / Off). */
export const STATE_WORD = 'font-mono text-[11px] uppercase tracking-[0.08em] text-ui-muted in-[[aria-pressed=true]]:text-ui-on-selected';
