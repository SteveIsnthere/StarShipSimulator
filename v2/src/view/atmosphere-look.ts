/**
 * The four things M6.7 adds to the world, as pure functions.
 *
 * WHY THEY LIVE HERE AND NOT IN THE COMPONENTS THAT USE THEM. Every one of
 * these is a curve — how far the horizon bends at altitude, how wide a plume
 * blooms as the air thins, how bright a plasma trail gets. A curve buried in a
 * render loop is a curve nobody can check, and "it looked right on my machine"
 * is exactly the standard M6 exists to raise the project above. Separated out,
 * each is a function of one number that a test can pin at the altitudes and
 * pressures the seven scenarios actually visit.
 *
 * All of it is READ-ONLY over SimState. `core/` is frozen for this milestone,
 * the golden digests may not move, and the discipline that makes that provable
 * is that view/ never writes anything back.
 */
import { planetRadius } from '$core/constants';

// --- horizon curvature -----------------------------------------------------

/**
 * Distance to the visible horizon from a given altitude, in metres.
 *
 * The tangent-line result: sqrt(2Rh + h^2). Exact for a sphere, and the h^2
 * term is not negligible at the altitudes this game reaches — at 150 km it is
 * already 1% of the total.
 */
export function horizonDistance(altitude: number): number {
  const h = Math.max(0, altitude);
  return Math.sqrt(2 * planetRadius * h + h * h);
}

/**
 * How far the horizon's middle rises above its edges, as a fraction of the
 * viewport's width.
 *
 * The half-angle subtended at the planet's centre by the visible ground is
 * `horizonDistance / R` to first order, and half of that is what shows as a
 * bow across the frame. That gives numbers that are small where they should be
 * small — 0.9% of the screen at 1 km, which is correctly imperceptible — and
 * arrive when they should: about 9% at 100 km, which is roughly what a
 * webcast's onboard camera shows at stage separation.
 *
 * Capped, because the approximation stops meaning anything once the whole
 * planet would be in frame and the game never goes there.
 */
export function horizonSagittaFraction(altitude: number): number {
  return Math.min(0.25, horizonDistance(altitude) / (2 * planetRadius));
}

// --- atmospheric haze ------------------------------------------------------

/**
 * The scale height of the haze band, in metres.
 *
 * Aerosol scattering — the part of the atmosphere you can SEE, as opposed to
 * the part that produces drag — is concentrated much lower than the air itself:
 * the observed aerosol scale height is around 1.2 km, against 8.5 km for
 * density. That is why the visible band above the horizon is thin and why it
 * disappears so much sooner than the atmosphere does.
 */
export const HAZE_SCALE_HEIGHT = 1_200;

/**
 * How strongly the haze band shows, 0..1.
 *
 * Two effects multiplied, and they pull opposite ways, which is what makes the
 * curve interesting rather than a fade-out. Looking THROUGH more air makes the
 * band brighter, so it strengthens as the vehicle climbs out of the layer and
 * starts looking along it. Rising above the aerosol entirely takes it away
 * again. The result peaks a few kilometres up — which is exactly where the
 * horizon looks haziest from an aeroplane.
 */
export function hazeIntensity(altitude: number): number {
  const h = Math.max(0, altitude);
  const remaining = Math.exp(-h / HAZE_SCALE_HEIGHT);
  const lookingAlong = 1 - Math.exp(-h / (HAZE_SCALE_HEIGHT * 2.5));
  return Math.min(1, remaining * lookingAlong * 4);
}

// --- plume expansion -------------------------------------------------------

/** kPa at sea level, the pressure a nozzle is worst matched to. */
export const SEA_LEVEL_PRESSURE = 101.325;

/**
 * How much wider the plume spreads at a given ambient pressure.
 *
 * A rocket exhaust expands until its pressure matches the air around it. At sea
 * level the atmosphere holds it in a tight pencil with visible shock diamonds;
 * in vacuum there is nothing to hold it and it blooms into a wide translucent
 * bell. It is the single most recognisable thing about watching an ascent, and
 * it is the reason a launch looks completely different at T+3 minutes than at
 * T+3 seconds.
 *
 * Modelled as a smooth ramp on the pressure ratio rather than from nozzle
 * geometry — the simulation has no nozzle area ratio to work from, and this is
 * a look rather than a calculation. The exponent below 1 makes most of the
 * change happen in the first half of the climb, which is where it actually
 * happens: by 30 km the air is already down to 1% of sea level.
 */
export function plumeSpreadFactor(ambientPressure: number): number {
  const ratio = Math.min(1, Math.max(0, ambientPressure / SEA_LEVEL_PRESSURE));
  return 1 + 2.6 * Math.pow(1 - ratio, 0.55);
}

/** The same curve, applied to particle size. Gentler: a bell, not a starburst. */
export function plumeScaleFactor(ambientPressure: number): number {
  const ratio = Math.min(1, Math.max(0, ambientPressure / SEA_LEVEL_PRESSURE));
  return 1 + 1.3 * Math.pow(1 - ratio, 0.55);
}

/* --- shock diamonds (M9.6) ------------------------------------------------ */

/**
 * m — the Raptor's nozzle exit diameter.
 *
 * The one piece of engine geometry the simulation has never carried: `core/`
 * knows a thrust and a mass flow and nothing about the bell that produces them.
 * It lives here rather than in `core/constants.ts` because nothing in the
 * physics reads it — it exists to set the SCALE of something drawn, and M9's
 * rule is that core stays frozen.
 */
export const NOZZLE_EXIT_DIAMETER = 1.3;

/**
 * kPa — the pressure the nozzle is matched to.
 *
 * Sea level, which makes the jet exactly matched on the pad and increasingly
 * UNDEREXPANDED all the way up — which is what a sea-level-optimised engine
 * does, and the regime that produces the visible train of diamonds. Modelling
 * the overexpanded case as well would mean a curve that dips to zero at the
 * matched altitude and rises again on both sides, and a non-monotonic spacing is
 * a worse thing to own than a slightly simplified one.
 */
export const NOZZLE_MATCHED_PRESSURE = SEA_LEVEL_PRESSURE;

/**
 * m — the shortest a shock cell gets, on the pad.
 *
 * The formula below goes to zero at the matched pressure, and a spacing of zero
 * is a division by zero wearing a physical justification. On the pad the cells
 * are TIGHT rather than absent, so the curve starts here and grows.
 */
export const SHOCK_CELL_MIN_LENGTH = 1.5;

/** m — and it stops growing here, well past the length of the drawn plume. */
export const SHOCK_CELL_MAX_LENGTH = 60;

/**
 * A look multiplier on the physical cell length.
 *
 * THE FORM IS PHYSICAL AND THE SIZE IS A DECISION, which is the same split
 * `plumeSpreadFactor` makes and for the same reason. Prandtl-Pack gives
 * `L = 1.306 * D * sqrt(Pe/Pa - 1)` for the first shock cell, which on a 1.3 m
 * nozzle is under a metre near the pad — physically right, and at the 3.6 px per
 * metre a 50 m vehicle is drawn at, three pixels. Three-pixel banding is dither.
 * The multiplier puts the cells where an eye can see them while the CURVE — how
 * they stretch as the air thins, and how fast — stays the one the physics gives.
 */
export const SHOCK_CELL_LOOK_MULTIPLIER = 4;

/**
 * m — how far apart the shock diamonds are at a given ambient pressure.
 *
 * Monotonically non-decreasing with altitude and bounded at both ends, which is
 * what makes it something a test can pin rather than an eye. The physics is the
 * shape: a jet that is more underexpanded has a longer first shock cell, so the
 * diamonds stretch out as the vehicle climbs and stop being a repeating pattern
 * at all — which is the correct way for them to disappear, and much better than
 * a fade.
 */
export function shockCellLength(
  ambientPressure: number,
  nozzleDiameter = NOZZLE_EXIT_DIAMETER,
): number {
  if (!Number.isFinite(ambientPressure) || ambientPressure >= NOZZLE_MATCHED_PRESSURE) {
    return SHOCK_CELL_MIN_LENGTH;
  }
  const pressure = Math.max(1e-6, ambientPressure);
  const underexpansion = NOZZLE_MATCHED_PRESSURE / pressure - 1;
  const physical =
    SHOCK_CELL_LOOK_MULTIPLIER * 1.306 * nozzleDiameter * Math.sqrt(Math.max(0, underexpansion));
  return Math.min(SHOCK_CELL_MAX_LENGTH, Math.max(SHOCK_CELL_MIN_LENGTH, physical));
}

/** Ambient pressure ratios between which the diamonds fade out. */
export const SHOCK_VISIBLE_RATIO = 0.25;
export const SHOCK_GONE_RATIO = 0.02;

/**
 * 0..1 — how strongly the diamonds read at a given ambient pressure.
 *
 * REACHES EXACTLY ZERO, and earlier than physics strictly requires. A shock
 * train exists wherever there is a pressure to shock against, which is a long
 * way up; what stops being TRUE well before that is that anyone can see it,
 * because the whole plume has gone translucent and the cells are tens of metres
 * apart. Fading to nothing by a quarter of a percent of a bar is the
 * conservative end of that, and a curve that reaches zero is one that cannot
 * leave a faint stripe on a vacuum plume where no stripe belongs.
 */
export function shockDiamondStrength(ambientPressure: number): number {
  if (!Number.isFinite(ambientPressure) || ambientPressure <= 0) return 0;
  const ratio = ambientPressure / NOZZLE_MATCHED_PRESSURE;
  if (ratio >= SHOCK_VISIBLE_RATIO) return 1;
  if (ratio <= SHOCK_GONE_RATIO) return 0;
  const t = (ratio - SHOCK_GONE_RATIO) / (SHOCK_VISIBLE_RATIO - SHOCK_GONE_RATIO);
  return t * t * (3 - 2 * t);
}

// --- re-entry plasma -------------------------------------------------------

/**
 * How bright the plasma trail is, 0..1.
 *
 * Scaled against the structural heat limit rather than an arbitrary number, so
 * the visual and the failure share a scale: by the time the trail is at full
 * intensity the vehicle is at four fifths of what will destroy it, which is the
 * same threshold the HEAT readout turns amber at (hud/metrics.ts).
 *
 * The floor keeps a warm shimmer off the screen during an ordinary landing
 * burn, where thermal power is a rounding error.
 */
export function plasmaIntensity(thermalPower: number, heatLimit: number): number {
  const fraction = thermalPower / (heatLimit * 0.8);
  if (fraction < 0.05) return 0;
  return Math.min(1, fraction);
}

// --- pad lighting ----------------------------------------------------------

/**
 * How lit the pad reads, 0 (full daylight) to 1 (fully dark sky).
 *
 * Driven by the same altitude fade the sky uses, which is the point: 2021
 * darkened the sky on a hard ascent and left the ground below it at noon
 * brightness, so the world came apart at the horizon. The ground now dims with
 * the sky, and the pad's own lights come up as it does — so a high-warp ascent
 * reads as leaving a lit pad behind rather than as the sky changing colour for
 * no reason.
 *
 * Takes the sky's lightness rather than an altitude, so the two can never drift
 * apart: there is one curve and this reads it.
 */
export function padLightIntensity(skyLightness: number): number {
  const darkness = 1 - skyLightness;
  return Math.min(1, Math.max(0, darkness / 0.6));
}

/** The ground's tint at a given sky lightness, as 0xRRGGBB over a base colour. */
export function groundTint(baseColor: number, skyLightness: number): number {
  // Not squared, unlike the sky. Ground under a darkening sky keeps more of its
  // own value than the sky does — squaring both made the horizon vanish into a
  // single flat tone at 60 km, which is the opposite of the depth this adds.
  const factor = 0.45 + 0.55 * skyLightness;
  const r = Math.round(((baseColor >> 16) & 0xff) * factor);
  const g = Math.round(((baseColor >> 8) & 0xff) * factor);
  const b = Math.round((baseColor & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
