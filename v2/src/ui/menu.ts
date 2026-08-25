/**
 * The menu's own model: time warp, and the flight editor.
 *
 * Kept out of the component so it is testable without a DOM, and because the
 * editor's parsing rules are 2021's and worth stating once rather than
 * scattering through markup.
 */
import type { ScenarioPreset } from '$core/scenarios';
import { deg, type Deg } from '$core/units';

/** tools.js:170 — the slider is 1..9 and the state picks a direction. */
export const MIN_TIME_RATE = 1;
export const MAX_TIME_RATE = 9;

export interface TimeSetting {
  /** 1..9 */
  readonly rate: number;
  /** true = speed up, false = slow down. `timeAccState` in 2021. */
  readonly speedingUp: boolean;
}

export const REAL_TIME: TimeSetting = { rate: 1, speedingUp: true };

/**
 * Turn a menu setting into loop options.
 *
 * The asymmetry is deliberate and is explained at `AdvanceOptions.slowMotion`:
 * speeding up runs more steps, slowing down feeds the accumulator less real
 * time. Neither scales dt.
 */
export function toLoopOptions(setting: TimeSetting): { timeWarp: number; slowMotion: number } {
  const rate = Math.min(MAX_TIME_RATE, Math.max(MIN_TIME_RATE, Math.round(setting.rate)));
  return setting.speedingUp
    ? { timeWarp: rate, slowMotion: 1 }
    : { timeWarp: 1, slowMotion: rate };
}

/** How the setting reads in the menu. `timeAccRateDisp` in 2021. */
export function describeTimeSetting(setting: TimeSetting): string {
  const { timeWarp, slowMotion } = toLoopOptions(setting);
  if (timeWarp > 1) return `${timeWarp}x`;
  if (slowMotion > 1) return `1/${slowMotion}x`;
  return '1x';
}

/**
 * The flight editor's six fields, as typed by the pilot.
 *
 * Strings, not numbers, because empty means "leave this one alone" —
 * configureNewFlight() (tools.js:188) tested `!= ""` on each field
 * independently, so a partial form edits only what it names. Storing numbers
 * would lose that distinction the moment a field was cleared to 0.
 */
/**
 * The six editor boxes.
 *
 * Typed as strings because that is what a preset puts in them and what an empty
 * box is. They are NOT only strings at runtime: `bind:value` on a number input
 * returns a number once a human has typed, and `null` when the box is cleared.
 * `fieldsToPreset` handles all three — see the note there for the bug that
 * taught us, which had been live since M4.4.
 */
export interface EditorFields {
  altitude: string;
  xPosition: string;
  speedX: string;
  speedY: string;
  pitch: string;
  propellant: string;
}

export const EMPTY_FIELDS: EditorFields = {
  altitude: '',
  xPosition: '',
  speedX: '',
  speedY: '',
  pitch: '',
  propellant: '',
};

/** Fill the form from a preset, as the preset buttons did. tools.js:230. */
export function fieldsFromPreset(preset: ScenarioPreset): EditorFields {
  return {
    altitude: String(preset.altitude),
    xPosition: String(preset.xPosition),
    speedX: String(preset.speedX),
    speedY: String(preset.speedY),
    pitch: String(preset.pitch as number),
    propellant: String(preset.propellant),
  };
}

/**
 * Read the form into a preset, falling back to the current flight per field.
 *
 * `+value` is 2021's conversion and is kept, including that it turns whitespace
 * into 0 — but a field that is empty or not a number at all is treated as
 * untouched rather than as 0, which is what `!= ""` did for the empty case and
 * what NaN would have silently broken for the other.
 */
export function fieldsToPreset(fields: EditorFields, current: ScenarioPreset): ScenarioPreset {
  /**
   * Read one field, whatever the DOM handed back.
   *
   * THE BUG THIS FIXES, found in M6.7 and present since M4.4. `EditorFields`
   * declares six strings, and Svelte's `bind:value` on `<input type="number">`
   * does NOT give back a string — it gives a number, or `null` for an empty
   * box. So the first version's `value.trim()` threw `e.trim is not a function`
   * the moment anyone typed into the editor, and `onConfigure` died before
   * `menuOpen = false`: the flight did not change, the menu did not close, and
   * nothing said why.
   *
   * It survived a hundred e2e runs because every test that pressed Configure
   * pressed a PRESET first, and `fieldsFromPreset` returns real strings. The
   * one path nobody exercised is the one the editor exists for — typing values
   * into an empty form.
   *
   * Fixed here rather than by changing the input's type, because the type is
   * right: a number field gets a numeric keypad on a phone, which after M6.6 is
   * the point. The lie was the `string` annotation, and this is where it stops
   * mattering.
   */
  const num = (value: string | number | null | undefined, fallback: number): number => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (value.trim() === '') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    id: 'custom',
    name: 'Custom',
    description: 'Configured in the flight editor.',
    altitude: num(fields.altitude, current.altitude),
    xPosition: num(fields.xPosition, current.xPosition),
    speedX: num(fields.speedX, current.speedX),
    speedY: num(fields.speedY, current.speedY),
    pitch: deg(num(fields.pitch, current.pitch as number)) as Deg,
    propellant: num(fields.propellant, current.propellant),
  };
}
