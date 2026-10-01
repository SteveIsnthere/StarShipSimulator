/**
 * Which autopilot mode has the flight, and the scenario's name, in a player's
 * words (ia.md: "exactly one is current, and the current one is named in the
 * status bar"). Pure functions of the preset and of SimState; the session
 * writes the mode into its store on a change.
 */
import { getScenario, type ScenarioPreset } from '$core/scenarios';
import type { SimState } from '$core/state';

export const AUTOPILOT_MODES = ['manual', 'liftOff', 'boostBack', 'holdAttitude', 'land', 'deorbit'] as const;
export type AutopilotMode = (typeof AUTOPILOT_MODES)[number];

/** The names the Flight group's autopilot choice uses (ia.md). */
export const AUTOPILOT_LABELS: Readonly<Record<AutopilotMode, string>> = {
  manual: 'Manual',
  liftOff: 'Lift off',
  boostBack: 'Boost back',
  holdAttitude: 'Hold attitude',
  land: 'Land',
  deorbit: 'Deorbit',
};

/**
 * The mode in charge. Allocation-free: the session's tick asks every frame.
 *
 * Deorbit hands over to Land on its own, so it outranks it while it is on; the
 * intro's demonstration landing is the landing autopilot and reads as one.
 */
export function autopilotMode(state: SimState): AutopilotMode {
  const a = state.autopilot;
  if (a.autoDeorbitOn) return 'deorbit';
  if (a.autoLandOn || a.demoAutoLandOn) return 'land';
  if (a.autoBoostBackOn) return 'boostBack';
  if (a.autoTakeOffOn) return 'liftOff';
  if (a.pitchHoldOn) return 'holdAttitude';
  return 'manual';
}

/**
 * The scenario's name. A flight set up in the editor is a `custom` preset; when
 * it was edited from a scenario, it says which one rather than just "Custom".
 */
export function scenarioLabel(preset: ScenarioPreset): string {
  if (preset.id !== 'custom' || !preset.basedOn) return preset.name;
  const base = getScenario(preset.basedOn);
  return base ? `${base.name}, edited` : preset.name;
}
