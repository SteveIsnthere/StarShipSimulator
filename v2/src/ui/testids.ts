/**
 * The test-id contract.
 *
 * WHY THIS EXISTS. Until now the end-to-end suite found things by what they
 * looked like: `.hud .value`, `.row`, a count of thirteen rows, a button whose
 * accessible name was "Auto-Land". That was survivable while the design was
 * fixed. M6 rebuilds every surface in the application, and under those
 * selectors a restyle and a regression are indistinguishable — the suite would
 * go red for cosmetic reasons and, worse, could go green while a control had
 * quietly stopped working because some other element now matched.
 *
 * So the identifiers move first, before a single pixel changes (M6.1 precedes
 * M6.2-M6.7 for exactly this reason). After this commit the e2e suite asks for
 * a control by name, and the name is a promise the markup keeps regardless of
 * what it looks like. That is what makes "capability parity" — every 2021
 * control still exists and works — a thing a machine can check while the visual
 * parity it replaces is retired.
 *
 * THIS FILE HAS NO IMPORTS, deliberately. Playwright compiles specs without
 * vite's path aliases, so anything reachable from here must be reachable from a
 * plain relative import in a spec file. The cost is that the readout ids are
 * written out rather than derived from `$hud/readouts`; `tests/ui/testids.test.ts`
 * closes that loop by asserting the two lists agree, so a readout added without
 * a test id fails the unit suite rather than silently escaping coverage.
 */

/**
 * Flight controls — everything reachable without opening a dialog.
 *
 * The 2021 control set is the floor here: index.html:72 (engine panel), :92
 * (yoke and autopilot), :120 (zoom), plus the two panel collapses and the
 * readout collapse. `auto-deorbit` is the one addition, from M2.9(c).
 */
export const CONTROL_TESTIDS = [
  'raptor-0',
  'raptor-1',
  'raptor-2',
  'all-raptors',
  'auto-max-thrust',
  'throttle',
  'yoke-pitch',
  'auto-take-off',
  'boost-back',
  'pitch-hold',
  'auto-land',
  'auto-deorbit',
  'fins',
  'rcs',
  'dump-fuel',
  'engine-panel-toggle',
  'yoke-panel-toggle',
  'zoom-in',
  'zoom-out',
  'hud-toggle',
  'open-black-box',
  'open-menu',
] as const;

/**
 * Readouts, by the id `$hud/readouts` gives them.
 *
 * Each renders three nodes: the row itself carries `readout-<id>`, and the two
 * text nodes the binder writes into carry `readout-<id>-value` and
 * `readout-<id>-unit`. The binder needs to find them; so does a test that wants
 * to know what the screen actually says.
 */
export const READOUT_IDS = [
  'altitude',
  'speed',
  'speedY',
  'speedX',
  'propellant',
  'twr',
  'gforce',
  'throttle',
  'pitch',
  'mach',
  'dynamicPressure',
  'heat',
  'range',
] as const;

export type ReadoutId = (typeof READOUT_IDS)[number];

/** The row wrapping one readout. */
export const readoutTestId = (id: string): string => `readout-${id}`;
/** The text node the binder writes the formatted value into. */
export const readoutValueTestId = (id: string): string => `readout-${id}-value`;
/** The text node the binder writes the unit into. */
export const readoutUnitTestId = (id: string): string => `readout-${id}-unit`;

/** Menu controls. Present only while the menu is open. */
export const MENU_TESTIDS = [
  'menu',
  'menu-close',
  'menu-random-failure',
  'menu-tilt-control',
  'menu-time-direction',
  'menu-time-rate',
  'menu-time-readout',
  'menu-clear',
  'menu-configure',
  'menu-about',
  'menu-guide',
  'field-altitude',
  'field-xPosition',
  'field-speedX',
  'field-speedY',
  'field-pitch',
  'field-propellant',
] as const;

/** A scenario preset button, by the preset's own id. */
export const presetTestId = (id: string): string => `preset-${id}`;

/** The black box, and the info views behind About and Help. */
export const DIALOG_TESTIDS = [
  'black-box',
  'black-box-close',
  'info-view',
  'info-close',
] as const;

/**
 * Everything, for the spec that asserts the contract is actually honoured.
 *
 * A list of names is worth nothing if nothing checks that the names are in the
 * page — that is how selectors rot in the first place.
 */
export const ALL_TESTIDS: readonly string[] = [
  ...CONTROL_TESTIDS,
  ...READOUT_IDS.map(readoutTestId),
  ...READOUT_IDS.map(readoutValueTestId),
  ...READOUT_IDS.map(readoutUnitTestId),
  ...MENU_TESTIDS,
  ...DIALOG_TESTIDS,
];

/** `[data-testid="…"]`, so specs and components never spell it by hand. */
export const byTestId = (id: string): string => `[data-testid="${id}"]`;
