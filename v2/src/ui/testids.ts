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
  'cinematic-toggle',
  // M8.1. Beside the cinematic toggle, in the same visual language: the two are
  // the only controls that change how the simulator PRESENTS itself rather than
  // how the vehicle flies.
  'mute-toggle',
  'open-black-box',
  'open-menu',
] as const;

/**
 * The drawn readouts — gauge arcs, propellant bars, engine dots, the attitude
 * chevron — by the id `$hud/metrics` gives them.
 *
 * Listed separately from the controls because they are not interactive and
 * separately from the readouts because they carry no text: an e2e that wants to
 * know whether the speed dial is moving has to read an attribute, not a string.
 */
export const METRIC_IDS = [
  'gauge-speed',
  'gauge-altitude',
  'gauge-speed-bar',
  'gauge-altitude-bar',
  'propellant-ch4',
  'propellant-lox',
  'engine-0',
  'engine-1',
  'engine-2',
  'attitude',
  'heat-state',
  'q-state',
] as const;

/**
 * The element the metric binder writes into.
 *
 * Addressed by `data-metric` rather than by a parallel `data-testid`, unlike
 * everything else here. That is deliberate: `data-metric` is already the hook
 * the binder resolves on, so it is stable by construction and cannot drift from
 * the thing it names. Minting a second identifier for the same element was the
 * first attempt, and it immediately produced the failure it deserved — one of
 * the two limit-state metrics shares its element with a readout, which already
 * had a test id, so the second one silently went missing.
 */
export const metricSelector = (id: string): string => `[data-metric="${id}"]`;

/**
 * Readouts, by the id `$hud/readouts` gives them.
 *
 * Each renders three nodes: the row itself carries `readout-<id>`, and the two
 * text nodes the binder writes into carry `readout-<id>-value` and
 * `readout-<id>-unit`. The binder needs to find them; so does a test that wants
 * to know what the screen actually says.
 */
export const READOUT_IDS = [
  'clock',
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
  'speedScale',
  'altitudeScale',
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

/**
 * The mission event track (M6.3).
 *
 * The dots are addressed by `data-metric`, like every other drawn thing, and
 * their ids depend on the loaded scenario — so they are not listed here. These
 * three are the fixed parts: the container, and the two narration nodes that
 * say where the flight is and what is next.
 */
export const TIMELINE_TESTIDS = ['timeline', 'event-now', 'event-next'] as const;

/**
 * The trajectory map (M7.1).
 *
 * All three are present whether or not the panel is expanded — it collapses by
 * hiding, not by unmounting, because the tick holds the canvas context. So a
 * presence check means "the instrument exists"; whether it is SHOWING is a
 * visibility question, which is the one the map's own spec asks.
 */
export const MAP_TESTIDS = ['trajectory-map', 'map-toggle', 'map-canvas'] as const;

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
  ...TIMELINE_TESTIDS,
  ...MAP_TESTIDS,
  ...MENU_TESTIDS,
  ...DIALOG_TESTIDS,
];

/** `[data-testid="…"]`, so specs and components never spell it by hand. */
export const byTestId = (id: string): string => `[data-testid="${id}"]`;
