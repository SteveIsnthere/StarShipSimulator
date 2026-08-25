/**
 * Gravity, in two models.
 *
 * OFF (the 2021 reference): gravity is a constant 9.807 m/s^2 straight down,
 * and the fact that a fast-moving vehicle should fall less is approximated by
 * `orbitGravityAccCompensation` — an ad-hoc relief term subtracted from felt
 * gravity. That term has three independent defects, and they compound:
 *
 *   linear, not quadratic   relief = g * |vx| / v_orbital, where the true
 *                           reduction goes as (vx / v_orbital)^2. At the
 *                           Re-entry preset's 7300 m/s that is 43% of the
 *                           correct relief.
 *   a stale denominator     v_orbital is computed once at spawn
 *                           (initBackEnd.js:50) and never updated, so a vehicle
 *                           at 200 km still divides by the sea-level value.
 *   clamped at exactly g    `if (relief >= gravity) relief = gravity`. Net
 *                           vertical acceleration can therefore never be
 *                           positive from orbital motion, so a vehicle above
 *                           circular velocity still falls. A stable orbit is
 *                           not merely inaccurate in this model — it is
 *                           structurally impossible.
 *
 * ON (planetCenteredGravity): the vehicle has a position vector from the
 * planet's centre and gravity is -GM * r_hat / |r|^2. Nothing approximates
 * orbital motion because nothing has to: a body with enough tangential speed
 * simply misses the ground. The relief term is not corrected, it is deleted.
 *
 * The frame conversion is the whole of the work. The rest of the simulation —
 * autopilot, aerodynamics, the HUD — is written in the local frame of
 * altitude-and-downrange, and stays that way.
 */
import * as C from '../constants';

/** Standard gravitational parameter, GM. m^3/s^2. */
export const MU = C.gravitationalConstant * C.planetMass;

/** m/s^2 — magnitude of gravity at a distance r from the planet's centre. */
export function gravityAt(distanceToPlanetCenter: number): number {
  return MU / distanceToPlanetCenter ** 2;
}

/** m/s — circular orbital speed at a distance r from the planet's centre. */
export function circularOrbitalSpeed(distanceToPlanetCenter: number): number {
  return Math.sqrt(MU / distanceToPlanetCenter);
}

/**
 * The 2021 relief term. Nothing calls it since M2.10; it is kept so the
 * parity tests can show what v2 departs from.
 *
 * @param speedX m/s downrange
 * @param orbitalVelocityAtCurrentAltitude m/s — in 2021, the value fixed at spawn
 * @returns m/s^2, clamped to at most `gravity`
 */
export function legacyOrbitRelief(
  speedX: number,
  orbitalVelocityAtCurrentAltitude: number,
): number {
  const relief = (C.gravity * Math.abs(speedX)) / orbitalVelocityAtCurrentAltitude;
  return relief >= C.gravity ? C.gravity : relief;
}

/**
 * Vertical acceleration from gravity plus the centrifugal effect of moving
 * tangentially, in the local frame the rest of the simulation uses.
 *
 * This is the replacement for 2021's `-gravity + orbitGravityAccCompensation`.
 * Working in the local frame rather than rewriting every consumer keeps the
 * change contained: the autopilot, the aerodynamics and the HUD are all written
 * in altitude-and-downrange and do not need to know.
 *
 * The identity: for a body at distance r moving with tangential speed v_t, the
 * radial acceleration is
 *
 *     a_r = v_t^2 / r  -  GM / r^2
 *
 * The first term is the centrifugal contribution, the second true gravity. At
 * v_t^2 = GM / r they cancel exactly and the orbit is circular — which is why
 * an orbit needs no special case here.
 *
 * @param distanceToPlanetCenter m
 * @param tangentialSpeed m/s — the downrange component
 * @returns m/s^2, positive up
 */
export function verticalGravityAcceleration(
  distanceToPlanetCenter: number,
  tangentialSpeed: number,
): number {
  return tangentialSpeed ** 2 / distanceToPlanetCenter - gravityAt(distanceToPlanetCenter);
}

/**
 * The term that keeps downrange speed honest as altitude changes.
 *
 * Climbing while moving tangentially trades tangential speed for altitude:
 * angular momentum r*v_t is conserved under a central force. Without this, a
 * vehicle could climb without slowing down and gain orbital energy from
 * nothing.
 *
 * ONE FACTOR OF v_r*v_t/r, NOT TWO — M2.12, Bug fix. M2.6 shipped a 2 here, and
 * the 2 belongs to a different equation. The tangential equation of motion
 * under a central force is `r*theta_dd + 2*r_d*theta_d = 0`, where the 2 is the
 * Coriolis term in the ANGULAR acceleration. This simulation does not integrate
 * theta_d; it integrates the tangential SPEED, v_t = r*theta_d, and
 *
 *     dv_t/dt = r_d*theta_d + r*theta_dd = r_d*theta_d - 2*r_d*theta_d
 *             = -r_d*theta_d = -v_r*v_t/r
 *
 * The proof is angular momentum. With h = r*v_t,
 *
 *     dh/dt = v_r*v_t + r*(-v_r*v_t/r)   = 0             this
 *     dh/dt = v_r*v_t + r*(-2*v_r*v_t/r) = -v_r*v_t      the 2
 *
 * so the doubled form destroys angular momentum in proportion to how fast the
 * vehicle is climbing or falling — manufacturing it on the way down, eating it
 * on the way up. It survived M2.6 because it vanishes identically at v_r = 0
 * and a circular orbit has v_r = 0 forever, so every circular-orbit test passed
 * regardless. Measured on an ellipse in vacuum: 12.6% drift, and an orbit whose
 * apogee should be 4015 km reaching 1380 km.
 *
 * @returns m/s^2 applied to the downrange component
 */
export function tangentialAcceleration(
  distanceToPlanetCenter: number,
  tangentialSpeed: number,
  radialSpeed: number,
): number {
  return (-radialSpeed * tangentialSpeed) / distanceToPlanetCenter;
}

/** Specific orbital energy, J/kg. Conserved under gravity alone. */
export function specificOrbitalEnergy(
  distanceToPlanetCenter: number,
  speed: number,
): number {
  return speed ** 2 / 2 - MU / distanceToPlanetCenter;
}

/** Specific angular momentum, m^2/s. Conserved under any central force. */
export function specificAngularMomentum(
  distanceToPlanetCenter: number,
  tangentialSpeed: number,
): number {
  return distanceToPlanetCenter * tangentialSpeed;
}

