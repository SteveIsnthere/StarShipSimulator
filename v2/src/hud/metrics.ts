/**
 * The things the HUD draws rather than spells.
 *
 * `readouts.ts` covers everything whose on-screen form is a string. This covers
 * everything whose on-screen form is an ATTRIBUTE — the length of a gauge arc,
 * the width of a propellant bar, the angle of the attitude chevron, the lit
 * state of an engine dot. Same discipline, same binder, different write.
 *
 * WHY QUANTISED INTEGERS. A readout diffs formatted strings, which is fine
 * because a formatted string is what gets written. An arc cannot work that way:
 * `fraction` is a float that changes on literally every frame, so diffing it
 * directly would write every frame, and diffing a formatted version of it would
 * mean building a string every frame just to find out it was not needed —
 * allocation on the per-frame path, which CLAUDE.md forbids.
 *
 * So each metric reports an INTEGER quantum at roughly the precision the screen
 * can show, the binder compares integers (no allocation, no write when equal),
 * and `format` is called only on the frames where the quantum actually moved.
 * In steady flight most of these are still.
 *
 * Everything here is a pure function of SimState, so it is all testable in Node
 * with no DOM — which is the only reason the gauge auto-ranging below can be
 * checked at all.
 */
import type { SimState } from '$core/state';
import * as C from '$core/constants';
import { toDeg } from '$core/units';

export interface Metric {
  /** Stable id; the element carries it as `data-metric`. */
  readonly id: string;
  /** The attribute the binder writes. */
  readonly attribute: string;
  /**
   * The value, quantised to an integer at display precision.
   *
   * Must be cheap and allocation-free: this runs for every metric, every frame.
   */
  quantum(state: SimState): number;
  /** Renders a quantum into the attribute's string. Called only on change. */
  format(quantum: number): string;
}

// --- gauge geometry --------------------------------------------------------

/**
 * The dial, in the SVG's own units.
 *
 * A 270° sweep with the gap at the bottom — the Falcon-era webcast gauge
 * exactly. The arc is drawn as a full circle with a dash pattern that shows
 * three quarters of it; `stroke-dashoffset` then eats into that from the end.
 */
export const GAUGE_RADIUS = 34;
export const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;
export const GAUGE_SWEEP = GAUGE_CIRCUMFERENCE * 0.75;

/** The dash offset for a 0..1 fill. 0 is empty, GAUGE_SWEEP is full. */
export function arcOffset(fraction: number): number {
  return GAUGE_SWEEP * (1 - fraction);
}

/**
 * Full-scale values the speed gauge picks between.
 *
 * "Auto-ranged per scenario regime" (BROADCAST-UI-PLAN § 3) implemented as a
 * ladder rather than as remembered state: the smallest scale that contains the
 * current value wins. A pure function is worth the small cost here — the
 * alternative, a running maximum held somewhere, would be per-frame mutable
 * state living outside SimState, and every one of those in the 2021 build
 * turned into a bug eventually.
 *
 * The consequence to know about: a value sitting exactly on a rung can flip the
 * gauge between two scales on successive frames. In practice nothing crosses
 * 500 m/s or 20 km slowly enough for that to be visible, and the honest fix
 * (hysteresis) would need the memory this deliberately does not have.
 */
export const SPEED_SCALES = [200, 500, 1_000, 2_000, 4_000, 8_000] as const;
export const ALTITUDE_SCALES = [1_000, 5_000, 20_000, 100_000, 200_000] as const;

export function scaleFor(value: number, scales: readonly number[]): number {
  const magnitude = Math.abs(value);
  for (let i = 0; i < scales.length; i++) {
    if (magnitude <= scales[i]!) return scales[i]!;
  }
  return scales[scales.length - 1]!;
}

/** How full the speed dial is, 0..1. */
export function speedFraction(state: SimState): number {
  const speed = Math.abs(state.kinematics.trueSpeed);
  return Math.min(1, speed / scaleFor(speed, SPEED_SCALES));
}

/** How full the altitude dial is, 0..1. */
export function altitudeFraction(state: SimState): number {
  const altitude = Math.max(0, state.kinematics.altitude);
  return Math.min(1, altitude / scaleFor(altitude, ALTITUDE_SCALES));
}

/** Propellant remaining, 0..1 of a full load. */
export function propellantFraction(state: SimState): number {
  return Math.min(1, Math.max(0, state.vehicle.propellantMass / C.propellantMass));
}

// --- engine dots -----------------------------------------------------------

/**
 * What one Raptor is doing, as a value a stylesheet can select on.
 *
 * The four states are the reference broadcast's, and the reason that element is
 * the most loved thing in those streams: a failure is visible the instant it
 * happens, without anybody saying so. `igniting` is its own state rather than
 * being folded into `lit` because the countdown runs up to ~0.6 s and a dot
 * that stayed dark through it would invite a second press — which switches.js:16
 * treats as a cancel.
 */
export const ENGINE_STATES = ['off', 'igniting', 'lit', 'failed'] as const;
export type EngineDotState = (typeof ENGINE_STATES)[number];

export function engineState(state: SimState, engine: 0 | 1 | 2): number {
  if (state.engines.failed[engine]) return 3;
  if (state.engines.running[engine]) return 2;
  if (state.engines.ignitionCountdown[engine] !== null) return 1;
  return 0;
}

// --- limit states ----------------------------------------------------------

/**
 * Nominal / caution / alarm, for the two readouts that can kill the vehicle.
 *
 * Colour appears in this design only as meaning (BROADCAST-UI-PLAN § 1,
 * principle 3), and these are the two places it means something: heat past 80%
 * of the limit is the amber that says the shield is working hard, and past it
 * is the red that says it is not going to be enough.
 */
export const LIMIT_STATES = ['nominal', 'caution', 'alarm'] as const;
export const CAUTION_FRACTION = 0.8;

export function limitState(value: number, limit: number): number {
  const fraction = value / limit;
  if (fraction >= 1) return 2;
  if (fraction >= CAUTION_FRACTION) return 1;
  return 0;
}

// --- the list --------------------------------------------------------------

const arc = (id: string, fraction: (state: SimState) => number): Metric => ({
  id,
  attribute: 'stroke-dashoffset',
  // A thousandth of full scale: finer than a 68px dial can resolve, so the
  // screen never shows a step, and coarse enough that a still gauge is still.
  quantum: (state) => Math.round(fraction(state) * 1000),
  format: (q) => arcOffset(q / 1000).toFixed(2),
});

/**
 * Propellant, drawn as the CH4/LOX pair the Starship broadcasts show.
 *
 * ONE HONEST NOTE. The simulation has a single propellant mass — 2021 modelled
 * no separate tanks and M6 may not touch core to add them. Both bars are
 * therefore driven by the same fraction. They are labelled as the pair because
 * that is what the vehicle has and what the reference shows, and drawing one
 * anonymous bar would be a different kind of inaccuracy, not a smaller one.
 */
const bar = (id: string): Metric => ({
  id,
  attribute: 'width',
  quantum: (state) => Math.round(propellantFraction(state) * 1000),
  // The bars live in a 0..100 viewBox, so a per-mille quantum is a tenth of a
  // unit — well under a device pixel at any size the bar is drawn.
  format: (q) => (q / 10).toFixed(1),
});

const dot = (engine: 0 | 1 | 2): Metric => ({
  id: `engine-${engine}`,
  attribute: 'data-state',
  quantum: (state) => engineState(state, engine),
  format: (q) => ENGINE_STATES[q] ?? 'off',
});

const limit = (id: string, read: (state: SimState) => number, ceiling: number): Metric => ({
  id,
  attribute: 'data-state',
  quantum: (state) => limitState(read(state), ceiling),
  format: (q) => LIMIT_STATES[q] ?? 'nominal',
});

export const METRICS: readonly Metric[] = [
  arc('gauge-speed', speedFraction),
  arc('gauge-altitude', altitudeFraction),

  bar('propellant-ch4'),
  bar('propellant-lox'),

  dot(0),
  dot(1),
  dot(2),

  /**
   * The attitude chevron.
   *
   * Rotated about the centre of its 24-unit box. Whole degrees: the pitch
   * readout beside it is already rounded to a degree, and a chevron that moved
   * between two states the number did not would read as a bug.
   */
  {
    id: 'attitude',
    attribute: 'transform',
    quantum: (state) => Math.round(toDeg(state.kinematics.pitch)),
    format: (q) => `rotate(${q} 12 12)`,
  },

  limit('heat-state', (s) => s.forces.thermalPower, C.heatLimit),
  limit('q-state', (s) => s.forces.dynamicPressure, C.dynamicPressureLimit),
];
