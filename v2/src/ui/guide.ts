/**
 * What the guide says, taken from the code that does it.
 *
 * THE WOUND, restated from `InfoView.svelte`'s header because this file is the
 * general form of it. 2021's guide was prose maintained by hand beside
 * `eventListener.js`, and the two had already drifted: the guide said "+ or -"
 * to zoom where the code bound "=" and "-", and it said A pitched down where
 * the code sent -100. A help screen that can lie is worse than no help screen.
 *
 * The keybind list solved that for keys by rendering `KEY_BINDINGS` directly.
 * The autopilot modes and the scenario list were still prose, and had already
 * started to drift the same way: the guide described five modes with pitch
 * numbers written out by hand, and listed no scenarios at all while the menu
 * grew eleven.
 *
 * So the modes are a table here that the YOKE PANEL renders — the buttons and
 * the guide are the same list, and a mode cannot exist in one and not the
 * other — and the scenarios are read out of `ALL_SCENARIOS` with the same
 * formatter the menu uses. What is left as prose is only what no table knows:
 * one sentence per mode saying what it is for.
 */
import { ALL_SCENARIOS, INTRO, type ScenarioPreset } from '$core/scenarios';
import type { ControlEvent } from './controls';

/** One autopilot button: what it emits, what it lights, and what it does. */
export interface AutopilotMode {
  readonly label: string;
  readonly event: ControlEvent;
  readonly indicator: string;
  readonly testid: string;
  /** One line for the guide. The only prose in this file. */
  readonly does: string;
}

/**
 * The five modes, in the order the panel lays them out.
 *
 * `does` is written against `core/control/autopilot.ts`; the numbers in
 * Lift-Off's line are that file's pitch programme and are the one place here
 * that has to be kept honest by reading, since a pitch schedule is a curve
 * rather than a value a table can quote.
 */
export const AUTOPILOT_MODES: readonly AutopilotMode[] = [
  {
    label: 'Lift-Off',
    event: { type: 'autoTakeOff' },
    indicator: 'autoTakeOff',
    testid: 'auto-take-off',
    does: 'Ascent on a pitch programme by altitude — 55° at 25 km, 85° at 80 km.',
  },
  {
    label: 'Boost-Back',
    event: { type: 'boostBack' },
    indicator: 'boostBack',
    testid: 'boost-back',
    does: 'Kills downrange velocity and points the vehicle home.',
  },
  {
    label: 'Att-Hold',
    event: { type: 'pitchHold' },
    indicator: 'pitchHold',
    testid: 'pitch-hold',
    does: 'Holds the attitude you let go of the yoke at.',
  },
  {
    label: 'Auto-Land',
    event: { type: 'autoLand' },
    indicator: 'autoLand',
    testid: 'auto-land',
    does: 'The full sequence: aero descent, flip, horizontal null, final burn.',
  },
  {
    label: 'Deorbit',
    event: { type: 'autoDeorbit' },
    indicator: 'autoDeorbit',
    testid: 'auto-deorbit',
    does: 'Holds retrograde, times a burn to end the descent at StarBase, then hands over to Auto-Land. New in v2 — there were no orbits to come home from.',
  },
];

/**
 * The stat line under a scenario's name.
 *
 * Read off the preset rather than written out again, so it cannot drift from
 * what Configure will actually load. Altitude switches unit at a kilometre for
 * the same reason the HUD does: 200 and 80000 side by side are hard to compare,
 * 200 M and 80 KM are not.
 *
 * Lived in `Menu.svelte` until M12.6, when the guide needed the same line and
 * the alternative was a second implementation of it.
 */
export function scenarioStats(preset: ScenarioPreset): string {
  const altitude =
    preset.altitude < 1000
      ? `${preset.altitude.toFixed(0)} M`
      : `${(preset.altitude / 1000).toFixed(0)} KM`;
  const speed = Math.round(Math.hypot(preset.speedX, preset.speedY));
  return `${altitude} · ${speed} M/S · ${preset.propellant} T`;
}

/**
 * The scenarios the guide lists: every one the menu offers.
 *
 * The intro is excluded because it is not something a player starts — it is
 * what is already running when they arrive, and listing it as a choice would
 * describe a button that is not there.
 */
export const GUIDE_SCENARIOS: readonly ScenarioPreset[] = ALL_SCENARIOS.filter(
  (preset) => preset.id !== INTRO.id,
);
