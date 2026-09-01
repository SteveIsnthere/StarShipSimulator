/**
 * Aerodynamics, ported verbatim from backend/physics.js.
 *
 * Every function here took its inputs from globals in 2021 and takes them as
 * arguments now. That is the whole substance of the port: same arithmetic, same
 * order of operations, no ambient state.
 */
import * as C from '../constants';
import { rad, type Rad } from '../units';

/**
 * physics.js:34 — `airDensity * trueSpeed^2 * 0.0005`.
 *
 * The 0.0005 is 1/2 with a Pa->kPa conversion folded in, so the result is
 * KILOPASCALS. The 2021 HUD labelled it psi and this file used to repeat that
 * label two lines below its own derivation of it — which is how the wrong unit
 * travelled into two later layers and produced a shipped bug in each. M6.2
 * corrected the display, M9.3 corrected `view/camera.ts`, and M9.4 corrects the
 * annotation here and at `SimState.forces.dynamicPressure`, where the whole
 * argument is set out.
 *
 * @returns kPa
 */
export function getDynamicPressure(airDensity: number, trueSpeed: number): number {
  return airDensity * trueSpeed ** 2 * 0.0005;
}

/**
 * physics.js:39 — area presented to the airflow.
 *
 * Blends broadside and nose-on area by attitude. The `/ 2.1` on the nose-on term
 * is an unexplained tuning constant; it is part of the feel and stays.
 * @returns m^2
 */
export function getCrossSectionalArea(angleInToTheWind: Rad, vehicleInFlightMaxArea: number): number {
  return (
    Math.abs(Math.sin(angleInToTheWind) * vehicleInFlightMaxArea) +
    Math.abs(Math.cos(angleInToTheWind) * C.vehicleMinArea) / 2.1
  );
}

/**
 * physics.js:46 — `1/2 * rho * v^2 * Cd * A`.
 * @returns N
 */
export function getDrag(
  airDensity: number,
  trueSpeed: number,
  crossSectionArea: number,
  dragCoefficient: number,
): number {
  return (1 / 2) * airDensity * trueSpeed ** 2 * dragCoefficient * crossSectionArea;
}

/**
 * physics.js:58 — a five-segment piecewise lift curve in |angleInToTheWind|.
 *
 * The segments are hand-tuned, not derived: a linear rise to 0.35 rad, a steep
 * spike between 0.47 and 0.52, then decay. This shape is the belly-flop's feel
 * and must not be smoothed.
 * @returns dimensionless
 */
export function getLiftCoefficient(angleInToTheWind: Rad): number {
  const angleITW = Math.abs(angleInToTheWind);

  if (angleITW >= 1.48) return -1.1 * angleITW + 1.728;
  if (angleITW >= 0.52) return (-1 / 9.6) * angleITW + 0.254;
  if (angleITW >= 0.47) return -8 * angleITW + 4.36;
  if (angleITW >= 0.35) return (5 / 6) * angleITW + 0.2083;
  return (5 / 3.5) * angleITW;
}

/**
 * physics.js:52 — `Cl * rho * v^2 * A * 0.5`.
 * @returns N
 */
export function getLift(
  airDensity: number,
  trueSpeed: number,
  angleInToTheWind: Rad,
  wingArea: number,
): number {
  const liftCoefficient = getLiftCoefficient(angleInToTheWind);
  return liftCoefficient * airDensity * trueSpeed ** 2 * wingArea * 0.5;
}

/**
 * physics.js:79 — body drag coefficient, linear in Mach then capped.
 * @returns dimensionless
 */
export function getBodyDragCoefficient(machSpeed: number): number {
  if (machSpeed >= 10) return 2.5;
  return machSpeed * 0.1347 + 1.153;
}

/** physics.js:89 — `force / mass`. @returns m/s^2 */
export function getAcceleration(force: number, mass: number): number {
  return force / mass;
}

/** physics.js:94 — `force * r / I`. @returns rad/s^2 */
export function getAngularAcceleration(
  force: number,
  distanceToCenterOfMass: number,
  momentOfInertia: number,
): number {
  const torque = force * distanceToCenterOfMass;
  return torque / momentOfInertia;
}

/** physics.js:301 — `atan2(speedX, speedY)`. Note the argument order: this is
 * measured from vertical, not from the horizon. @returns rad */
export function getAngleOfMotion(speedX: number, speedY: number): Rad {
  return rad(Math.atan2(speedX, speedY));
}

/*
  M11.1, Fidelity — the air acts through the RELATIVE wind.

  `world.wind` and `world.gust` were carried in SimState from the first port and
  read by nothing; every aerodynamic quantity used groundspeed. These two are the
  air-relative twins of `trueSpeed` and `angleOfMotion`: the same expressions,
  applied to the ground velocity minus the air's. They are pure functions of
  numbers, like everything else in this file, and are computed as step-locals
  rather than stored — the HUD, the guidance and the touchdown check keep the
  ground figures, and nothing outside the physics needs the air ones.

  BIT-IDENTICAL AT ZERO WIND, by construction. `speedX - 0 - 0` is `speedX`
  exactly in IEEE 754 (including -0), so at wind = 0 these return the same bits
  as `sqrt(speedX^2 + speedY^2)` and `atan2(speedX, speedY)` on the same
  operands. That is what lets the seven still-air golden digests stay exactly
  where they were: the wiring is provably a no-op until a scenario carries wind.
*/

/**
 * m/s — speed through the air. `wind` and `gust` are the air's downrange
 * velocity; the relative wind is the ground velocity minus theirs.
 */
export function relativeAirspeed(
  speedX: number,
  speedY: number,
  wind: number,
  gust: number,
): number {
  return Math.sqrt((speedX - wind - gust) ** 2 + speedY ** 2);
}

/** rad — direction of the relative wind, from vertical, as `getAngleOfMotion`. */
export function relativeWindAngle(speedX: number, speedY: number, wind: number, gust: number): Rad {
  return getAngleOfMotion(speedX - wind - gust, speedY);
}

/**
 * physics.js:305 — angle of attack, wrapped to (-pi, pi], plus the derived
 * angle into the wind, which folds the rear half onto the front.
 */
export function getAttackAngles(
  pitch: Rad,
  angleOfMotion: Rad,
): { angleOfAttack: Rad; angleInToTheWind: Rad } {
  let angleOfAttack: number = pitch - angleOfMotion;

  if (angleOfAttack < -Math.PI) {
    angleOfAttack = Math.PI * 2 + angleOfAttack;
  } else if (angleOfAttack > Math.PI) {
    angleOfAttack = -(Math.PI * 2 - angleOfAttack);
  }

  let angleInToTheWind: number;
  if (angleOfAttack > Math.PI / 2) {
    angleInToTheWind = Math.PI - angleOfAttack;
  } else if (angleOfAttack < -Math.PI / 2) {
    angleInToTheWind = -Math.PI - angleOfAttack;
  } else {
    angleInToTheWind = angleOfAttack;
  }

  return { angleOfAttack: rad(angleOfAttack), angleInToTheWind: rad(angleInToTheWind) };
}

/**
 * physics.js:329 — aerodynamic damping of rotation, always opposing spin.
 * @returns rad/s^2
 */
export function getAngularDragAcceleration(
  airDensity: number,
  angularVelocity: number,
  vehicleMomentOfInertia: number,
): number {
  const angularDragAcc =
    (airDensity * C.vehicleDiameter * angularVelocity ** 2 * C.integralOfRCubedTimesDx) /
    vehicleMomentOfInertia;

  if (angularVelocity > 0) return -angularDragAcc;
  return angularDragAcc;
}

/**
 * physics.js:341 — front fin drag. Sign flips with angle of attack so the fin
 * always pitches the vehicle the right way.
 * @returns N
 */
export function getFrontFinDrag(
  airDensity: number,
  trueSpeed: number,
  angleOfAttack: Rad,
  angleInToTheWind: Rad,
  frontFinEffectiveAreaFraction: number,
): number {
  const drag =
    getDrag(
      airDensity,
      trueSpeed,
      Math.abs(Math.sin(angleInToTheWind)) * C.frontFinSurfaceArea,
      C.finDragCoefficient,
    ) * frontFinEffectiveAreaFraction;

  return angleOfAttack < 0 ? -drag : drag;
}

/**
 * physics.js:349 — aft fin drag. Opposite sign convention to the front fin,
 * which is what makes the pair a couple rather than a net force.
 * @returns N
 */
export function getAftFinDrag(
  airDensity: number,
  trueSpeed: number,
  angleOfAttack: Rad,
  angleInToTheWind: Rad,
  aftFinEffectiveAreaFraction: number,
): number {
  const drag =
    getDrag(
      airDensity,
      trueSpeed,
      Math.abs(Math.sin(angleInToTheWind)) * C.aftFinSurfaceArea,
      C.finDragCoefficient,
    ) * aftFinEffectiveAreaFraction;

  return angleOfAttack < 0 ? drag : -drag;
}

/**
 * physics.js:437 — fin extension changes the area the body presents.
 *
 * THE NAME IS RIGHT AND THE 2021 INITIALISER WAS WRONG, which is worth stating
 * in that order. Both `frontFinEffectiveAreaFraction` and its aft counterpart
 * hold a bare `sin(...)` — a dimensionless fraction — because that is what this
 * function returns and, since M2.3, the only thing that produces them: the
 * initial state derives them through this same function. In 2021
 * `initControlSurface()` wrote `area * sin(...)`, an area in m^2, so the fields
 * disagreed with themselves by roughly 24x for exactly one frame.
 *
 * M9.4 corrected the `m^2` annotation in state.ts, which was the last piece of
 * the codebase still describing the definition M2.3 removed.
 */
export function updateVehicleInFlightMaxArea(
  frontFinExtension: number,
  aftFinExtension: number,
): {
  frontFinEffectiveAreaFraction: number;
  aftFinEffectiveAreaFraction: number;
  totalFinSurfaceArea: number;
  vehicleInFlightMaxArea: number;
} {
  const frontFinEffectiveAreaFraction = Math.sin(
    C.finActuationMaxAngle * frontFinExtension * 0.01,
  );
  const aftFinEffectiveAreaFraction = Math.sin(C.finActuationMaxAngle * aftFinExtension * 0.01);

  const totalFinSurfaceArea =
    frontFinEffectiveAreaFraction * C.frontFinSurfaceArea +
    aftFinEffectiveAreaFraction * C.aftFinSurfaceArea;

  // 1.8: fins have a higher drag coefficient than the body. Comment is 2021's.
  const vehicleInFlightMaxArea = C.vehicleMaxArea + totalFinSurfaceArea * 1.8;

  return {
    frontFinEffectiveAreaFraction,
    aftFinEffectiveAreaFraction,
    totalFinSurfaceArea,
    vehicleInFlightMaxArea,
  };
}
