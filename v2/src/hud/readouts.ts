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

export interface Readout {
  /** Stable id, used as the element key. */
  readonly id: string;
  /** Label shown beside the value. */
  readonly label: string;
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
export const READOUTS: readonly Readout[] = [
  {
    id: 'altitude',
    label: 'ALT',
    value: (s) => formatAltitude(s.kinematics.altitude).value,
    unit: (s) => formatAltitude(s.kinematics.altitude).unit,
  },
  {
    id: 'speed',
    label: 'SPD',
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
    id: 'dynamicPressure',
    label: 'Q',
    value: (s) => s.forces.dynamicPressure.toFixed(1),
    unit: () => 'PSI',
  },
  { id: 'heat', label: 'HEAT', value: (s) => s.forces.thermalPower.toFixed(0), unit: () => '' },
  {
    id: 'range',
    label: 'RANGE',
    value: (s) =>
      formatRange(s.kinematics.downRangeDistance - s.autopilot.landingSiteXPos).value,
    unit: (s) => formatRange(s.kinematics.downRangeDistance - s.autopilot.landingSiteXPos).unit,
  },
];
