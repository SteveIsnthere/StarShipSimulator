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
export const MU = C.planetGravitationalParameter;

/** m/s^2 — magnitude of gravity at a distance r from the planet's centre. */
export function gravityAt(distanceToPlanetCenter: number): number {
  return MU / distanceToPlanetCenter ** 2;
}

/** m/s — circular orbital speed at a distance r from the planet's centre. */
export function circularOrbitalSpeed(distanceToPlanetCenter: number): number {
  return Math.sqrt(MU / distanceToPlanetCenter);
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
  omega: number = C.frameRotationRate,
): number {
  const inertialTangential = inertialTangentialSpeed(distanceToPlanetCenter, tangentialSpeed, omega);
  return inertialTangential ** 2 / distanceToPlanetCenter - gravityAt(distanceToPlanetCenter);
}

/**
 * m/s², positive down — what a vehicle with no downrange speed weighs per unit
 * mass at r: gravity less the turning ground's centrifugal term. Exactly
 * `gravityAt(r)` at omega = 0.
 */
export function verticalWeight(distanceToPlanetCenter: number, omega: number = C.frameRotationRate): number {
  return -verticalGravityAcceleration(distanceToPlanetCenter, 0, omega);
}

/*
  THE ROTATING GROUND FRAME — Phase 6, Task 9. The simulation's speeds are
  relative to the ground. When the ground turns at omega in the flight plane,
  the inertial tangential speed is v_t + omega*r, and the two equations of
  motion above, written for the ground-relative speeds, become

      a_r = (v_t + omega*r)^2 / r - GM/r^2  =  v_t^2/r - g + 2*omega*v_t + omega^2*r
      a_t = -v_r * (v_t + 2*omega*r) / r    =  -v_r*v_t/r - 2*omega*v_r

  that is, the inertial terms plus the Coriolis (2*omega*v) and centrifugal
  (omega^2*r) terms. At omega = 0 both short-circuit to the inertial
  expressions on the same operands, so the result is the same bits, signed
  zeros included: `v_t + 0` would turn a -0 into +0, and the sign of a zero
  speed reaches atan2.
*/

/** m/s — the tangential speed in the inertial frame, from the ground-relative one. */
export function inertialTangentialSpeed(
  distanceToPlanetCenter: number,
  tangentialSpeed: number,
  omega: number = C.frameRotationRate,
): number {
  return omega === 0 ? tangentialSpeed : tangentialSpeed + omega * distanceToPlanetCenter;
}

/** m/s — the inverse: the ground-relative tangential speed of an inertial one. */
export function groundTangentialSpeed(
  distanceToPlanetCenter: number,
  inertialSpeed: number,
  omega: number = C.frameRotationRate,
): number {
  return omega === 0 ? inertialSpeed : inertialSpeed - omega * distanceToPlanetCenter;
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
 * In a turning ground frame the Coriolis term joins it (see the note above
 * `inertialTangentialSpeed`).
 *
 * @returns m/s^2 applied to the downrange component
 */
export function tangentialAcceleration(
  distanceToPlanetCenter: number,
  tangentialSpeed: number,
  radialSpeed: number,
  omega: number = C.frameRotationRate,
): number {
  const coupled = omega === 0 ? tangentialSpeed : tangentialSpeed + 2 * omega * distanceToPlanetCenter;
  return (-radialSpeed * coupled) / distanceToPlanetCenter;
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


// ---------------------------------------------------------------------------
// Coast prediction — M2.13, for the deorbit autopilot
// ---------------------------------------------------------------------------

/**
 * m — how far downrange a ballistic coast travels before falling to `rTarget`.
 *
 * Two-body, no drag, which is exactly right for the regime it is used in: from
 * a deorbit burn at 150 km down to the entry interface at 80 km, drag is six
 * orders of magnitude below gravity and the trajectory is a conic. Checked
 * against the simulation itself in tests/core/angular-momentum.test.ts, which
 * agrees to a kilometre in five thousand and converges with dt.
 *
 * WHY THIS EXISTS. The deorbit autopilot must decide WHEN to fire, and that
 * means knowing how far the vehicle will travel afterwards. Answering it with a
 * fitted constant works only for the flight it was fitted to: measured, the
 * same mode flown from the Deorbit preset (420 t at ignition) and from a
 * hand-circularised Circularize preset (318 t) put the vacuum arc ~200 km
 * apart, because a lighter vehicle finishes its burn sooner and starts its fall
 * from a different point on a different ellipse. A constant cannot know that.
 * The conic can.
 *
 * WHAT IT RETURNS, and in whose units. `downRangeDistance` in this simulation
 * is the integral of tangential speed, and tangential speed is `r * dtheta/dt`,
 * so downrange distance is the integral of `r` over swept angle — arc length at
 * ORBITAL radius, not ground track at the surface. This returns the same
 * quantity, so the two are directly comparable. (2021 then wraps that against
 * the surface circumference, an approximation this inherits rather than
 * introduces.)
 *
 * The integral has no elementary closed form on an ellipse, so it is evaluated
 * by Simpson's rule over true anomaly. 64 intervals puts the error below a
 * metre over a 5000 km arc.
 *
 * @param r m — current distance from the planet's centre
 * @param groundTangentialSpeed m/s — the component along the track, over the ground
 * @param radialSpeed m/s — the component along r, positive outward
 * @param rTarget m — the radius the coast is being predicted down to
 * @param omega rad/s — the ground frame's rotation rate
 * @returns m, or Infinity when the orbit never reaches rTarget
 */
export function coastDownrangeDistance(
  r: number,
  groundTangentialSpeed: number,
  radialSpeed: number,
  rTarget: number,
  omega: number = C.frameRotationRate,
): number {
  // The conic is inertial (Phase 6 Task 9b): the speed the orbit has is the
  // ground speed plus the ground's own.
  const tangentialSpeed = inertialTangentialSpeed(r, groundTangentialSpeed, omega);
  const speedSquared = tangentialSpeed ** 2 + radialSpeed ** 2;
  const energy = speedSquared / 2 - MU / r;
  const h = r * tangentialSpeed;

  // Eccentricity from energy and angular momentum. Clamped at zero because a
  // perfectly circular orbit can land a hair below it in floating point.
  const eSquared = 1 + (2 * energy * h ** 2) / MU ** 2;
  const e = Math.sqrt(Math.max(eSquared, 0));
  const semiLatusRectum = h ** 2 / MU;

  // A circle never descends, and neither does an orbit whose perigee is above
  // the target.
  if (e < 1e-9) return Infinity;

  if (semiLatusRectum / (1 + e) > rTarget) return Infinity;

  /** True anomaly at `radius`, on the climbing or the falling branch. */
  const anomalyAt = (radius: number, climbing: boolean): number => {
    const cosNu = (semiLatusRectum / radius - 1) / e;
    const nu = Math.acos(Math.min(1, Math.max(-1, cosNu)));
    return climbing ? nu : 2 * Math.PI - nu;
  };

  const start = anomalyAt(r, radialSpeed >= 0);
  let end = anomalyAt(rTarget, false);
  // Going forward along the track: a target "behind" is a lap ahead.
  if (end < start) end += 2 * Math.PI;

  /**
   * A radial fall sweeps no angle, so it covers no downrange distance.
   * M10.4, Bug-fix tier.
   *
   * With negligible tangential speed the angular momentum h is ~0, the
   * semi-latus rectum p = h^2/MU collapses toward 0 and the eccentricity toward
   * 1, so the conic degenerates to a straight line through the centre. Then
   * cos nu = (p/radius - 1)/e is -1 at BOTH radii, both `anomalyAt` calls
   * return pi, and the sweep has zero width — while the integrand
   * r(nu) = p/(1 + e cos nu) at nu = pi is a division by ~0. Simpson's rule
   * then multiplies an infinite sum by a zero step, and Infinity * 0 is NaN.
   *
   * Guarding the SWEEP rather than `p === 0` is deliberate. An exact
   * float comparison on p fixes only the single input where the tangential
   * speed is precisely zero and leaves the whole neighbourhood broken: the NaN
   * band measured before this guard ran to |tangentialSpeed| <= 4.09e-5 m/s,
   * some three billion representable doubles. The zero-width sweep is the
   * actual degeneracy, so it is what the guard tests.
   *
   * Zero is the answer, not a fallback: downrange distance is the integral of
   * r dnu, and a trajectory with no angular sweep integrates to nothing.
   *
   * REACHABLE, which is why this is a fix rather than a note.
   * `predictedDeorbitRange` passes `speedX - DEORBIT_DELTA_V` as the tangential
   * speed, so a vehicle moving downrange at anything within 4e-5 m/s of the
   * deorbit delta-v hits it while the autopilot is choosing its firing point.
   * The NaN then propagates into `burnRange + coastRange + DEORBIT_ENTRY_RANGE`
   * and fails every comparison it is put into — so the mode does not decline to
   * fire, it silently never reaches its trigger.
   */
  if (!(end > start)) {
    if (omega === 0) return 0;
    // Inertially radial, so no inertial arc; but the ground turns under the
    // fall, and its arc is -omega times the integral of r dt (Phase 6's
    // independent review: returning 0 here skipped it).
    return -omega * radialFallIntegralOfR(r, radialSpeed, rTarget);
  }

  // Simpson over the integral of r dnu, with r(nu) = p / (1 + e cos nu).
  const INTERVALS = 64;
  const stepSize = (end - start) / INTERVALS;
  const radiusAt = (nu: number) => semiLatusRectum / (1 + e * Math.cos(nu));
  let sum = radiusAt(start) + radiusAt(end);
  for (let i = 1; i < INTERVALS; i++) {
    sum += radiusAt(start + i * stepSize) * (i % 2 === 0 ? 2 : 4);
  }
  const inertialArc = (sum * stepSize) / 3;
  if (omega === 0) return inertialArc;

  /*
    THE GROUND TURNS UNDER THE COAST (Phase 6 Task 9b). Downrange distance
    integrates the ground-relative tangential speed, r (dtheta/dt - omega), so
    the ground arc is the inertial arc less omega times the integral of r dt.
    On the conic dt = r^2/h dnu, so that integral is the integral of r^3/h dnu,
    by the same Simpson's rule.
  */
  let cubes = radiusAt(start) ** 3 + radiusAt(end) ** 3;
  for (let i = 1; i < INTERVALS; i++) {
    cubes += radiusAt(start + i * stepSize) ** 3 * (i % 2 === 0 ? 2 : 4);
  }
  return inertialArc - (omega * (cubes * stepSize)) / 3 / h;
}

/** s — the radial fall's step, and its cap (about 28 hours, beyond any coast here). */
const RADIAL_STEP = 0.1;
const RADIAL_STEP_CAP = 1_000_000;

/**
 * m·s — the integral of r dt along a purely radial two-body fall from r to
 * rTarget, by velocity Verlet: the time-weighted radius `coastDownrangeDistance`
 * needs when the conic degenerates to a line. Infinity if the fall never
 * reaches rTarget within the cap (an escape).
 */
function radialFallIntegralOfR(r0: number, radialSpeed: number, rTarget: number): number {
  let r = r0;
  let v = radialSpeed;
  let a = -gravityAt(r);
  let sum = 0;
  for (let i = 0; i < RADIAL_STEP_CAP; i++) {
    const next = r + v * RADIAL_STEP + 0.5 * a * RADIAL_STEP * RADIAL_STEP;
    if (next <= rTarget) {
      const f = (r - rTarget) / (r - next);
      return sum + 0.5 * (r + rTarget) * f * RADIAL_STEP;
    }
    const aNext = -gravityAt(next);
    v += 0.5 * (a + aNext) * RADIAL_STEP;
    sum += 0.5 * (r + next) * RADIAL_STEP;
    r = next;
    a = aNext;
  }
  return Infinity;
}
