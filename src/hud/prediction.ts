/**
 * Where the vehicle is actually going.
 *
 * WHY THIS EXISTS. M2.13 built `coastDownrangeDistance` — a real conic
 * predictor, checked against the simulation to a kilometre in five thousand —
 * so the deorbit autopilot could decide when to fire. M2.9 exported
 * `getFreeFallTimeRemainingPrediction` alongside it. Between them the
 * simulation has always known where a coast ends, and in five years the player
 * has never been shown it. This is the display; core is untouched.
 *
 * WHAT IT CLAIMS, precisely. Both models are UNPOWERED continuations: this is
 * where the vehicle goes if no further thrust is applied. That is the honest
 * reading of an impact predictor and the useful one — the number moves as you
 * burn, which is what makes it a control instrument rather than a readout.
 *
 * TWO REGIMES, because no single model spans the range:
 *
 *   ABOVE THE ENTRY INTERFACE (80 km) the air is six orders of magnitude below
 *   gravity and the trajectory is a conic, so the prediction is exact and it is
 *   made to the interface rather than to the ground — predicting a touchdown
 *   through 80 km of atmosphere the model does not contain would be a made-up
 *   number wearing a decimal point.
 *
 *   BELOW IT drag dominates and the conic is meaningless, so the terminal-
 *   velocity fall model answers instead. Its own limitation is stated where it
 *   is used, and its error against seven real flights is measured in
 *   tests/hud/prediction.test.ts rather than assumed.
 *
 * AND WHEN IT CANNOT ANSWER IT SAYS SO. An orbit whose perigee is above the
 * target never comes down, and the fall model overflows above roughly 280 km.
 * Both return `none` with a reason. A predictor that always prints a number is
 * worse than one that admits its domain — the wrong number is indistinguishable
 * from the right one on a dial.
 */
import * as C from '$core/constants';
import { coastDownrangeDistance } from '$core/physics/gravity';
import { getFreeFallTimeRemainingPrediction } from '$core/physics/prediction';
import type { SimState } from '$core/state';

export type PredictionKind = 'touchdown' | 'entry' | 'none';

/** Why there is no prediction. Empty when there is one. */
export type NoSolution = '' | 'on-ground' | 'orbit' | 'out-of-domain';

export interface Prediction {
  kind: PredictionKind;
  reason: NoSolution;
  /** m — where it arrives, relative to the landing site at x = 0. */
  downRange: number;
  /**
   * m — the altitude it arrives at: GROUND_ALTITUDE for a touchdown, the entry
   * interface for an entry.
   */
  altitude: number;
  /** s — time to get there. NaN for a conic, which yields distance, not time. */
  time: number;
  /**
   * m — signed distance from the landing site. Negative is short, positive is
   * long. This is the number a pilot flying a landing actually wants.
   */
  miss: number;
}

/** A fresh prediction object for a caller that needs one to hand in. */
export function createPrediction(): Prediction {
  return { kind: 'none', reason: 'on-ground', downRange: 0, altitude: 0, time: NaN, miss: 0 };
}

/** The radius the conic is predicted down to. */
export const ENTRY_RADIUS = C.planetRadius + C.ENTRY_INTERFACE_ALTITUDE;

/**
 * m — the altitude a touchdown happens at.
 *
 * NOT zero. `altitude` in this simulation is the vehicle's centre of mass, so
 * a vehicle standing on the pad reads 25 m — half its height (state.ts:415,
 * and scenarios.ts floors every configured flight at the same value). Predicting
 * a fall to zero would ask for 25 m of descent that cannot happen, and would
 * call a vehicle sitting on the pad airborne.
 */
export const GROUND_ALTITUDE = C.vehicleHeight / 2;

/**
 * m — how far a vehicle drifts downrange in `time`, given that drag is eating
 * the speed that carries it.
 *
 * WHY THIS IS NOT `speedX * time`. That was the first version, and measuring it
 * is what condemned it: dropped unpowered from 40 km at 200 m/s downrange, it
 * predicted 107 km of drift where the simulation produced 1.3 km. Not a
 * tuning error — a modelling one. Quadratic drag has a time constant
 * `mass / (k * v)`, which for this vehicle at 200 m/s is FOUR SECONDS. Assuming
 * the speed survives a two-hundred-second fall is assuming away the entire
 * atmosphere.
 *
 * So this is the exact solution instead, for the same quadratic drag law and the
 * same `airResistance_k` the simulation itself integrates: with
 * `dv/dt = -(k/m) v^2` the speed goes as `v0 / (1 + t/tau)` and the distance as
 * `v0 tau ln(1 + t/tau)`. No new physics — core is untouched, and this is a
 * closed form of the law core already applies.
 *
 * Its useful property is the logarithm. The fall TIME this is handed is itself
 * a rough number (the closed form below assumes sea-level terminal velocity all
 * the way down, and is several times long from high altitude) — but a log turns
 * a factor-of-five error in time into a factor-of-two error in distance. The
 * weak part of the model is wrapped inside the part that does not care.
 */
export function dragLimitedDrift(speedX: number, time: number, mass: number): number {
  if (!Number.isFinite(speedX) || !Number.isFinite(time) || time <= 0) return 0;
  const speed = Math.abs(speedX);
  if (speed < 1e-6 || mass <= 0) return 0;
  const tau = mass / (C.airResistance_k * speed);
  return Math.sign(speedX) * speed * tau * Math.log1p(time / tau);
}

/**
 * Write the prediction for `state` into `out`.
 *
 * Mutates rather than returning, like everything else on the frame path.
 */
export function predict(state: SimState, out: Prediction): void {
  const { kinematics, vehicle, status, failures } = state;

  /*
    A flight that is not in the air predicts nothing — there is no trajectory
    left to predict.

    Altitude is checked as well as the flags, and not out of caution: the status
    flags are computed by `step`, so a scenario that has been built but not yet
    stepped reports `onTheGround: false` while sitting on the pad. The geometry
    is true at every instant; the flags are true from the first step onward.
  */
  if (
    status.landed ||
    status.onTheGround ||
    failures.crashed ||
    failures.inFlightBreakUp ||
    kinematics.altitude <= GROUND_ALTITUDE
  ) {
    out.kind = 'none';
    out.reason = 'on-ground';
    out.time = NaN;
    return;
  }

  const here = kinematics.downRangeDistance - C.starBaseXPos;

  if (kinematics.altitude >= C.ENTRY_INTERFACE_ALTITUDE) {
    /*
      The conic. `coastDownrangeDistance` returns arc length at ORBITAL radius,
      which is the same quantity `downRangeDistance` integrates, so the two add
      directly — see the note in core/physics/gravity.ts about whose units these
      are. Infinity means the orbit never descends that far, which is not a
      failure but an answer: you are in orbit.
    */
    const coast = coastDownrangeDistance(
      kinematics.distanceToPlanetCenter,
      kinematics.speedX,
      kinematics.speedY,
      ENTRY_RADIUS,
    );
    if (!Number.isFinite(coast)) {
      out.kind = 'none';
      out.reason = 'orbit';
      out.time = NaN;
      return;
    }
    out.kind = 'entry';
    out.reason = '';
    out.downRange = here + coast;
    out.altitude = C.ENTRY_INTERFACE_ALTITUDE;
    out.time = NaN;
    out.miss = out.downRange;
    return;
  }

  /*
    The fall model, and its honest limitation: it is a closed form for a fall at
    TERMINAL velocity through air of uniform density, plus a first-order term
    for the speed the vehicle already has. High up, where the air is thin, the
    real vehicle falls faster than sea-level terminal velocity, so this
    overestimates the time — and therefore the downrange, which is speedX times
    that time. The error shrinks as the ground approaches, which is the regime
    the number is for. It is measured over all seven goldens rather than
    described: see tests/hud/prediction.test.ts.
  */
  const time = getFreeFallTimeRemainingPrediction(
    kinematics.altitude,
    GROUND_ALTITUDE,
    vehicle.vehicleMass,
    kinematics.speedY,
  );
  if (!Number.isFinite(time) || time < 0) {
    // Overflows above roughly 280 km, and goes negative for a vehicle climbing
    // hard enough that the first-order term dominates. Neither is a touchdown.
    out.kind = 'none';
    out.reason = 'out-of-domain';
    out.time = NaN;
    return;
  }

  out.kind = 'touchdown';
  out.reason = '';
  out.time = time;
  out.altitude = GROUND_ALTITUDE;
  out.downRange = here + dragLimitedDrift(kinematics.speedX, time, vehicle.vehicleMass);
  out.miss = out.downRange;
}

/**
 * The miss distance as a label.
 *
 * Signed with a word rather than a minus sign, because "-4.2 KM" on a landing
 * instrument is ambiguous — behind you, or below you? LONG and SHORT are not.
 */
export function formatMiss(miss: number): string {
  const magnitude = Math.abs(miss);
  const direction = miss >= 0 ? 'LONG' : 'SHORT';
  if (magnitude < 1000) return `${Math.round(magnitude)} M ${direction}`;
  const km = magnitude / 1000;
  return km < 10 ? `${km.toFixed(1)} KM ${direction}` : `${Math.round(km)} KM ${direction}`;
}

/** What the map writes when it cannot draw a prediction. */
export const NO_SOLUTION_LABEL: Readonly<Record<NoSolution, string>> = {
  '': '',
  'on-ground': 'DOWN',
  orbit: 'NO SOLUTION — ORBIT',
  'out-of-domain': 'NO SOLUTION',
};
