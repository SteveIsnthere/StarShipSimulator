/**
 * Every constant from backend/initBackEnd.js, values verbatim.
 *
 * Verbatim includes the misspellings — `raptorIgnitionFailureRate`,
 * `throttleLowerLimit`, `frontFinSurfaceArea`, `gimbalAngleLimit`,
 * `integralOfRCubedTimesDx`. Porting diffs stay line-by-line comparable against
 * the 2021 tree until goldens lock behaviour; the mechanical rename is M1.10,
 * with its mapping table at RENAME-MAP.md@d2839b9.
 *
 * Until M10.2 this was checked rather than claimed: tests/parity/constants.test.ts
 * executed the legacy file in a VM and asserted every value here matched it. That
 * suite is deleted and the 2021 tree is archived, so "verbatim" is now a statement
 * about this file's history, not an enforced invariant. Changing a value here is a
 * physics change under the tier rules in `physics-change-policy` like any other, and the golden
 * digests are what will catch it.
 *
 * Derived values are written as the same expressions the legacy file uses, in
 * the same order, rather than as pre-computed literals: floating point is not
 * associative and the goldens will see any reordering.
 */
import { deg, rad, toRad, type Rad } from './units';

// ---------------------------------------------------------------------------
// World — initWorld()
// ---------------------------------------------------------------------------

/**
 * m — Earth's mean radius (IUGG, 6,371.0 km). Phase 6, Task 2: 2021 used
 * 6,400 km, which put surface gravity 0.9% low.
 */
export const planetRadius = 6_371_000;
/** m */
export const planetCircumference = 2 * planetRadius * Math.PI;
/**
 * m^3/s^2 — Earth's standard gravitational parameter, GM (IERS Conventions
 * 2010; WGS 84). GM is known to ten digits where G and M separately are not,
 * so it is the one constant; 2021 multiplied G = 6.674e-11 by M = 5.972e24.
 */
export const planetGravitationalParameter = 3.986004418e14;
/** s */
export const planetTimeToRotate = 24 * (60 * 60);
/** m/s */
export const planetLinearVelocity = planetCircumference / planetTimeToRotate;

/** rad/s — Earth's rotation rate, sidereal (WGS 84, NIMA TR8350.2 §3.2). */
export const EARTH_ROTATION_RATE = 7.292115e-5;
/** rad — Starbase's latitude, 25.997°N; the flights head due east from it. */
export const LAUNCH_LATITUDE = toRad(deg(25.997));

/**
 * rad/s — Earth's spin about the normal of the flight plane: the great circle
 * heading due east from Starbase, so Ω cos φ, which gives the pad its 417.6 m/s
 * eastward (+x is east, prograde). The spin's in-plane part only turns the
 * plane itself, which a 2D simulation leaves out (tier B).
 */
export const EARTH_FRAME_ROTATION_RATE = EARTH_ROTATION_RATE * Math.cos(LAUNCH_LATITUDE);

/**
 * rad/s — how fast the ground frame turns in the flight plane. The simulation
 * integrates in the frame of the ground, so a turning planet adds Coriolis and
 * centrifugal terms (physics/gravity.ts), and everything that needs the frame
 * reads this one number.
 *
 * ZERO FOR NOW, and that is a recorded decision (Phase 6, 2026-10-01). At
 * `EARTH_FRAME_ROTATION_RATE` every truth test passes transformed to the
 * inertial frame, but the circularize-then-deorbit flight misses the pad by
 * 11.1 km against its 10 km acceptance: the broadside descent has no range
 * control, and the turning ground widens the spread between a heavy and a
 * light entry from 5 to 14 km. Entry range control is Phase 6b's, so the
 * switch to Earth's rate is Phase 6b's Task 1b, after the entry flies on lift.
 */
export const frameRotationRate = 0;

/**
 * m/s^2. Constant everywhere in the 2021 model — 4.0% high at 100 km, 7.2% at
 * 200 km. M2.6 replaced it with -GM*r_hat/r^2, shipped unconditionally at
 * M2.10; the constant survives only where 2021 used it as a unit — TWR, felt
 * g, and the add-back in getVerticalAcceleration.
 */
export const gravity = 9.807;

/**
 * m/s. Constant in the 2021 model. The real value at 11 km is ~295 m/s, so Mach
 * runs ~14% low through the whole upper atmosphere. M2.7 makes it sqrt(gamma*R*T),
 * and since Phase 6 nothing in the simulation reads this: it is kept only as the
 * 2021 reference the speed-of-sound tests measure the correction against.
 */
export const speedOfSound = 343;

/** m — the launch and landing site, at half a circumference. */
export const starBaseXPos = planetCircumference / 2;

// ---------------------------------------------------------------------------
// Vehicle size and mass — initSize_Weight()
// ---------------------------------------------------------------------------

/** m */
export const vehicleHeight = 50;
/** m */
export const vehicleDiameter = 9;

/** m^2 — broadside. */
export const vehicleMaxArea = vehicleDiameter * vehicleHeight;
/** m^2 — nose-on. */
export const vehicleMinArea = Math.PI * (vehicleDiameter / 2) ** 2;

/**
 * m — the nose radius used by the Sutton-Graves heating correlation.
 *
 * Added in M2.2. `getReentryHeatPower(vehicleNoseRadius)` has always wanted a
 * radius; every 2021 call site passed `crossSectionalArea` instead, an area in
 * m^2. Starship is 9 m across, so the radius is 4.5 m.
 */
export const NOSE_RADIUS = vehicleDiameter / 2;
/** m^2 */
export const vehicleInFlightMaxArea = vehicleMaxArea;

/** kg */
export const vehicleDryMass = 120000;
/** kg */
export const propellantMass = 350000;
/** kg — wet mass at spawn. */
export const vehicleMass = vehicleDryMass + propellantMass;

/** kg/s */
export const dumpRate = 3500;
/**
 * kg — where a dump stops on its own, and autoTakeOff's MECO and a boost-back
 * exit (autopilot/index.ts). Not the landing dump's target since Phase 6: see
 * `landingReserve`.
 */
export const dumpLimit = 12000;

/**
 * kg — what autoLand dumps down to: the propellant its landing programme keeps
 * for the flip, the landing burn, the horizontal adjustment and the final
 * descent. Phase 6, Task 3 (Fidelity).
 *
 * MEASURED, not derived, the way `DEORBIT_ENTRY_RANGE` is. The worst
 * one-engine-out deorbit spent 12.0 t from the flip trigger to touchdown
 * (2026-10-01, Task 3): 1.5 t in the flip, 8.3 t in an 18 s horizontal
 * adjustment and 2.2 t in the final descent, so the reserve was set at that
 * plus a third, 16 t. Task 4c then planned the flip on the ignition delay's
 * maximum: the earlier flip costs hover, and the worst engine-out landing
 * spent 13.7 t, so the reserve is 18 t, again about a third over. Each tonne of
 * reserve buys about 0.75 t at touchdown (the rest is landing heavier): every
 * engine-out deorbit lands with about 3.8 t, where the old 12 t left 0.0.
 *
 * The plan sized it from the landing-burn predictor (one engine from the
 * trigger, plus the ignition delay), which comes to 6.3 t: the programme spends
 * twice the ideal burn, because it lights every engine through the flip and
 * flies a long, low-throttle adjustment the predictor does not model. A
 * reserve computed from that would crash every deorbit. Its health check is
 * tests/core/deorbit-range.test.ts: an engine change that makes landing costlier
 * fails there, and the reserve is re-measured in the same commit.
 */
export const landingReserve = 18_000;

/**
 * kg*m^2 — the spawn value, a solid cylinder about its centre at wet mass.
 *
 * Since M11.8 the step overwrites this every step from physics/mass.ts, which
 * carries the centre of mass with the propellant; this is what the state holds
 * for the one step before the first one runs.
 */
export const vehicleMomentOfInertia =
  (vehicleMass * (vehicleDiameter / 2) ** 2 * 0.25 + (vehicleMass * vehicleHeight ** 2) / 12);

/**
 * m^4 — 2021's precomputed integral for the angular drag term. NOT USED BY THE
 * SIMULATION since the M12 angular-damping tier; kept because the tests measure
 * against it.
 *
 * It is wrong twice over, which is what that tier fixed. `(50/2)^4 / 4` is the
 * integral of |r|^3 over ONE END of the hull about its midpoint, and both ends
 * make torque — so it is half the figure even for the axis it assumes. And that
 * axis is not the one the vehicle turns on: the moment of inertia it was
 * divided by has been about the moving centre of mass since M11.8.
 *
 * `physics/mass.ts`'s `rCubedIntegral` replaces it. This stays here, unused by
 * `src/`, so that `tests/core/mass.test.ts` can state the size of the
 * correction against the number it corrects rather than against a literal.
 */
export const integralOfRCubedTimesDx = 97656;

// ---------------------------------------------------------------------------
// Engines — initEngine()
// ---------------------------------------------------------------------------

/**
 * ms. Mean Raptor ignition delay. In 2021 this drove a wall-clock setTimeout in
 * switches.js and was divided by timeAccel twice: the real wait shrank with
 * timeAccel^2, and since the sim ran timeAccel times faster, engines lit
 * timeAccel times early in simulated terms — 0.75 s becoming 0.1875 s at 4x
 * warp. M1.4 makes it a dt-ticked field in SimState.
 */
export const raptorIgnitionTimeMean = 600;
/** Fraction, 0..1. The rate with random failures off. */
export const raptorIgnitionFailureRate = 0;

/**
 * Fraction, 0..1 — the rate the menu's RandomFailure toggle selects.
 *
 * switches.js:254 assigned `raptorIgnitionFaliureRate = 0.1` when the toggle
 * went on and 0 when it went off. In v2 the rate is not reassignable — it is
 * chosen per draw from `status.randomFailure`, so `step()` stays pure and a
 * fixture cannot be ambiguous about which rate produced it.
 */
export const RANDOM_IGNITION_FAILURE_RATE = 0.1;

/** % */
export const throttleUpperLimit = 100;
/** % */
export const throttleLowerLimit = 40;
/** %/s */
export const throttleSpeed = 60;

/** m — lateral engine offsets from the vehicle centreline. */
export const raptorOffsetFromCenter = 1;
export const raptorN1offAxis = -raptorOffsetFromCenter;
export const raptorN2offAxis = raptorOffsetFromCenter / 2;
export const raptorN3offAxis = raptorOffsetFromCenter / 2;

/** Which nozzle a Raptor carries. */
export type RaptorKind = 'sea-level' | 'vacuum';

/** One engine position on the vehicle. */
export interface RaptorMount {
  readonly kind: RaptorKind;
  /** m — lateral offset from the centreline. */
  readonly offAxis: number;
  /** Dimensionless — the fraction of its thrust acting off-axis (physics.js:515). */
  readonly offAxisForceFraction: number;
}

const mount = (kind: RaptorKind, offAxis: number): RaptorMount => ({
  kind,
  offAxis,
  offAxisForceFraction: -offAxis / Math.sqrt(offAxis ** 2 + (vehicleHeight / 2) ** 2),
});

/**
 * Every engine, in index order: the engine arrays in SimState (`running`,
 * `failed`, `ignitionCountdown`) are this long and indexed the same way.
 * Indices 0..2 are 2021's N1..N3. Phase 6, Task 4a: a table rather than three
 * named constants, so the engine count is data.
 */
export const RAPTORS: readonly RaptorMount[] = [
  mount('sea-level', raptorN1offAxis),
  mount('sea-level', raptorN2offAxis),
  mount('sea-level', raptorN3offAxis),
  // Phase 6, Task 4b: the three RVacs on the outer ring. Tier-B placement:
  // the sea-level pattern at three times the offset, so all three lit
  // together make almost no net off-axis force (0.02% of their thrust; the
  // 2021 fraction is not linear in the offset), as the sea-level three do.
  mount('vacuum', -3 * raptorOffsetFromCenter),
  mount('vacuum', 1.5 * raptorOffsetFromCenter),
  mount('vacuum', 1.5 * raptorOffsetFromCenter),
];

/** Indices of the sea-level engines: what the landing logic and *Engines* (all) light. */
export const SEA_LEVEL_RAPTORS: readonly number[] = RAPTORS.flatMap((m, i) => (m.kind === 'sea-level' ? [i] : []));

/** m */
export const engineDistanceFromCenterOfMass = 21.8;

/** %/s */
export const gimbalSpeed = 600;
/** rad */
export const gimbalAngleLimit: Rad = toRad(deg(15));

// ---------------------------------------------------------------------------
// The Raptor — M11.2, Fidelity
// ---------------------------------------------------------------------------

/*
  THRUST DEPENDS ON THE AIR AROUND THE NOZZLE. A rocket engine's thrust is the
  momentum of its exhaust plus (exit pressure - ambient pressure) times the exit
  area. Up to M11.2 the simulation used one constant, 2.2 MN per engine, at
  every altitude. The real engine gains thrust as the air thins, and this is
  the size of it: seven percent between the pad and orbit.

  ANCHORED ON THE PUBLIC ISP PAIR, not on a vacuum thrust figure, and the
  reason is worth recording because the plan for this milestone got it wrong.
  SpaceX's public Raptor 2 figures are 230 tf and 327 s at sea level, and
  350 s in vacuum for the SAME sea-level nozzle. The widely quoted 258 tf and
  380 s are RVac — a different engine with a much larger bell — and the
  milestone plan first quoted a +12% gain from that figure. Using it here would
  have implied an effective exit area of 2.71 m^2 for a nozzle whose geometric
  exit area is 1.33 m^2, which is not a nozzle. Anchoring on the Isp pair with
  a constant mass flow gives 1.57 m^2 — within 18% of the geometry, which is
  what a mildly overexpanded sea-level bell should give. The physics checks
  itself, and the answer is +7%, not +12%.

  MASS FLOW IS CONSTANT WITH ALTITUDE. It is set by the turbopumps, not by the
  air outside; what altitude changes is how much thrust each kilogram buys. So
  Isp is DERIVED here rather than declared: thrust over mass flow over g0, and
  it comes out at 327 s on the pad and 350 s in vacuum by construction.
*/

/**
 * m/s^2 — standard gravity, the g0 that defines specific impulse. The ISA's
 * `G0` reads this, so there is one definition.
 */
export const standardGravity = 9.80665;

/** N per engine at full throttle at sea level. Raptor 2, sea-level nozzle: 230 tf. */
export const RAPTOR_THRUST_SEA_LEVEL = 230 * 1000 * standardGravity;
/** s — specific impulse at sea level. Raptor 2, sea-level nozzle: 327 s. */
export const RAPTOR_ISP_SEA_LEVEL = 327;
/** s — specific impulse in vacuum, SAME nozzle: 350 s. (RVac's 380 s is a different engine.) */
export const RAPTOR_ISP_VACUUM = 350;
/**
 * Pa — the sea-level pressure the figures above are quoted at, and the ISA's
 * `P0_PASCAL` (which reads this): the pad thrust reproduces the anchor only
 * because the atmosphere model and this curve agree on what sea level is.
 */
export const SEA_LEVEL_PRESSURE_PA = 101_325;

/** kg/s per engine at full throttle. T / (Isp * g0) at sea level; 703.4. Constant with altitude. */
export const RAPTOR_MASS_FLOW =
  RAPTOR_THRUST_SEA_LEVEL / (RAPTOR_ISP_SEA_LEVEL * standardGravity);
/** N per engine at full throttle in vacuum — the same mass flow at the vacuum Isp. 246 tf. */
export const RAPTOR_THRUST_VACUUM = RAPTOR_MASS_FLOW * standardGravity * RAPTOR_ISP_VACUUM;
/**
 * m^2 — effective exit area: the slope of thrust against ambient pressure,
 * (T_vac - T_sl) / p_sl. 1.566, against a geometric 1.327 for a 1.3 m bell.
 */
export const RAPTOR_EFFECTIVE_EXIT_AREA =
  (RAPTOR_THRUST_VACUUM - RAPTOR_THRUST_SEA_LEVEL) / SEA_LEVEL_PRESSURE_PA;

/**
 * N per engine at full throttle, at an ambient pressure in kPa (the unit the
 * atmosphere model carries). Linear in pressure between the two anchors and
 * beyond them: below-sea-level pressure is unreachable (altitude is never
 * negative) but would correctly cost thrust, and a negative pressure is
 * clamped to vacuum. NaN propagates; the ISA never produces one (M10.4).
 */
export function thrustPerRaptorAt(ambientPressureKPa: number): number {
  const pascals = Math.max(0, ambientPressureKPa) * 1000;
  return Math.max(0, RAPTOR_THRUST_VACUUM - pascals * RAPTOR_EFFECTIVE_EXIT_AREA);
}

/*
  RAPTOR VACUUM (RVac) — Phase 6, Task 4b, tier B. 258 tf and 380 s in vacuum
  (en.wikipedia.org/wiki/SpaceX_Raptor, the Raptor 2 performance table, read
  2026-10-01). The exit diameter is the commonly reported 2.3 m; no primary
  source for it was found, so it is a named assumption. Thrust falls with
  ambient pressure through the GEOMETRIC exit area, F = F_vac - p * A_e (the
  sea-level engine's effective area is anchored on an Isp pair that RVac does
  not publish). No flow-separation limit: Ships fire all six on the stand.
  At sea level this gives 2.11 MN, 83% of vacuum.
*/

/** N per RVac at full throttle in vacuum: 258 tf. */
export const RVAC_THRUST_VACUUM = 258 * 1000 * standardGravity;
/** s — RVac specific impulse in vacuum. */
export const RVAC_ISP_VACUUM = 380;
/** kg/s per RVac at full throttle, constant with altitude: T_vac / (Isp_vac * g0), 679. */
export const RVAC_MASS_FLOW = RVAC_THRUST_VACUUM / (RVAC_ISP_VACUUM * standardGravity);
/** m — RVac nozzle exit diameter (tier-B assumption, see above). */
export const RVAC_EXIT_DIAMETER = 2.3;
/** m^2 — RVac geometric exit area. */
export const RVAC_EXIT_AREA = Math.PI * (RVAC_EXIT_DIAMETER / 2) ** 2;

/** N per RVac at full throttle, at an ambient pressure in kPa; clamped like `thrustPerRaptorAt`. */
export function thrustPerRVacAt(ambientPressureKPa: number): number {
  const pascals = Math.max(0, ambientPressureKPa) * 1000;
  return Math.max(0, RVAC_THRUST_VACUUM - pascals * RVAC_EXIT_AREA);
}

/**
 * N per engine — the SEA-LEVEL reference, under its 2021 name.
 *
 * Kept because the autopilot's landing-stage sizing (below) and several tests
 * reason from a fixed worst case, and sea level IS the worst case: thrust is
 * never lower at any altitude the vehicle can reach. Anything that needs the
 * thrust the engines actually produce reads `thrustPerRaptorAt(p)`.
 */
export const maxThrustPerRaptor = RAPTOR_THRUST_SEA_LEVEL;
/** kg/s per engine — `RAPTOR_MASS_FLOW` under its 2021 name. Was 650, implying 345 s at 2.2 MN. */
export const maxFuelFlowPerRaptor = RAPTOR_MASS_FLOW;

// ---------------------------------------------------------------------------
// Control surfaces — initControlSurface()
// ---------------------------------------------------------------------------

/** N */
export const rcsMaxThrust = 800000;
/** m */
export const rcsThrustDistanceFromCenterOfMass = 20;
/** s */
export const rcsRunTimeRemaining = 25;

/** rad — full fin deflection. Stored as a bare number in 2021, not via getRad. */
export const finActuationMaxAngle: Rad = rad(1.03);

/** %/s */
export const finActuationSpeed = 120;

/** m^2 */
export const frontFinSurfaceArea = 24.2;
/** m */
export const frontFinDistanceFromCenterOfMass = 23.3;
/** m^2 */
export const aftFinSurfaceArea = 45.8;
/** m */
export const aftFinDistanceFromCenterOfMass = 12.6;
/** m^2 */
export const totalFinSurfaceArea = frontFinSurfaceArea + aftFinSurfaceArea;

/** Dimensionless. */
export const finDragCoefficient = 2;

// ---------------------------------------------------------------------------
// Vehicle limits — initVehicleLimit()
// ---------------------------------------------------------------------------

/** g */
export const gLimit = 13;
/** kg^0.5/m — the Sutton-Graves constant for air, for a flux in W/m^2 (NASA TR R-376). */
export const SUTTON_GRAVES_K = 1.7415e-4;
/** W/(m^2 K^4) — the Stefan-Boltzmann constant (CODATA 2018). */
export const STEFAN_BOLTZMANN = 5.670374419e-8;
/**
 * Dimensionless — the tile surface's emissivity: the black reaction-cured
 * glass coating on the Shuttle's HRSI tiles, about 0.85 at entry temperatures
 * (NASA Orbiter thermal protection system fact sheet). Tier B: Starship's
 * tiles are not published.
 */
export const TILE_EMISSIVITY = 0.85;
/**
 * K — the tile's failure limit: the Shuttle HRSI reuse limit of 1,260 C
 * (NASA TPS fact sheet), a tier-B analogue decided before Phase 6 (Starship's
 * limit is not public). It does not move to make a flight survive.
 */
export const TILE_LIMIT_KELVIN = 1533;
/** K — add to °C. */
export const CELSIUS_TO_KELVIN = 273.15;
/**
 * W/m^2 — the heat flux that holds a tile at `TILE_LIMIT_KELVIN` in radiative
 * equilibrium, eps sigma T^4: 266 kW/m^2. The break-up check compares the flux
 * with this, which is the temperature against the limit. Phase 6, Task 8: it
 * was 389 on 2021's unnamed scale, calibrated to preserve a 2021 margin.
 */
export const heatLimit = TILE_EMISSIVITY * STEFAN_BOLTZMANN * TILE_LIMIT_KELVIN ** 4;

// ---------------------------------------------------------------------------
// Deorbit targeting — M2.9(c). New in v2; 2021 had no orbital autopilot.
// ---------------------------------------------------------------------------

/**
 * m/s — how much downrange speed the deorbit burn removes.
 *
 * The single knob that sets how steep the entry is, and therefore how hot.
 * Sutton-Graves heating goes as sqrt(density) * v^3, so a bigger burn does not
 * simply trade fuel for accuracy: it drops the perigee further, the vehicle
 * meets thick air while still fast, and the peak climbs. Measured from 150 km
 * circular, flown open-loop to touchdown:
 *
 *      dV     peak heat    range from burn to touchdown
 *      50        271           13 220 km
 *     100        287            7 807 km
 *     150        308            6 195 km
 *     200        324            5 314 km
 *     300        346            4 319 km
 *
 * 150 m/s is the compromise (measured on the pre-Phase-6 heat scale, where the
 * limit was 389 units): 308 units is 79% of `heatLimit`, leaving real
 * margin for a hotter-than-nominal entry, and 6195 km of lead is short enough
 * that a coasting orbit reaches the firing point without a long wait.
 */
export const DEORBIT_DELTA_V = 150;

/**
 * m/s — the floor and ceiling the closed-loop cutoff works between.
 *
 * The burn ends when the predicted range has come down to the distance still to
 * fly, which is what absorbs the pointing error an open-loop dV cannot know
 * about. Bounds exist so that condition can never be satisfied by a burn small
 * enough to leave the vehicle in orbit, or large enough to make the entry
 * unsurvivable — 1.6x nominal is still comfortably inside `heatLimit`, and the
 * floor is half nominal.
 */
export const DEORBIT_DELTA_V_MIN = DEORBIT_DELTA_V * 0.5;
export const DEORBIT_DELTA_V_MAX = DEORBIT_DELTA_V * 1.6;

/**
 * m — how far the vehicle still travels downrange below the entry interface.
 *
 * The ONE calibrated number in the deorbit guidance, and the only part that no
 * formula predicts: what `autoLand` does with the vehicle between 80 km and the
 * pad. The vacuum arc above it is solved rather than measured — see
 * `gravity.coastDownrangeDistance`.
 *
 * WHY THE SPLIT IS THE WHOLE DESIGN. An earlier version used a single fitted
 * constant for the entire distance from ignition to touchdown, and it was right
 * only for the flight it was fitted to. Measured across two very different
 * flights — the Deorbit preset at 420 t and a hand-circularised Circularize
 * preset at 318 t — the two halves behave completely differently:
 *
 *     vacuum arc, ignition -> 80 km      ~200 km apart between the two
 *     atmospheric, 80 km -> touchdown     929 km vs 927 km — 2.4 km apart
 *
 * The part that varies is the part orbital mechanics can compute; the part that
 * must be fitted barely varies at all. So the guidance computes the first and
 * carries the second as a constant, and works from orbits it was never tuned on.
 *
 * MEASURED at 838 km, re-measured at 841.8 km in Phase 6 (Tasks 3 and 4c: the
 * descent carries the 18 t landing reserve rather than 12 t, and the heavier
 * vehicle flies farther). With the ground turning at Earth's rate it measures
 * 801.0 km (miss 0.21 km), for Phase 6b's Task 1b. It is short of what the
 * descent actually covers because it also absorbs the small biases in the two
 * computed halves. That is what a fitted constant is for; what matters is that it is
 * fitted to something that barely moves.
 *
 * THE ENVELOPE, measured before Phase 6 (the planet and the reserve have moved
 * since; re-measure before relying on the rows), because a number like this
 * should come with one. From
 * a 150 km orbit and its neighbourhood the vehicle lands within a few kilometres
 * of the pad — including from a different starting longitude, from a
 * hand-circularised orbit, 100 t lighter, and with an engine out. Higher up it
 * degrades, because a faster, steeper entry does not cover 838 km of ground:
 *
 *     150 km (the presets)     within  7 km    entry peaks at 82% of heatLimit (old scale)
 *     120 km                          18 km                    76%
 *     200 km                          50 km                    88%
 *     300 km                          90 km                    95%
 *
 * The 300 km row is the one to watch: the miss is tolerable, the heating is not
 * far from the structural limit. The orbital presets sit at 150 km deliberately.
 */
export const DEORBIT_ENTRY_RANGE = 841_800;

/**
 * m — the entry interface: where the vacuum prediction stops and the
 * atmosphere's own range takes over.
 *
 * 80 km, deliberately the altitude the 2021 Re-entry preset starts at. Above it
 * the trajectory is a conic to six figures; below it, it is whatever `autoLand`
 * decides, which is what `DEORBIT_ENTRY_RANGE` measures. It is the seam between
 * the two halves of the guidance, not a handover point — the autopilot hands
 * over as soon as the burn is finished.
 */
export const ENTRY_INTERFACE_ALTITUDE = 80_000;
/**
 * kPa — the airframe's structural limit in dynamic pressure.
 *
 * NOT PSI (M9.4), for the reasons set out at `SimState.forces.dynamicPressure`,
 * which is the quantity this is compared against in step.ts. 50 kPa sits above
 * the 28.6 kPa the worst of the seven golden flights reaches, which is why none
 * of them breaks up; 50 psi would be 345 kPa, twelve times any of them, and the
 * limit would be unreachable.
 */
export const dynamicPressureLimit = 50;
/** rad */
export const touchDownPitchLimit = 0.09;
/** m/s */
export const touchDownSpeedLimit = 10;

// ---------------------------------------------------------------------------
// Autopilot tuning — initAutoPilotParams() and friends
// ---------------------------------------------------------------------------

/** m */
export const initAutoLandXPosDiffThreshold = 500;
/** m */
export const propulsiveCorrectionMinHeight = 5000;
/** m */
export const propulsiveCorrectionAccuracyRequired = propulsiveCorrectionMinHeight * 0.05;
/**
 * m/s^2 — boost-back's target horizontal deceleration: 1.6 g0, about 15.7.
 * An acceleration, commanded as one (`controlEngineForAcceleration`); until
 * Phase 5 it was divided by the flat g and sent through the TWR law.
 */
export const decelerationStageHorizontalAcc = gravity * 1.6;

/**
 * m — the highest the flip can trigger: the aero descent hands over only below
 * it (or below 300 m, whatever the trigger says). The trigger is computed only
 * under it, because above it nothing reads the value (Phase 5: the predictor
 * behind the trigger is too costly to run for a number nothing uses).
 */
export const flipTriggerCeiling = 2500;

/** Engine count used for the pessimistic final-descent thrust estimate. */
export const autoLandFinalStageEngineCount = 1;
/** N */
export const finalStagePessimisticAvailableThrust =
  autoLandFinalStageEngineCount * maxThrustPerRaptor;
/** N */
export const finalStagePessimisticAvailableThrustDualRaptorMode =
  finalStagePessimisticAvailableThrust * 2;
/** N */
export const finalStagePessimisticAvailableThrustTrialRaptorMode =
  finalStagePessimisticAvailableThrust * 3;

export const flipStageEngineCount = 1;
/** N — at the lower throttle limit. */
export const flipStagePessimisticAvailableThrust =
  flipStageEngineCount * maxThrustPerRaptor * throttleLowerLimit * 0.01;

/** rad */
export const aeroDescentMaxCorrectionAngle: Rad = toRad(deg(3));
/** Dimensionless. */
export const fineTuneMultiplier = 2;
/** m/s */
export const fineTuneMaxSpeed = 5;

/** rad */
export const flipGoalAngle: Rad = toRad(deg(10));
/** m */
export const flipInducedXPosChange = 100;

/** rad */
export const adjustmentMaxAngle: Rad = toRad(deg(20));
/** s */
export const horizontalAdjustmentDurationEstimateSingleEngine = 5.5;
/** s */
export const horizontalAdjustmentDurationEstimate =
  horizontalAdjustmentDurationEstimateSingleEngine;
/** s */
export const horizontalAdjustmentDurationEstimateDualRaptorMode =
  horizontalAdjustmentDurationEstimate * 1.5;
/** s */
export const horizontalAdjustmentDurationEstimateTrialRaptorMode =
  horizontalAdjustmentDurationEstimate * 2;
/** m/s */
export const horizontalAdjustmentHorizontalSpeedLimit = 5;
/** m/s */
export const horizontalAdjustmentVerticalSpeedLimit = -30;

/** m */
export const noSteeringHeight = 5;

/** rad — angle of motion targets during ascent. */
export const aomAt_25km: Rad = toRad(deg(55));
/** rad */
export const aomAt_80km: Rad = toRad(deg(85));

/** rad */
export const aeroBreakingMaxCorrectionAngle: Rad = rad(Math.PI * 0.5);
/** m/s^2 */
export const aeroBreakingFineTuneThreshold = 0.5;
/** rad/s */
export const aeroBreakingAdjDegreePerSec: Rad = toRad(deg(30));

// ---------------------------------------------------------------------------
// Data recorder — initDataRecorder()
// ---------------------------------------------------------------------------

/**
 * STEPS between black-box samples. Was documented as frames until M9.4.
 *
 * In 2021 a frame WAS a step, so the two words meant the same thing. They do
 * not here: `advance()` runs however many fixed steps the accumulator drained —
 * two at 60 fps, eighteen at 9x warp — which is the whole reason `app/recorder.ts`
 * samples from `AdvanceOptions.onStep`. It counts against
 * `world.updatedFrameCount`, which `state.ts` already documents as steps taken,
 * and the recorder converts with `recordTimeInterval * DT` to get seconds. Both
 * of those are only correct on the step reading.
 */
export const recordTimeInterval = 5;

/**
 * rad/s — the angular rate below which pitchHold re-latches its target attitude.
 *
 * Added in M2.4. autoPilotModes.js:8 gates on
 * `Math.abs(pitchRateOfChange) < 0.4`, but that quantity was
 * `dPitch * dt * 3600` — correct only at exactly 60 fps. At the 60 fps
 * reference the gate fired at 0.4 rad/s, so the NUMBER is unchanged; what
 * changed is that it now means 0.4 rad/s at every frame rate, rather than
 * 0.1 rad/s at 30 fps and 1.6 rad/s at 120 fps.
 */
export const PITCH_HOLD_RATE_THRESHOLD = 0.4;

// ---------------------------------------------------------------------------
// Reference frame rate
// ---------------------------------------------------------------------------

/**
 * Hz. The 2021 model's reference frame rate. Several per-frame rates were derived
 * by dividing a per-second rate by this, which is why the sim ran at a different
 * speed on a different device. The v2 loop is fixed-dt (M1.11); this constant
 * survives only where a ported formula still references it, and M2.4 removes the
 * last frame-rate dependency from the physics.
 */
export const frameRate = 60;
