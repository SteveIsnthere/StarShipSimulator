/**
 * The sound, as pure functions of SimState.
 *
 * WHY THE CURVES LIVE APART FROM THE GRAPH. This is the same split as
 * `view/atmosphere-look.ts`: the Web Audio nodes are untestable in Node and
 * uninteresting anyway, while the DECISIONS — how loud, how bright, how much of
 * it survives in vacuum — are pure arithmetic that can be pinned at the exact
 * throttle settings and altitudes the seven scenarios reach. SOUND-PLAN § 6
 * makes that the plan: what no test can cover is whether it sounds good, so
 * everything that CAN be covered should be somewhere a test can reach it.
 *
 * NOTHING HERE IS A COMPRESSION in the M7 sense, and it is worth being precise
 * about why the honesty rule does not bite. M7's curves distorted the DEPICTION
 * of measurable quantities — a ground line that was not where the projection put
 * it. These map physical state onto loudness and timbre, and there is no "true"
 * loudness to depart from: the simulation does not model acoustic power, and a
 * player has a volume knob. What these owe instead is MONOTONICITY — more
 * throttle must never be quieter — because that is the property an ear reads as
 * information rather than as noise.
 */
import type { SimState } from '$core/state';

/** How many Raptors are actually lit — commanded, not failed, not still igniting. */
export function litEngines(state: SimState): number {
  const { running, failed, ignitionCountdown } = state.engines;
  let lit = 0;
  for (let i = 0; i < 3; i++) {
    if (running[i] && !failed[i] && ignitionCountdown[i] === null) lit += 1;
  }
  return lit;
}

/**
 * 0..1 — how loud the engines are.
 *
 * TWO INPUTS, AND THE PLAN NAMES WHY. § 1: "three Raptors at 40% and two at
 * 100% produce nearly the same thrust number and sound nothing alike". A single
 * thrust-derived level would collapse exactly the distinction the sound exists
 * to make, so engine COUNT and throttle enter separately.
 *
 * Count enters as a square root rather than linearly, because loudness is not
 * additive: three sources of equal power are about 4.8 dB above one, not three
 * times as loud, and a linear sum would make one engine inaudible next to
 * three. Throttle enters with a floor at its own minimum, because a Raptor at
 * its lowest setting is still an enormous noise — the interesting range is
 * 40-100%, not 0-100%.
 */
export function engineLevel(lit: number, throttleCurrent: number): number {
  if (lit <= 0) return 0;
  const count = Math.sqrt(Math.min(3, lit) / 3);
  const throttle = Math.max(0, Math.min(100, throttleCurrent)) / 100;
  // 0.55 at idle rising to 1.0 at full: the audible range of a running engine
  // is narrower than its thrust range, which is what makes throttle changes
  // read as changes rather than as on/off.
  return count * (0.55 + 0.45 * throttle);
}

/**
 * Hz — the centre of the rumble.
 *
 * A running rocket engine's character is mostly below 200 Hz; throttling up
 * raises the flow rate and with it the frequency of everything the plume is
 * doing. Rising with throttle is what makes a throttle-up READ as one on a
 * laptop speaker that cannot reproduce the fundamental at all.
 */
export function engineFilterHz(throttleCurrent: number): number {
  const throttle = Math.max(0, Math.min(100, throttleCurrent)) / 100;
  return 90 + 150 * throttle;
}

/**
 * Hz — the sub-oscillator under the noise.
 *
 * Fixed rather than throttle-linked, deliberately: this is the resonance of a
 * large metal object, and a pitch that slid with throttle would read as an
 * engine sound effect rather than as a vehicle. It is the one part of the
 * engine voice that does not move.
 */
export const ENGINE_SUB_HZ = 42;

/* ------------------------------------------------------------------------ */

/**
 * kPa — sea level, for normalising the atmosphere.
 *
 * KILOPASCALS, and the unit is the whole point of this comment. This constant
 * was written as 101_325 first, on the reasonable assumption that a pressure
 * field is in pascals — and every test passed, because both sides of every
 * comparison used the same wrong number. What caught it was pinning the curves
 * against real flights: `atmosphere.airPressure` peaks at 101.0 on the pad and
 * `forces.dynamicPressure` peaks at 23.6 on a launch, which is a textbook
 * max-Q in kPa and an absurdity in Pa. The layer had been computing an air
 * fraction of 0.1 at sea level and calling it full.
 *
 * `view/atmosphere-look.ts` has had `SEA_LEVEL_PRESSURE = 101.325` since M6.7
 * and is right. Duplicated rather than imported: `audio/` reaching sideways
 * into `view/` for a constant would be a dependency neither layer wants, and
 * the number is a fact about the atmosphere rather than about either of them.
 */
export const SEA_LEVEL_KPA = 101.325;

/**
 * 0..1 — how much of the atmosphere is left to carry sound.
 *
 * THIS IS THE MILESTONE, and M8.3 is where it gets its own tests. Everything
 * aerodynamic, and most of what you hear of your own engine, arrives through
 * air; `atmosphere.airPressure` has been in SimState since M1.1 and M6.7
 * already draws with it.
 *
 * Cube root rather than linear, for the same reason the streaks' rejected air
 * term would have needed one: pressure falls exponentially with altitude, so a
 * linear reading would switch everything off a few kilometres up — long before
 * the vehicle is anywhere interesting.
 */
export function airFraction(airPressure: number): number {
  if (!Number.isFinite(airPressure) || airPressure <= 0) return 0;
  return Math.cbrt(Math.min(1, airPressure / SEA_LEVEL_KPA));
}

/**
 * The floor the engine falls to in vacuum, never zero.
 *
 * SOUND-PLAN § 3.2: structural conduction is real — you are bolted to the thing
 * — and total silence during a burn reads as a bug rather than as physics. The
 * exact value is a listening decision, and this is a starting point rather than
 * an answer.
 */
export const ENGINE_VACUUM_FLOOR = 0.22;

/**
 * What the engine level becomes once the air is taken into account.
 *
 * The fade that is the point of the whole milestone, applied to the engine
 * only — the aerodynamic voices go to zero, because there is genuinely nothing
 * there, and that difference is what makes vacuum sound like vacuum rather than
 * like the volume being turned down.
 */
export function engineAirGain(airPressure: number): number {
  return ENGINE_VACUUM_FLOOR + (1 - ENGINE_VACUUM_FLOOR) * airFraction(airPressure);
}

/* ------------------------------------------------------------------------ *
 * Aerodynamic noise (M8.3) — the milestone
 * ------------------------------------------------------------------------ */

/**
 * kPa — the dynamic pressure at which airflow noise is at full strength.
 *
 * Measured rather than assumed: the launch golden peaks at 23.6 kPa and the
 * RTLS at 28.6, so 30 puts full strength just past the loudest moment either
 * flight actually has. Max-Q is both the loudest the airframe
 * ever is and the moment the sound exists to convey: the most direct feedback
 * there is that the vehicle is going too fast too low, and Q is a number in a
 * strip most players never expand (§ 1).
 */
export const AERO_FULL_Q = 30;

/**
 * 0..1 — how hard the air is tearing at the vehicle.
 *
 * Q ALONE, without a separate air term. That is not an oversight: dynamic
 * pressure is one half rho v squared, so the density of the air is already
 * inside it. Multiplying by `airFraction` as well would apply the atmosphere
 * twice and silence the one cue that matters at exactly the altitude where Q is
 * highest.
 *
 * The M7.5 lesson in a different key — there, an air term was removed because
 * it silenced a screen-space cue that had no business depending on air. Here
 * the dependence is real, and the mistake to avoid is counting it twice.
 */
export function aeroLevel(dynamicPressure: number): number {
  if (!Number.isFinite(dynamicPressure) || dynamicPressure <= 0) return 0;
  const q = Math.min(1, dynamicPressure / AERO_FULL_Q);
  // Square root, because the ear reads loudness closer to the square root of
  // power and a linear map spends almost all of its range in the last few
  // kilopascals — where the vehicle is usually already in trouble.
  return Math.sqrt(q);
}

/**
 * Hz — the centre of the airflow band, from Mach.
 *
 * Airflow noise gets brighter as it gets faster: at low speed it is a rush, and
 * approaching Mach 1 it is a scream. Bounded well inside what a phone speaker
 * can produce, because this is the cue a player is most likely to hear on the
 * worst hardware.
 */
export function aeroFilterHz(machSpeed: number): number {
  const mach = Math.max(0, Math.min(3, Number.isFinite(machSpeed) ? machSpeed : 0));
  return 420 + 900 * (mach / 3);
}

/**
 * m — the altitude by which aerodynamic noise has reached silence.
 *
 * ACTUAL zero, unlike the engine's floor. There is nothing out there to make a
 * noise: no air, no flow, no buffet. § 3.2 gives the engine a floor because
 * structural conduction is real and you are bolted to the thing — but there is
 * no mechanism at all by which a vacuum roars, and the CONTRAST between the two
 * is what makes vacuum sound like vacuum rather than like the volume being
 * turned down.
 */
export const AERO_SILENT_ALTITUDE = 50_000;

/**
 * 0..1 — the aerodynamic fade.
 *
 * Driven by `atmosphere.airPressure`, which has been in SimState since M1.1 and
 * which M6.7 already draws with — so the ear and the eye are reading the same
 * number, which is the whole reason it is worth using the one core already
 * keeps rather than deriving a second.
 *
 * THIS IS THE MILESTONE. Not the fade itself but what it leaves behind: the
 * engine falls to a floor and the air falls to nothing, and the moment those
 * two separate is the moment the atmosphere audibly runs out.
 */
export function aeroAirGain(airPressure: number): number {
  return airFraction(airPressure);
}

/* ------------------------------------------------------------------------ */

/**
 * Everything the audio layer needs from one frame, in one place.
 *
 * A flat record rather than a SimState so it can be built in a test by hand,
 * diffed cheaply, and — the reason that matters — so the binder can compare it
 * field by field and write only the AudioParams that moved. A
 * `setTargetAtTime` per parameter per frame at 120 Hz is how a Web Audio graph
 * starts stuttering (§ 6).
 */
export interface AudioParams {
  /** 0..1 — engine voice, before the air fade. */
  engine: number;
  /** Hz — engine filter centre. */
  engineHz: number;
  /** 0..1 — the air fade applied to the engine. Floors at ENGINE_VACUUM_FLOOR. */
  engineAir: number;
  /** 0..1 — airflow voice, before the air fade. */
  aero: number;
  /** Hz — airflow band centre. */
  aeroHz: number;
  /** 0..1 — the air fade applied to the airflow. Reaches zero. */
  aeroAir: number;
}

export function createAudioParams(): AudioParams {
  return {
    engine: 0,
    engineHz: engineFilterHz(0),
    engineAir: engineAirGain(SEA_LEVEL_KPA),
    aero: 0,
    aeroHz: aeroFilterHz(0),
    aeroAir: aeroAirGain(SEA_LEVEL_KPA),
  };
}

/** Fill `out` from `state`. Pure, allocation-free, and the only reader of SimState. */
export function readParams(state: SimState, out: AudioParams): void {
  const lit = litEngines(state);
  out.engine = engineLevel(lit, state.vehicle.throttleCurrent);
  out.engineHz = engineFilterHz(state.vehicle.throttleCurrent);
  out.engineAir = engineAirGain(state.atmosphere.airPressure);
  out.aero = aeroLevel(state.forces.dynamicPressure);
  out.aeroHz = aeroFilterHz(state.kinematics.machSpeed);
  out.aeroAir = aeroAirGain(state.atmosphere.airPressure);
}
