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
 * The actual projected geometry. Phase 6b removes the unexplained /2.1;
 * axial and crossflow coefficients now belong to their respective body axes.
 * @returns m^2
 */
export function getCrossSectionalArea(angleInToTheWind: Rad, vehicleInFlightMaxArea: number): number {
  return (
    Math.abs(Math.sin(angleInToTheWind) * vehicleInFlightMaxArea) +
    Math.abs(Math.cos(angleInToTheWind) * C.vehicleMinArea)
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

/*
  BODY DRAG, PER COMPONENT — Phase 6b, Task 1 (Fidelity). 2021 used one
  coefficient for every attitude, 1.153 + 0.1347 M capped at 2.5: a broadside
  cylinder's number applied nose-on too (the `/ 2.1` on the area undid half of
  that), rising with Mach where a bluff body's falls. Now the broadside and the
  axial flows each have their own coefficient, on their own projected area.

  Sources (Niskanen, OpenRocket technical documentation, 2013, Ch. 3 and
  App. B, which take them from Hoerner, Fluid-Dynamic Drag, 1965):
  - q_stag/q, the stagnation-pressure ratio (eq. B.1);
  - a blunt face: Cd = 0.85 q_stag/q (eq. B.2);
  - base drag: Cd = 0.12 + 0.13 M^2 below Mach 1, 0.25 / M above (eq. 3.94);
  - a conical or tangent-ogive nose: 0 subsonic with a smooth joint (eq. 3.86),
    sin(e) at Mach 1 (B.6), 2.1 sin^2 e + 0.5 sin e / sqrt(M^2 - 1) from Mach
    1.3 (B.4), tan e = 1 / (2 f_N) (B.3); between, linear here (OpenRocket
    fits polynomials).
  Broadside, a cylinder in crossflow: 1.2 at subcritical crossflow Mach
  (Jorgensen, NASA TR R-474, 1977); the Newtonian limit (2/3) 1.84 = 1.227
  above Mach 4, matching the ~1.24 measured there (Penland, NACA, Mach 6.86);
  rising with q_stag/q from Mach 0.4 to 1 (1.47 there), and a straight line
  from Mach 1 to 4 (an interpolation, not a source).
  Named assumptions: the nose fineness 1.5 (no published nose length) and
  skin friction 0.035 on the base area (a turbulent Cf of about 0.0016 at
  Re ~ 1e9, over a wetted area 22 times the base). Engine plumes filling the
  base are not modelled.
*/

/** The nose cone's fineness, length over diameter (named assumption, see above). */
const NOSE_FINENESS = 1.5;
/** sin of the equivalent cone's half-apex angle: tan e = 1 / (2 f_N) (eq. B.3). */
const NOSE_SIN_E = Math.sin(Math.atan(1 / (2 * NOSE_FINENESS)));
/** Skin friction, referenced to the base area (named assumption, see above). */
const SKIN_FRICTION = 0.035;

/** q_stag / q: the stagnation-pressure ratio of the flow (Hoerner; OpenRocket eq. B.1). */
export function stagnationPressureRatio(machSpeed: number): number {
  const m = Math.max(0, machSpeed);
  if (m < 1) return 1 + (m * m) / 4 + m ** 4 / 40;
  return 1.84 - 0.76 / m ** 2 + 0.166 / m ** 4 + 0.035 / m ** 6;
}

/** Base drag of a flat base (OpenRocket eq. 3.94). */
function baseDrag(m: number): number {
  return m < 1 ? 0.12 + 0.13 * m * m : 0.25 / m;
}

/** Wave drag of the ogive nose, as its equivalent cone (OpenRocket B.3-B.6, 3.86). */
function noseWaveDrag(m: number): number {
  if (m <= 0.8) return 0;
  const atMach1 = NOSE_SIN_E;
  const atMach13 = 2.1 * NOSE_SIN_E ** 2 + (0.5 * NOSE_SIN_E) / Math.sqrt(1.3 ** 2 - 1);
  if (m < 1) return (atMach1 * (m - 0.8)) / 0.2;
  if (m < 1.3) return atMach1 + ((atMach13 - atMach1) * (m - 1)) / 0.3;
  return 2.1 * NOSE_SIN_E ** 2 + (0.5 * NOSE_SIN_E) / Math.sqrt(m * m - 1);
}

/** The subcritical crossflow coefficient, and the Mach it holds to. */
const CROSSFLOW_SUBCRITICAL = 1.2;
const CROSSFLOW_SUBCRITICAL_MACH = 0.4;
/** The broadside Newtonian limit: (2/3) of the hypersonic q_stag/q. */
const CROSSFLOW_NEWTONIAN = (2 / 3) * 1.84;
/**
 * The broadside coefficient at Mach 1, from below: the subcritical value
 * scaled by the stagnation-pressure rise from Mach 0.4 (1.47). Taken from the
 * subsonic fit; the source's two fits meet 0.5% apart at Mach 1.
 */
const CROSSFLOW_MACH_1 =
  (CROSSFLOW_SUBCRITICAL * (1 + 1 / 4 + 1 / 40)) / stagnationPressureRatio(CROSSFLOW_SUBCRITICAL_MACH);

/** Broadside: a circular cylinder in crossflow, on the side area. */
export function broadsideDragCoefficient(machSpeed: number): number {
  const m = Math.max(0, machSpeed);
  if (m <= CROSSFLOW_SUBCRITICAL_MACH) return CROSSFLOW_SUBCRITICAL;
  if (m < 1) {
    return (CROSSFLOW_SUBCRITICAL * stagnationPressureRatio(m)) / stagnationPressureRatio(CROSSFLOW_SUBCRITICAL_MACH);
  }
  if (m >= 4) return CROSSFLOW_NEWTONIAN;
  return CROSSFLOW_MACH_1 + ((CROSSFLOW_NEWTONIAN - CROSSFLOW_MACH_1) * (m - 1)) / 3;
}

/** Nose first: the ogive's wave drag, the flat base, skin friction; on the base area. */
export function noseFirstDragCoefficient(machSpeed: number): number {
  const m = Math.max(0, machSpeed);
  return noseWaveDrag(m) + baseDrag(m) + SKIN_FRICTION;
}

/** Tail first: the flat engine end as a blunt face, the pointed nose leaving no base; on the base area. */
export function tailFirstDragCoefficient(machSpeed: number): number {
  return 0.85 * stagnationPressureRatio(machSpeed) + SKIN_FRICTION;
}

/** Caller-owned m/s² output, reused by the integrator and predictor. */
export interface BodyAxisAccelerations { drag: number; lift: number }

/**
 * Finite-cylinder crossflow factor: NASA TR R-474 Figure 4, printed p77,
 * circular-cylinder curve at length/diameter 50/9: approximately 0.63.
 * Section2.3.2 (printed pp17–18) recommends unity at supersonic/hypersonic
 * crossflow; Figure4's value is measured only at very low subsonic Mach.
 * https://ntrs.nasa.gov/api/citations/19770026166/downloads/19770026166.pdf
 * Named tier-B assumption, approved before flights: bridge smoothly over
 * Figure6's Mn=0.4–1.6 data interval. Those data are for fineness10/12,
 * not Ship's50/9, so the smooth bridge and omission of the transonic dip
 * are engineering assumptions, not Ship-specific experimental results.
 */
function bodyCrossflowFactor(crossflowMach: number): number {
  if (crossflowMach <= 0.4) return 0.63;
  if (crossflowMach >= 1.6) return 1;
  const t = (crossflowMach - 0.4) / 1.2;
  return 0.63 + 0.37 * t * t * (3 - 2 * t);
}

/**
 * Phase 6b Task 1: Jorgensen's body-axis normal and axial forces, converted
 * to positive drag and lift magnitude. components.ts supplies lift direction.
 * NASA TR R-474 eq 2.12 folds alpha above 90 degrees for the normal force;
 * eq 2.3 uses crossflow Mach M*|sin(alpha)| for the cylinder coefficient.
 * The approved plan uses normal-force lift N*|cos(alpha)|, neglecting the
 * axial contribution to lift as a named engineering approximation.
 * Writes the caller's buffer; no per-frame object allocation.
 */
export function getBodyAxisAccelerations(
  airDensity: number,
  trueSpeed: number,
  machSpeed: number,
  angleOfAttack: Rad,
  planformArea: number,
  mass: number,
  out: BodyAxisAccelerations,
): BodyAxisAccelerations {
  const attack = Math.abs(angleOfAttack);
  const normalAngle = attack > Math.PI / 2 ? Math.PI - attack : attack;
  const sin = Math.abs(Math.sin(angleOfAttack));
  const cos = Math.abs(Math.cos(angleOfAttack));
  const q = 0.5 * airDensity * trueSpeed ** 2;
  const crossflowMach = machSpeed * sin;
  const normal = q * (
    C.vehicleMinArea * Math.sin(2 * normalAngle) * Math.cos(normalAngle / 2) +
    bodyCrossflowFactor(crossflowMach) * broadsideDragCoefficient(crossflowMach) * planformArea * sin ** 2
  );
  const axialCd = attack <= Math.PI / 2
    ? noseFirstDragCoefficient(machSpeed) : tailFirstDragCoefficient(machSpeed);
  const axial = q * C.vehicleMinArea * axialCd * cos ** 2;
  out.drag = (normal * sin + axial * cos) / mass;
  out.lift = normal * cos / mass;
  return out;
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

  BIT-IDENTICAL AT ZERO WIND, by construction. `speedX - 0` is `speedX`
  exactly in IEEE 754 (including -0), so at wind = 0 these return the same bits
  as `sqrt(speedX^2 + speedY^2)` and `atan2(speedX, speedY)` on the same
  operands. That is what lets the seven still-air golden digests stay exactly
  where they were: the wiring is provably a no-op until a scenario carries wind.
*/

/**
 * m/s — speed through the air. `airX` and `airY` are the air's own velocity,
 * downrange and up (physics/wind.ts); the relative wind is the ground velocity
 * minus it. Phase 6 Task 10 made the air's velocity a vector: the mean wind at
 * height plus Dryden turbulence in both axes.
 */
export function relativeAirspeed(
  speedX: number,
  speedY: number,
  airX: number,
  airY: number,
): number {
  return Math.sqrt((speedX - airX) ** 2 + (speedY - airY) ** 2);
}

/** rad — direction of the relative wind, from vertical, as `getAngleOfMotion`. */
export function relativeWindAngle(speedX: number, speedY: number, airX: number, airY: number): Rad {
  return getAngleOfMotion(speedX - airX, speedY - airY);
}

/**
 * physics.js:305 — angle of attack, wrapped to (-pi, pi], plus the derived
 * angle into the wind, which folds the rear half onto the front.
 */
export function getAttackAngles(
  pitch: Rad,
  angleOfMotion: Rad,
): { angleOfAttack: Rad; angleInToTheWind: Rad } {
  const angleOfAttack = wrappedAttackAngle(pitch, angleOfMotion);
  return { angleOfAttack: rad(angleOfAttack), angleInToTheWind: rad(foldedIntoWind(angleOfAttack)) };
}

/**
 * rad — `getAttackAngles`' attack angle, wrapped to (-pi, pi], as a number: the
 * form a loop can ask without allocating (Phase 5's fall predictor).
 */
export function wrappedAttackAngle(pitch: number, angleOfMotion: number): number {
  let angleOfAttack = pitch - angleOfMotion;
  if (angleOfAttack < -Math.PI) {
    angleOfAttack = Math.PI * 2 + angleOfAttack;
  } else if (angleOfAttack > Math.PI) {
    angleOfAttack = -(Math.PI * 2 - angleOfAttack);
  }
  return angleOfAttack;
}

/** rad — the angle into the wind: the attack angle with the rear half folded onto the front. */
export function foldedIntoWind(angleOfAttack: number): number {
  if (angleOfAttack > Math.PI / 2) return Math.PI - angleOfAttack;
  if (angleOfAttack < -Math.PI / 2) return -Math.PI - angleOfAttack;
  return angleOfAttack;
}

/**
 * physics.js:329 — aerodynamic damping of rotation, always opposing spin.
 *
 * THE INTEGRAL IS PASSED IN NOW, and that is the M12 fidelity change. It was
 * `constants.integralOfRCubedTimesDx`, a fixed 97 656 — the integral over one
 * half of a 50 m rod about its MIDPOINT, while the moment of inertia in the
 * same expression has been about the moving centre of mass since M11.8. Two
 * different axes in one quotient. See `physics/mass.ts`'s `rCubedIntegral`.
 *
 * @param rCubedIntegral m^4, about the same axis as the moment of inertia
 * @returns rad/s^2
 */
export function getAngularDragAcceleration(
  airDensity: number,
  angularVelocity: number,
  vehicleMomentOfInertia: number,
  rCubedIntegral: number,
): number {
  const angularDragAcc =
    (airDensity * C.vehicleDiameter * angularVelocity ** 2 * rCubedIntegral) /
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
