/**
 * The scenarios the Fly section offers, grouped by the part of a flight they
 * start in (docs/design/ia.md, "The menu"). Every preset a player can start
 * from is here once; the intro is not, since it is what is already running
 * when they arrive.
 */
import { LAUNCH_PAD, ORBITAL_PRESETS, PRESETS, type ScenarioPreset } from '$core/scenarios';

export const SCENARIO_GROUP_LABELS = ['Ascent', 'Return', 'Re-entry', 'Landing', 'Orbit'] as const;
export type ScenarioGroupLabel = (typeof SCENARIO_GROUP_LABELS)[number];

/** Which group each preset belongs to. See `groupOf` for a preset missing here. */
const GROUP_OF: Readonly<Record<string, ScenarioGroupLabel>> = {
  'launch-pad': 'Ascent',
  'booster-sep': 'Return',
  rtls: 'Return',
  reentry: 'Re-entry',
  'before-flip': 'Landing',
  'landing-burn': 'Landing',
  circularize: 'Orbit',
  deorbit: 'Orbit',
};

/** Every preset the menu offers, pad first. */
export const MENU_SCENARIOS: readonly ScenarioPreset[] = [LAUNCH_PAD, ...PRESETS, ...ORBITAL_PRESETS];

/**
 * The group a preset is shown under. An ungrouped preset (one added to
 * `$core/scenarios` without a line above) goes to the group of the list it was
 * added to, so it is never silently dropped from the menu.
 */
export function groupOf(preset: ScenarioPreset): ScenarioGroupLabel {
  return GROUP_OF[preset.id] ?? (ORBITAL_PRESETS.includes(preset) ? 'Orbit' : 'Landing');
}

export interface ScenarioGroup {
  readonly label: ScenarioGroupLabel;
  readonly presets: readonly ScenarioPreset[];
}

export const SCENARIO_GROUPS: readonly ScenarioGroup[] = SCENARIO_GROUP_LABELS.map((label) => ({
  label,
  presets: MENU_SCENARIOS.filter((preset) => groupOf(preset) === label),
})).filter((group) => group.presets.length > 0);
