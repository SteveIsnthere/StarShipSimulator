/**
 * HUD readouts: what each field shows, and how it is formatted.
 *
 * Separated from the binder so the formatting is testable without a DOM, and so
 * the set of readouts is a list rather than 45 statements.
 *
 * Formatting rules are 2021's, from displayComponents/dispUpdate.js, including
 * the unit switches: altitude, speed and range change unit at 1000 rather than
 * being shown in one unit throughout. That switch is what keeps the HUD readable
 * from the pad to orbit without a wall of digits.
 *
 * The comparisons are the 2021 ones verbatim, asymmetries included: altitude and
 * speed test `x < 1000`, while range tests `x < 1000 && x > -1000`. Range is the
 * only one of the three that legitimately goes negative (the vehicle can be short
 * of the site), which is presumably why only it was written symmetrically.
 */
import type { SimState } from '$core/state';
import { toDeg } from '$core/units';
import { ALTITUDE_SCALES, scaleFor, SPEED_SCALES } from './metrics';

export interface Readout {
  /** Stable id, used as the element key. */
  readonly id: string;
  /** Label shown beside the value. */
  readonly label: string;
  /**
   * True for the two 2021 always showed. index.html:46.
   *
   * `show_hideFlightParamDispMid` (dispUpdate.js:193) collapsed everything
   * else, leaving altitude and speed. Worth keeping: on a phone the full block
   * covers a quarter of the screen, and those two are the ones you fly on.
   */
  readonly primary?: boolean;
  /** The formatted value. */
  value(state: SimState): string;
  /** The unit, which for some readouts changes with magnitude. */
  unit(state: SimState): string;
}

export interface Formatted {
  value: string;
  unit: string;
}

/** dispUpdate.js:4 — metres below 1 km, kilometres above. */
export function formatAltitude(altitude: number): Formatted {
  if (altitude < 1000) return { value: altitude.toFixed(0), unit: 'M' };
  return { value: (altitude * 0.001).toFixed(1), unit: 'KM' };
}

/** dispUpdate.js:13 — the same switch for speed. */
export function formatSpeed(speed: number): Formatted {
  if (speed < 1000) return { value: speed.toFixed(0), unit: 'M/S' };
  return { value: (speed * 0.001).toFixed(1), unit: 'KM/S' };
}

/**
 * dispUpdate.js:36 — distance to the landing site.
 *
 * Ceiled to whole metres before the unit test, symmetric about zero, and
 * negative when the vehicle is short of the site. 2021 concatenated the unit
 * into the same element; here value and unit are separate text nodes so the
 * binder can diff them independently — the digits change every frame, the unit
 * almost never does.
 */
export function formatRange(distance: number): Formatted {
  const ceiled = Math.ceil(distance);
  if (ceiled < 1000 && ceiled > -1000) return { value: ceiled.toFixed(0), unit: 'M' };
  return { value: (ceiled * 0.001).toFixed(1), unit: 'KM' };
}

/**
 * The readouts, in display order.
 *
 * Every one is a pure function of SimState. That is what lets the binder diff
 * them: compute a value, compare it with what is already on screen, skip the
 * write. In 2021 each was an unconditional assignment behind its own
 * getElementById.
 */
/**
 * dispUpdate.js had no clock; the reference overlay is built around one.
 *
 * `world.timeSpent` rather than wall-clock time, so it counts simulated seconds
 * — which is the only thing that means anything under time warp, and the whole
 * reason wall-clock reads were walled out of core in the first place.
 */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(whole / 3600);
  const mm = Math.floor((whole % 3600) / 60);
  const ss = whole % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

/**
 * A gauge's full-scale value, formatted the way the numeral inside it is.
 *
 * The unit has to switch at 1000 for the same reason the readouts do — and the
 * first version of this did not, which put "FS 0 KM/S" under a dial reading
 * 21 M/S. Rounding 200 m/s to zero kilometres is not a small error on a label
 * whose entire job is to say what the arc is a fraction OF.
 */
function formatScale(value: number): Formatted {
  if (value < 1000) return { value: value.toFixed(0), unit: 'M/S' };
  return { value: (value * 0.001).toFixed(0), unit: 'KM/S' };
}

export const READOUTS: readonly Readout[] = [
  {
    /** The mission clock, shown top-left over the upper scrim. */
    id: 'clock',
    label: 'T+',
    value: (s) => formatClock(s.world.timeSpent),
    unit: () => '',
  },
  {
    id: 'altitude',
    label: 'ALT',
    primary: true,
    value: (s) => formatAltitude(s.kinematics.altitude).value,
    unit: (s) => formatAltitude(s.kinematics.altitude).unit,
  },
  {
    id: 'speed',
    label: 'SPD',
    primary: true,
    value: (s) => formatSpeed(s.kinematics.trueSpeed).value,
    unit: (s) => formatSpeed(s.kinematics.trueSpeed).unit,
  },
  {
    id: 'speedY',
    label: 'V/S',
    value: (s) => Math.ceil(s.kinematics.speedY).toFixed(0),
    unit: () => 'M/S',
  },
  {
    id: 'speedX',
    label: 'H/S',
    value: (s) => Math.ceil(s.kinematics.speedX).toFixed(0),
    unit: () => 'M/S',
  },
  {
    id: 'propellant',
    label: 'FUEL',
    value: (s) => (s.vehicle.propellantMass * 0.001).toFixed(0),
    unit: () => 'T',
  },
  { id: 'twr', label: 'TWR', value: (s) => s.forces.twr.toFixed(1), unit: () => '' },
  {
    id: 'gforce',
    label: 'G',
    // dispUpdate.js:31 — pinned to exactly 1 on the ground, where the ported
    // formula would otherwise show the reaction from the pad as acceleration.
    value: (s) => (s.status.onTheGround ? '1' : s.forces.perceivedG.toFixed(1)),
    unit: () => '',
  },
  {
    id: 'throttle',
    label: 'THR',
    value: (s) => s.vehicle.throttleCurrent.toFixed(0),
    unit: () => '%',
  },
  {
    id: 'pitch',
    label: 'PITCH',
    value: (s) => toDeg(s.kinematics.pitch).toFixed(0),
    unit: () => '\u00b0',
  },
  { id: 'mach', label: 'MACH', value: (s) => s.kinematics.machSpeed.toFixed(2), unit: () => '' },
  {
    /**
     * M6.2: the unit label is corrected to kPa.
     *
     * 2021 printed "PSI" beside this number and it was never psi. The realism
     * audit settled it from two directions: `dynamicPressureLimit` is 50, and
     * launch vehicles fly max-q at 30-35 — which is kPa (50 psi would be
     * 345 kPa, five times what any vehicle sees), and the value is computed as
     * 0.5*rho*v^2 in SI over a millesimal, which lands in kPa. See
     * docs/PARITY.md.
     *
     * This is a DISPLAY fix, declared as such: nothing in core changed, the
     * number is the same number, and the seven golden digests do not move. What
     * changed is that the screen stopped printing a unit we know to be wrong.
     */
    id: 'dynamicPressure',
    label: 'Q',
    value: (s) => s.forces.dynamicPressure.toFixed(1),
    unit: () => 'KPA',
  },
  { id: 'heat', label: 'HEAT', value: (s) => s.forces.thermalPower.toFixed(0), unit: () => '' },
  {
    id: 'range',
    label: 'RANGE',
    value: (s) =>
      formatRange(s.kinematics.downRangeDistance - s.autopilot.landingSiteXPos).value,
    unit: (s) => formatRange(s.kinematics.downRangeDistance - s.autopilot.landingSiteXPos).unit,
  },

  /*
    The two gauge full-scale labels.

    They are readouts rather than component state because they change — the
    dials auto-range (hud/metrics.ts) — and anything that changes during flight
    belongs to the binder. Rendering them from Svelte would mean a reactive
    value updating mid-flight, which is the one thing the frame path forbids.
  */
  {
    id: 'speedScale',
    label: 'FS',
    value: (s) => formatScale(scaleFor(Math.abs(s.kinematics.trueSpeed), SPEED_SCALES)).value,
    unit: (s) => formatScale(scaleFor(Math.abs(s.kinematics.trueSpeed), SPEED_SCALES)).unit,
  },
  {
    id: 'altitudeScale',
    label: 'FS',
    // Every altitude rung is a whole number of kilometres, so this one needs no
    // switch — the smallest is 1000 m.
    value: (s) =>
      (scaleFor(Math.max(0, s.kinematics.altitude), ALTITUDE_SCALES) * 0.001).toFixed(0),
    unit: () => 'KM',
  },
];
