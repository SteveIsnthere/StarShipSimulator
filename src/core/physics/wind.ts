/**
 * The wind: a mean profile with height, and seeded turbulence on top of it
 * (Phase 6, Task 10, Fidelity).
 *
 * Until Phase 6 the air moved at `world.wind` everywhere, from the pad to
 * orbit, and `world.gust` was a field nothing wrote. A scenario's wind is a
 * SURFACE wind, so it now means what a launch-range wind report means: the
 * steady wind at the 18.3 m (60 ft) reference level. The wind the vehicle
 * feels is that report carried up through the surface layer, plus turbulence.
 *
 * MEAN PROFILE. NASA/TM-2008-215633, *Terrestrial Environment (Climatic)
 * Criteria Guidelines for Use in Aerospace Vehicle Development*, §2.2.5.2,
 * eqs. (2.1)-(2.2), from about 6,000 hourly profiles on KSC's 150 m tower:
 *
 *   u(z) = u18.3 · (z / 18.3)^k,  k = c · u18.3^(-3/4) for u18.3 > 2 m/s,
 *
 * with c normally distributed, mean 0.52 (m/s)^(3/4); k is constant below
 * 2 m/s. The mean c is used: a scenario flies a typical day, not the 3σ
 * design day. Two named assumptions, both tier B:
 *   - the law is fitted to PEAK winds; it is applied here to the steady wind,
 *     leaving out the gust factor's slow change with height (§2.2.7);
 *   - it is valid to 150 m, and the wind is held at its 150 m value above
 *     that. Winds aloft are not set by the surface wind (§2.3.13.2: above the
 *     boundary layer conditions are "controlled by relatively large-scale
 *     conditions rather than local" ones), so scaling a climatological jet
 *     stream by one surface number would be invented, not measured.
 *
 * TURBULENCE. The Dryden model of MIL-F-8785C §3.7.3 (repeated in
 * MIL-HDBK-1797), low-altitude form, h in feet:
 *
 *   σw = 0.1 · W20,   σu = σw / (0.177 + 0.000823 h)^0.4,
 *   Lw = h,           Lu = h  / (0.177 + 0.000823 h)^1.2,
 *
 * W20 the mean wind at 20 ft, here from the profile above. u is along the
 * mean wind (downrange in 2D), w vertical. The 2D world has no lateral axis,
 * so v is not modelled. Valid from 10 to 1,000 ft; below 10 ft the 10 ft
 * values hold, and above 1,000 ft the 1,000 ft values (σu = σw = 0.1 W20,
 * L = 1,000 ft) hold. The specification's medium and high-altitude intensities
 * come from a probability-of-exceedance table that one surface wind cannot
 * choose; at the airspeeds flown up there a metre-per-second gust is lost in
 * the hundreds of metres per second of airspeed.
 *
 * The filters are Dryden's: u first order, w the second-order form
 * (1 + √3 τs)/(1 + τs)², τ = L/V. They are discretised on the step, u exactly
 * (an Ornstein-Uhlenbeck update), w as two exact first-order lags in cascade
 * with the input held over the step; that form's variance is exact as dt/τ
 * goes to zero and the tests measure it at the speeds the landings fly.
 *
 * V, the speed at which the vehicle sweeps through the frozen turbulence
 * field, is the airspeed, but never less than the mean wind at height: a
 * hovering vehicle still has the field blown past it (Taylor's hypothesis with
 * the wind as the convection speed, the usual rotorcraft treatment).
 *
 * CALM AIR IS CALM. With no surface wind there is no turbulence and NO DRAW is
 * taken, so every still-air flight — the intro and every preset — is the same
 * bits it was. The draws come from their own stream (`turbulence`), so a windy
 * flight's ignition draws are not shifted either (rng.ts, stream independence).
 */
import { draw, type RngState } from '../rng';
import type { WorldState } from '../state';

/** m — the reference height of a scenario's wind (TM-2008-215633 §2.2.5.2). */
export const WIND_REFERENCE_HEIGHT = 18.3;
/** m — the top of the surface layer the power law is fitted to. */
export const SURFACE_LAYER_TOP = 150;
/** (m/s)^(3/4) — the mean of c in eq. (2.2). */
export const PROFILE_C = 0.52;
/** m/s — below this reference wind, k is constant (eq. 2.2's lower bound). */
const PROFILE_K_FLOOR_WIND = 2;
/** m — a lower bound on height so the power law never evaluates 0^k. */
const PROFILE_MIN_HEIGHT = 1;

/** m per ft. */
const FT = 0.3048;
/** m — MIL-F-8785C's W20 height, 20 ft. */
export const W20_HEIGHT = 20 * FT;
/** m — the low-altitude model's range, 10 to 1,000 ft. */
export const DRYDEN_LOW = 10 * FT;
export const DRYDEN_HIGH = 1000 * FT;

/** k — the profile exponent for a reference wind (eq. 2.2, mean c). */
export function profileExponent(referenceWind: number): number {
  const u = Math.max(Math.abs(referenceWind), PROFILE_K_FLOOR_WIND);
  return PROFILE_C * u ** -0.75;
}

/**
 * m/s — the mean wind at `height` metres above the ground, for a scenario wind
 * of `referenceWind` at 18.3 m. Exactly +0 in calm air, so the relative-wind
 * expressions stay the ground ones bit for bit.
 */
export function meanWindAt(referenceWind: number, height: number): number {
  if (referenceWind === 0) return 0;
  const z = Math.min(Math.max(height, PROFILE_MIN_HEIGHT), SURFACE_LAYER_TOP);
  return referenceWind * (z / WIND_REFERENCE_HEIGHT) ** profileExponent(referenceWind);
}

/** The air's velocity where the vehicle is: the mean wind plus the gusts. */
export function airVelocityX(world: WorldState, altitude: number): number {
  return meanWindAt(world.wind, altitude) + world.gust;
}

export interface DrydenIntensity {
  /** m/s */
  sigmaU: number;
  sigmaW: number;
  /** m */
  lengthU: number;
  lengthW: number;
}

/**
 * MIL-F-8785C's low-altitude intensities and scales at `height` metres, for a
 * mean wind at 20 ft of `w20` m/s; held at the band's edges (see the header).
 */
export function drydenIntensity(w20: number, height: number, out: DrydenIntensity): DrydenIntensity {
  const h = Math.min(Math.max(height, DRYDEN_LOW), DRYDEN_HIGH) / FT;
  const shape = 0.177 + 0.000823 * h;
  const sigmaW = 0.1 * Math.abs(w20);
  out.sigmaW = sigmaW;
  out.sigmaU = sigmaW / shape ** 0.4;
  out.lengthW = h * FT;
  out.lengthU = (h / shape ** 1.2) * FT;
  return out;
}

const intensity: DrydenIntensity = { sigmaU: 0, sigmaW: 0, lengthU: 0, lengthW: 0 };
const SQRT3 = Math.sqrt(3);
/** The continuous w filter's output variance per unit-variance input lag (see the test). */
const W_VARIANCE_GAIN = 2;

/**
 * Advance the turbulence by one step and write `world.gust` and
 * `world.gustVertical`. In calm air it writes zeros and draws nothing.
 *
 * @param altitude m, where the vehicle is now
 * @param airspeed m/s, through the mean air
 */
export function updateTurbulence(
  world: WorldState,
  rng: RngState,
  altitude: number,
  airspeed: number,
  dt: number,
): void {
  if (world.wind === 0) return;
  const mean = Math.abs(meanWindAt(world.wind, altitude));
  drydenIntensity(meanWindAt(world.wind, W20_HEIGHT), altitude, intensity);
  const sweep = Math.max(airspeed, mean);

  // Two independent standard normals from one stream (Box-Muller).
  const r = Math.sqrt(-2 * Math.log(1 - draw(rng, 'turbulence')));
  const theta = 2 * Math.PI * draw(rng, 'turbulence');
  const n1 = r * Math.cos(theta);
  const n2 = r * Math.sin(theta);

  // u: a unit-variance Ornstein-Uhlenbeck state with time constant Lu / V.
  const au = Math.exp((-sweep * dt) / intensity.lengthU);
  world.turbulenceU = au * world.turbulenceU + Math.sqrt(1 - au * au) * n1;

  // w: Dryden's (1 + √3 τs)/(1 + τs)² as √3·x1 + (1 − √3)·x2, x1 the
  // unit-variance lag of white noise and x2 the lag of x1.
  const aw = Math.exp((-sweep * dt) / intensity.lengthW);
  const x1 = world.turbulenceW1;
  world.turbulenceW1 = aw * x1 + Math.sqrt(1 - aw * aw) * n2;
  world.turbulenceW2 = aw * world.turbulenceW2 + (1 - aw) * x1;

  world.gust = intensity.sigmaU * world.turbulenceU;
  world.gustVertical =
    (intensity.sigmaW / Math.sqrt(W_VARIANCE_GAIN)) *
    (SQRT3 * world.turbulenceW1 + (1 - SQRT3) * world.turbulenceW2);
}
