/**
 * The camera, ported from render/drawMethods/drawMethods.js and retuned in M7.3.
 *
 * A second-order "semi-sticky" follow: rather than snapping to the vehicle, the
 * camera accelerates toward it and toward matching its velocity, which is what
 * gives the 2021 game its floaty, weighty feel.
 *
 * THIS FILE USED TO SAY that feel was "worth preserving exactly, so the control
 * law is ported verbatim". That constraint was lifted by owner decision on
 * 2026-08-25 (DEPTH-AND-SPEED-PLAN § 6.1), because it was the thing standing in
 * front of the milestone's largest lever: the viewport was 356 x 200 metres at
 * EVERY altitude, so the ground left the screen above ~100 m and every scenario
 * but the final landing was flown against a blank sky.
 *
 * What replaced the verbatim port is not "anything goes". The bit-identical
 * guarantee was cheap and total, and five properties stand in its place —
 * asserted in tests/core/camera.test.ts, and the acceptance line of M7.3:
 *
 *   1. the vehicle stays inside the frame, with margin, over every golden
 *   2. the response is damped rather than springy — bounded overshoot, and it
 *      settles within a stated time
 *   3. frame-rate independence holds at 30, 60, 120 and 144 fps
 *   4. the camera path is deterministic for a given state sequence
 *   5. it never looks below the ground
 *
 * And one hard constraint, which is why `altitudeFov` is flat below 500 m: the
 * intro auto-landing sequence is named in CLAUDE.md's soul, and every landing
 * happens in that band. Leaving the curve flat there means the moments that
 * matter most are untouched BY CONSTRUCTION rather than by careful tuning.
 *
 * Two modes, chosen by the same rule as 2021:
 *   sticky   follows in both axes; used in flight
 *   ground   follows horizontally only and pins vertically to half a screen
 *            height; used when low and descending, so the ground stays put
 *
 * Lives in view/ and is driven from the interpolated render state, not from
 * inside the simulation. The 2021 version updated inside the physics loop and
 * scaled by `renderTimeInterval`, which is why camera motion changed with frame
 * rate. Here it takes a real dt.
 */

import { starBaseXPos } from '$core/constants';

/** How the drawn world maps to metres. */
export interface Viewport {
  /** px */
  readonly width: number;
  /** px */
  readonly height: number;
  /** m — world height the viewport covers. */
  readonly physicalHeight: number;
  /** m — world width the viewport covers. */
  readonly physicalWidth: number;
  /** px per metre. */
  readonly scale: number;
}

/**
 * The same thing, writable.
 *
 * `Viewport` is readonly because nothing that reads it should write it. But the
 * field of view now moves with altitude, which means it changes every frame, and
 * allocating a fresh viewport per frame is exactly what the budget forbids. So
 * the live one is mutated in place through this type and handed out as the
 * readonly one.
 */
export interface MutableViewport {
  width: number;
  height: number;
  physicalHeight: number;
  physicalWidth: number;
  scale: number;
}

export interface CameraState {
  /** m — world position the camera is centred on. */
  posX: number;
  posY: number;
  /** m/s */
  speedX: number;
  speedY: number;
  /** m/s^2 */
  accX: number;
  accY: number;
  /** Whether the camera is following vertically. */
  sticky: boolean;
  /**
   * m — the shake offset applied at DRAW time (M7.3).
   *
   * Kept out of `posX/posY` deliberately. Shake is a thing that happens to the
   * lens, not to where the camera is looking: feeding it into the control law
   * would make the follow chase its own vibration, and would put a wobble into
   * property 1 (the vehicle stays framed) that has nothing to do with framing.
   */
  shakeX: number;
  shakeY: number;
  /**
   * M11.6 — whether the pad camera is holding the pad. A latch, so the hold
   * has hysteresis: captured inside `PAD_CAPTURE_FRACTION`, released outside
   * `PAD_HOLD_FRACTION`, and never flickering between the two on a vehicle
   * drifting along the edge of the band.
   */
  padHeld: boolean;
  /**
   * s — accumulated time driving the shake oscillators.
   *
   * The shake is a sum of sines of this, NOT noise: `view/` may call
   * `Math.random`, but property 4 says the camera path must be deterministic
   * for a given state sequence, and a random shake would break it for no gain
   * a player could hear.
   */
  shakeTime: number;
}

/** drawMethods.js — the two alignment time constants. Seconds. */
export const ALIGN_TIME_CENTERIZE = 1;
export const ALIGN_TIME_MATCH_SPEED = 1;

/**
 * initDrawMethods.js:30 — vehicle heights that fit on screen.
 *
 * The drawn ship is kept between 100 and 220 px tall, which is what makes
 * `vehicleVerticalPropotion` depend on the window. In 2021 that leaked into the
 * simulation through the intro demo's start altitude (see core/scenarios.ts);
 * here it stays where it belongs.
 */
export const MIN_VEHICLE_DRAW_HEIGHT = 100;
export const MAX_VEHICLE_DRAW_HEIGHT = 220;
export const BASE_VERTICAL_PROPORTION = 4;

/**
 * px per metre — the zoom limits, from initDrawMethods.js:21-22.
 *
 * 2021 called this `drawingSize` and stored it on globalThis with the
 * misspelled `drawingSizeLowwerLimit`. The numbers are unchanged: at the 50 m
 * vehicle height they mean a drawn ship between 97.5 and 375 px tall.
 */
export const MIN_ZOOM_SCALE = 1.95;
export const MAX_ZOOM_SCALE = 7.5;

/** tools.js:152 — the zoom steps. In, then out, does not return to where it was. */
export const ZOOM_IN_FACTOR = 1.5;
export const ZOOM_OUT_FACTOR = 0.75;

/**
 * tools.js:152 — apply one zoom step, refusing the step that would leave range.
 *
 * The `* 0.85` in the guard is 2021's and is kept: it tests the value against a
 * point 15% below where the step would land, so the last step in each direction
 * is allowed to overshoot the nominal limit slightly. Removing it would change
 * how far the zoom actually goes, which is feel.
 */
export function zoomStep(scale: number, factor: number): number {
  if (factor > 1) return scale * 0.85 < MAX_ZOOM_SCALE ? scale * factor : scale;
  return scale * 0.85 > MIN_ZOOM_SCALE ? scale * factor : scale;
}

/* ------------------------------------------------------------------------ *
 * Altitude-linked field of view (M7.3)
 * ------------------------------------------------------------------------ */

/**
 * m — below this the field of view does not move at all.
 *
 * THE ONE HARD CONSTRAINT of the owner decision. Every landing, and the whole
 * intro auto-landing sequence that CLAUDE.md names as part of the soul, happens
 * under 500 m. Flat here means those moments are untouched by construction, and
 * that is a stronger guarantee than any amount of careful tuning: there is no
 * tuning to get wrong.
 */
export const FOV_FLAT_ALTITUDE = 500;

/**
 * m — where the field of view has finished opening.
 *
 * 20 km, because the plan is explicit that what a moderate zoom-out actually
 * buys is "the 500 m to 20 km band, which is most of an ascent". Above it the
 * curve is flat again: there is no point spending range on altitudes where
 * nothing is visible anyway — § 2 of the plan shows reaching the ground from
 * 75 km would need 0.0096 px/m, at which the vehicle is half a pixel.
 */
export const FOV_FULL_ALTITUDE = 20_000;

/**
 * The moderate setting, chosen by the owner from three on 2026-08-25.
 *
 * 5x takes the viewport from 200 m to about 1 km and the drawn vehicle from
 * ~180 px to ~36 px — the world gets room to breathe while the ship stays
 * clearly the subject rather than becoming a marker.
 */
export const FOV_MAX = 5;

/**
 * How much wider the view is than its baseline, at this altitude.
 *
 * Returns 1 (no change) below FOV_FLAT_ALTITUDE, rising monotonically to
 * FOV_MAX at FOV_FULL_ALTITUDE and flat above it.
 *
 * SMOOTHSTEP over a LOGARITHMIC interpolation, and both halves earn their place.
 * Log, because 500 m to 20 km is a factor of forty and a linear ramp would spend
 * almost all of its range above 10 km where it is least useful. Smoothstep,
 * because a bare log has a corner at each end: the curve would be continuous but
 * its RATE would jump, and a field of view that starts opening abruptly at
 * 500 m is exactly the kind of thing a player notices without being able to say
 * what happened. With smoothstep the rate is zero at both ends, so the curve
 * leaves the flat region and arrives at the cap without a seam.
 */
export function altitudeFov(altitude: number): number {
  // NaN only. An infinite altitude is not a reason to snap back to the narrow
  // view — it is above the cap, so it gets the cap.
  if (Number.isNaN(altitude)) return 1;
  if (altitude <= FOV_FLAT_ALTITUDE) return 1;
  if (altitude >= FOV_FULL_ALTITUDE) return FOV_MAX;
  const t =
    Math.log(altitude / FOV_FLAT_ALTITUDE) / Math.log(FOV_FULL_ALTITUDE / FOV_FLAT_ALTITUDE);
  const eased = t * t * (3 - 2 * t);
  return 1 + (FOV_MAX - 1) * eased;
}

/**
 * Work out how much world the viewport covers, and write it into `out`.
 * drawMethods.js:62 (getInitSize) and :28-31.
 *
 * @param vehicleHeight m
 * @param zoom the player's manual zoom; > 1 is zoomed IN
 * @param altitude m — drives the field of view, which zoom MULTIPLIES rather
 *   than fights: the two combine as `zoom / altitudeFov`, so a pilot who zooms
 *   in at 20 km gets one step in from the wide view rather than one step in
 *   from a view the altitude curve is simultaneously pulling back out.
 */
export function writeViewport(
  out: MutableViewport,
  widthPx: number,
  heightPx: number,
  vehicleHeight: number,
  zoom = 1,
  altitude = 0,
): void {
  let proportion = BASE_VERTICAL_PROPORTION;
  let drawnVehicleHeight = heightPx / proportion;

  if (drawnVehicleHeight < MIN_VEHICLE_DRAW_HEIGHT) {
    proportion = (proportion * drawnVehicleHeight) / MIN_VEHICLE_DRAW_HEIGHT;
    drawnVehicleHeight = MIN_VEHICLE_DRAW_HEIGHT;
  }
  if (drawnVehicleHeight > MAX_VEHICLE_DRAW_HEIGHT) {
    proportion = (proportion * drawnVehicleHeight) / MAX_VEHICLE_DRAW_HEIGHT;
    drawnVehicleHeight = MAX_VEHICLE_DRAW_HEIGHT;
  }

  // Zooming in shows less world at more pixels per metre, so the proportion
  // shrinks by the same factor the scale grows by. Applied after the fit-to-
  // window clamp above, which decides the unzoomed baseline for this window.
  //
  // The altitude field of view divides into the same place: opening the view is
  // zooming out, so it is the reciprocal of a manual zoom step and the two
  // simply multiply.
  const effective = zoom / altitudeFov(altitude);
  proportion /= effective;
  drawnVehicleHeight *= effective;

  const physicalHeight = vehicleHeight * proportion;
  const aspect = widthPx / heightPx;

  out.width = widthPx;
  out.height = heightPx;
  out.physicalHeight = physicalHeight;
  out.physicalWidth = physicalHeight * aspect;
  out.scale = drawnVehicleHeight / vehicleHeight;
}

/**
 * The allocating form, for callers that want a viewport rather than to update
 * one: tests, and the one built at startup.
 */
export function computeViewport(
  widthPx: number,
  heightPx: number,
  vehicleHeight: number,
  zoom = 1,
  altitude = 0,
): Viewport {
  const out: MutableViewport = {
    width: 0,
    height: 0,
    physicalHeight: 0,
    physicalWidth: 0,
    scale: 0,
  };
  writeViewport(out, widthPx, heightPx, vehicleHeight, zoom, altitude);
  return out;
}

export function createCamera(
  viewport: Viewport,
  downRangeDistance: number,
  speedX: number,
  speedY: number,
): CameraState {
  return {
    posX: downRangeDistance,
    posY: viewport.physicalHeight / 2,
    speedX,
    speedY,
    accX: 0,
    accY: 0,
    sticky: true,
    shakeX: 0,
    shakeY: 0,
    shakeTime: 0,
    padHeld: false,
  };
}

/**
 * The most this law will ever multiply the proportional pull by.
 *
 * 2021's gain is `(max - threshold) / (max - magnitude)`, which has a POLE at
 * `max`: as the camera approaches the give-up radius from inside, the
 * acceleration goes to infinity. That was unreachable while the branch beyond
 * `max` returned zero, and M9.2 makes the give-up conditional, so it stops being
 * unreachable — and it fires. Instrumented on `reentry` with frames dropping,
 * one sub-step at a gain of 400 threw the camera to 10 km/s chasing a vehicle
 * doing 7, and the resulting overshoot put the ship 2.5 km outside the frame:
 * the fix for the give-up latch had reintroduced the same symptom from the other
 * side.
 *
 * Two is the cap because it is what keeps the response DAMPED. Outside
 * `threshold` the law is `x'' + x' + G*x = 0` on 2021's one-second constants, so
 * the damping ratio is `1 / (2*sqrt(G))`: at G = 2 that is 0.35 and a step
 * settles with about 30% overshoot, at G = 4 it is 0.25 and 44%, and at the
 * uncapped pole it is zero and the camera rings. It also bites nowhere the old
 * code did anything: the raw gain only exceeds 2 beyond 0.75 of the give-up
 * radius, and no golden scenario in steady flight gets past `threshold` at all.
 */
export const MAX_RECOVERY_GAIN = 2;

/**
 * drawMethods.js:184 — accelerate toward a target position.
 *
 * Inside `threshold` it is a simple proportional pull. Between `threshold` and
 * `max` the gain rises as the gap widens, so the camera catches up harder the
 * further behind it falls.
 *
 * BEYOND `max`, 2021 returned zero — the camera gave up and let the vehicle
 * leave the frame. The intent was "do not lurch after an explosion" and it is
 * worth keeping for exactly that; what it did in practice was apply to a vehicle
 * flying perfectly normally, and because the pull is zero out there the error
 * could never close again. A re-entry that fell behind once stayed behind for
 * the rest of the flight.
 *
 * So the give-up is now the CALLER'S choice, and by the owner's decision of
 * 2026-08-26 `updateCamera` makes it only when the vehicle has crashed. The
 * default is 2021's, so every existing caller and every existing test means what
 * it always meant.
 *
 * @param giveUpBeyondMax when true, return 0 outside `max` — 2021's behaviour,
 *   and what a destroyed vehicle still gets.
 */
export function centerizeAcceleration(
  currentPos: number,
  targetPos: number,
  threshold: number,
  max: number,
  timeToAlign: number,
  giveUpBeyondMax = true,
): number {
  const difference = targetPos - currentPos;
  const magnitude = Math.abs(difference);

  if (magnitude < threshold) return difference / timeToAlign;
  if (giveUpBeyondMax && magnitude >= max) return 0;

  /*
    Inside `max` the gain is 2021's, rising as the gap widens. Outside it — on a
    vehicle still flying, which since M9.2 is every case but a crash — the gain
    simply holds at the cap: the pull never stops, so the error always closes,
    and it never exceeds the bound that keeps the response damped.
  */
  const raw = magnitude < max ? (max - threshold) / (max - magnitude) : MAX_RECOVERY_GAIN;
  const gain = raw > MAX_RECOVERY_GAIN ? MAX_RECOVERY_GAIN : raw;
  return (difference / timeToAlign) * gain;
}

/** drawMethods.js:208 — accelerate toward matching a target velocity. */
export function matchSpeedAcceleration(
  currentSpeed: number,
  targetSpeed: number,
  timeToAlign: number,
): number {
  return (targetSpeed - currentSpeed) / timeToAlign;
}

/* ------------------------------------------------------------------------ *
 * Framing and shake (M7.3)
 * ------------------------------------------------------------------------ */

/**
 * s — how far ahead of itself the camera looks, in time.
 *
 * The lead is `speed * this`, so it is a distance the vehicle covers rather than
 * a fixed number of metres: it means the same thing at 30 m/s and at 3 km/s,
 * which a constant offset would not.
 */
export const LEAD_TIME = 0.6;

/**
 * The lead, as a fraction of the viewport's half-span.
 *
 * The cap is what keeps property 1 true. Without it a 7 km/s re-entry would ask
 * the camera to look four kilometres ahead of a 356 m viewport and the vehicle
 * would simply leave the frame — the lead is there to give the ship somewhere
 * to be going, not to lose it.
 */
export const LEAD_FRACTION = 0.18;

/** Where the camera should look, given where the vehicle is and where it is going. */
export function framingLead(speed: number, physicalSpan: number): number {
  const cap = physicalSpan * 0.5 * LEAD_FRACTION;
  const lead = speed * LEAD_TIME;
  return lead > cap ? cap : lead < -cap ? -cap : lead;
}

/**
 * kPa — dynamic pressure at which airframe shake reaches its full amplitude.
 *
 * KILOPASCALS, and until M9.3 this constant said pascals and held 30_000. The
 * comment beside it was right about the physics and wrong about the unit, which
 * is the worst way to be wrong: max-Q on an ascent IS around 30 kPa, and the
 * number written down was a thousand times that. `q / SHAKE_FULL_Q` came to
 * 0.00095 against the 28.6 kPa the RTLS golden actually peaks at, so the
 * aerodynamic half of the camera shake had never once fired since M7.3 built
 * it — every ascent this application has ever drawn was steadier than it should
 * have been, and no screenshot could say so.
 *
 * The root cause is one JSDoc line in `core/state.ts` that calls
 * `forces.dynamicPressure` psi. It is not psi and it is not Pa: `getDynamicPressure`
 * is `airDensity * trueSpeed**2 * 0.0005`, one half with a Pa-to-kPa conversion
 * folded into the constant. The same comment produced the same bug in the audio
 * layer at M8.3 (`AERO_FULL_Q`), a milestone apart, which is why M9.4 audits
 * every unit annotation in `core/` rather than fixing this one again.
 *
 * 30 rather than 28.6 so full amplitude sits just past the loudest moment either
 * flight has, matching `audio/params.ts`'s AERO_FULL_Q — the same physical claim
 * about the same peak, made by two layers that do not import from each other.
 * `tests/view/dynamic-pressure.test.ts` is what keeps them in the same universe.
 */
export const SHAKE_FULL_Q = 30;

/** m/s^2 — thrust acceleration at which engine shake reaches full amplitude. */
export const SHAKE_FULL_THRUST = 20;

/**
 * m — how far the lens moves at full amplitude, as a fraction of the viewport.
 *
 * A fraction rather than a distance, so the shake is the same size ON SCREEN at
 * every field of view. In metres it would vanish as the view opened, which is
 * backwards: the vehicle shakes hardest high and fast.
 */
export const SHAKE_FRACTION = 0.006;

/**
 * How hard the lens is being shaken, from 0 to 1.
 *
 * Two sources added and capped. Aerodynamic buffet and engine rumble are
 * different things physically, but a camera has only one lens and a player only
 * one screen: what matters is that both make it shake and that neither can make
 * it shake so hard the instrument becomes unreadable.
 */
export function shakeAmplitude(dynamicPressure: number, thrustAcceleration: number): number {
  const q = Math.max(0, dynamicPressure) / SHAKE_FULL_Q;
  const thrust = Math.max(0, thrustAcceleration) / SHAKE_FULL_THRUST;
  const total = q + thrust * 0.5;
  return total > 1 ? 1 : total;
}

/**
 * Two irrational-ratio sines per axis.
 *
 * Irrational so the pair never repeats on a period a player could learn, and
 * sines rather than noise so the result is DETERMINISTIC — property 4. A camera
 * that shook randomly would replay differently from the same state sequence,
 * and no one would be able to hear the difference.
 */
function shakeOffset(time: number, seed: number): number {
  return (
    Math.sin(time * (37.1 + seed) + seed) * 0.6 + Math.sin(time * (11.7 + seed * 2) + seed) * 0.4
  );
}

/** What the camera needs to know about the vehicle. */
export interface CameraTarget {
  readonly downRangeDistance: number;
  readonly altitude: number;
  readonly speedX: number;
  readonly speedY: number;
  readonly landed: boolean;
  readonly onTheGround: boolean;
  readonly crashed: boolean;
  /** Pa — drives airframe shake. Absent is treated as calm air. */
  readonly dynamicPressure?: number;
  /** m/s^2 — drives engine shake. */
  readonly thrustAcceleration?: number;
}

/**
 * The camera modes — M11.6. All four are the one follow law with a different
 * TARGET handed to it, which is what keeps the five properties true in every
 * mode without four proofs: the law is damped, frame-rate independent,
 * deterministic and floored whatever it is asked to look at.
 *
 *   follow   the cockpit camera: semi-sticky, with a lead along the velocity
 *   pad      the webcast's pad camera: fixed on the pad while the vehicle is
 *            within a third of a frame of it, panning up as it rises; when
 *            the vehicle leaves that band the same camera follows it, which
 *            is the cut the webcast makes to its next camera
 *   chase    close behind: a longer lead so the frame is ahead of the ship,
 *            and a tighter field of view
 *   onboard  on the vehicle: no lead, no lag, the tightest view; the world
 *            rushes past a fixed hull, as the onboard inset shows it
 */
export const CAMERA_MODES = ['follow', 'pad', 'chase', 'onboard'] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

/**
 * How far the pad camera lets the vehicle go before it follows, in frame
 * widths. Bounded by property 1: the vehicle must stay inside half a
 * half-frame of the centre, and 0.18 of the width is 0.36 of that with the
 * follow's lag on release still inside the bound (measured over every golden
 * in tests/core/camera.test.ts; 0.35 was not).
 */
export const PAD_HOLD_FRACTION = 0.18;
/** And how close it must come back before the pad camera takes hold again. */
export const PAD_CAPTURE_FRACTION = 0.12;
/**
 * The chase camera's lead, as a multiple of the follow camera's. The same
 * bound: 1.3 puts the vehicle 23% of a half-frame off centre by design and
 * the lag on top of it stays under 50% over every golden — re-entry, at
 * 7 km/s under a tighter field of view, is the case that sets it; 2.2 and
 * 1.5 did not.
 */
export const CHASE_LEAD = 1.3;

/** The field of view each mode asks for, as a zoom multiplier on the follow camera's. */
export function modeZoom(mode: CameraMode): number {
  switch (mode) {
    case 'chase':
      return 1.4;
    case 'onboard':
      return 2;
    default:
      return 1;
  }
}

export interface CameraOptions {
  /**
   * Hold the lens still.
   *
   * `prefers-reduced-motion` is a request not to be shaken, and it is the one
   * request this file has to honour: everything else here is the simulation
   * moving, and hiding that would be removing information. The shake is the
   * only part that is decoration.
   */
  readonly reducedMotion?: boolean;
  /** M11.6 — which camera. Defaults to `follow`. */
  readonly mode?: CameraMode;
  /** m — where the pad camera stands. Defaults to StarBase. */
  readonly padX?: number;
}

/** The target after the mode has had its say. Preallocated; see `effectiveTarget`. */
export interface ModeTarget {
  /** m — the downrange position to aim at. */
  x: number;
  /** m/s — the downrange speed to match. Zero while the pad camera holds. */
  speedX: number;
  /** Multiplier on the framing lead; zero pins the aim. */
  leadScale: number;
  /** Onboard only: the camera IS the vehicle, no law at all. */
  pinned: boolean;
  /** Pad only: whether the pad is held after this frame — the latch's next state. */
  held: boolean;
}
const modeScratch: ModeTarget = { x: 0, speedX: 0, leadScale: 1, pinned: false, held: false };

/**
 * What the mode does to the target, pure and allocation-free.
 *
 * The pad camera is FIXED while it holds: it aims at the pad, leads nothing
 * and matches a speed of zero — the first version aimed at the pad but still
 * matched the vehicle's speed, and review measured it dragged a third of a
 * frame off the pad under a landing approach. The hold is a latch with
 * hysteresis (`held` in, `out.held` out), so a vehicle drifting along the
 * band's edge does not snap the aim back and forth.
 */
export function effectiveTarget(
  mode: CameraMode,
  target: CameraTarget,
  viewport: Viewport,
  padX: number,
  held: boolean,
  out: ModeTarget,
): void {
  out.pinned = false;
  out.leadScale = 1;
  out.x = target.downRangeDistance;
  out.speedX = target.speedX;
  out.held = false;
  switch (mode) {
    case 'pad': {
      const distance = Math.abs(target.downRangeDistance - padX);
      const band = viewport.physicalWidth * (held ? PAD_HOLD_FRACTION : PAD_CAPTURE_FRACTION);
      if (distance <= band) {
        out.x = padX;
        out.speedX = 0;
        out.leadScale = 0;
        out.held = true;
      }
      return;
    }
    case 'chase':
      out.leadScale = CHASE_LEAD;
      return;
    case 'onboard':
      out.pinned = true;
      out.leadScale = 0;
      return;
    default:
      return;
  }
}

/**
 * drawMethods.js:95 — pick a mode.
 *
 * On the ground, or low and descending, the camera stops following vertically
 * so the horizon holds still. Otherwise it follows in both axes.
 */
export function shouldBeSticky(target: CameraTarget, viewport: Viewport): boolean {
  if (target.landed || target.onTheGround || target.crashed) return false;
  if (target.altitude <= viewport.physicalHeight && target.speedY < 0) return false;
  return true;
}

/**
 * s — the longest step this file will integrate in one go.
 *
 * WHY THE CAMERA SUB-STEPS (M9.2). Driving the view on simulated time fixed
 * WHICH number reaches the camera; it did not fix how big that number can get.
 * A dropped frame hands over 0.25 s at once, and time warp hands over up to nine
 * times the frame — at 9x on a 60 Hz display the camera would be integrated at
 * 6.7 Hz while the physics ran at 1080. One Euler step of 0.15 s moves a
 * re-entering vehicle 1.1 km, which is most of a frame width, and the camera's
 * own step cannot express that: it lags, and property 3 — the same camera path
 * at every frame rate — is violated by construction rather than by tuning.
 *
 * So `updateCamera` divides whatever it is given into steps no longer than this
 * and integrates each. 1/120 is the simulation's own rate, which makes the
 * choice principled rather than tuned: at the limit the camera advances in
 * lockstep with the physics it is following. It is written out here rather than
 * imported from `$app/loop` because dependencies point down and `app/` is above
 * `view/`; `tests/app/view-clock.test.ts` asserts the two agree.
 *
 * At a normal frame rate this changes nothing — 60 fps is 1/60, which is two
 * steps, and the result differs from one step by less than a hundredth of a
 * metre.
 */
export const CAMERA_MAX_DT = 1 / 120;

/**
 * The most sub-steps one call will ever take.
 *
 * `advance`'s own bailout can hand over sixteen seconds of simulated time in a
 * single frame, and a loop sized off that would be a stall of its own. Past the
 * cap the steps simply get longer: the camera is then integrating coarsely, but
 * a coarse camera is not a hang.
 */
export const MAX_CAMERA_SUBSTEPS = 64;

/**
 * One integration step of the follow law. See `updateCamera`.
 *
 * Split out so the sub-stepping loop has something to call, and kept free of
 * the shake, which is a property of the whole frame rather than of each step.
 */
function integrateCamera(
  camera: CameraState,
  target: CameraTarget,
  viewport: Viewport,
  dt: number,
  mode: CameraMode,
  padX: number,
): void {
  camera.sticky = shouldBeSticky(target, viewport);
  effectiveTarget(mode, target, viewport, padX, camera.padHeld, modeScratch);
  camera.padHeld = modeScratch.held;

  if (modeScratch.pinned) {
    /*
      ONBOARD (M11.6): the camera is the vehicle. No law, so nothing to damp
      and nothing that depends on dt — properties 2, 3 and 4 hold by having
      no dynamics — and the floor still applies: on the pad the camera sits
      half a frame up, as every mode does, which is property 5.
    */
    camera.posX = target.downRangeDistance;
    camera.speedX = target.speedX;
    camera.accX = 0;
    const floor = viewport.physicalHeight * 0.5;
    camera.posY = Math.max(floor, target.altitude);
    camera.speedY = target.speedY;
    camera.accY = 0;
    return;
  }

  /*
    Where the camera looks is the vehicle plus a LEAD along its direction of
    travel, so there is space ahead of the ship rather than behind it. The lead
    goes into the TARGET, not into the camera's position: the follow law then
    converges on it the same damped way it converges on everything else, which
    is what keeps properties 2 and 3 true for free. An offset added to the
    output would have needed its own damping and its own frame-rate proof.
  */
  const leadX = framingLead(target.speedX, viewport.physicalWidth) * modeScratch.leadScale;

  /*
    THE GIVE-UP IS FOR WRECKAGE ONLY (M9.2, owner decision 2026-08-26).

    A flying vehicle is always worth following, however far behind the camera
    has fallen; a destroyed one is not, and letting the lens hold still while
    the debris leaves the frame is the shot 2021 wanted. Passing `crashed`
    through is the smallest change that keeps that intent and makes every other
    case recoverable.
  */
  const giveUp = target.crashed;

  camera.accX =
    centerizeAcceleration(
      camera.posX,
      modeScratch.x + leadX,
      viewport.physicalWidth * 0.25,
      viewport.physicalWidth / 2,
      ALIGN_TIME_CENTERIZE,
      giveUp,
    ) +
    matchSpeedAcceleration(
      camera.speedX,
      modeScratch.speedX,
      // The ground camera matches speed half as eagerly, so a landing settles
      // rather than jittering. drawMethods.js:140.
      camera.sticky ? ALIGN_TIME_MATCH_SPEED : ALIGN_TIME_MATCH_SPEED * 2,
    );

  /*
    Semi-implicit Euler, as ported. Worth recording that a trapezoidal position
    step was tried here and abandoned: it moved the 30-versus-144 fps drift by
    0.001 m, because the error that matters is in the VELOCITY integration —
    an explicit step on an exponential approach — and not in the position. Two
    extra locals for a thousandth of a metre is not a trade.
  */
  camera.speedX += camera.accX * dt;
  camera.posX += camera.speedX * dt;

  if (camera.sticky) {
    const leadY = framingLead(target.speedY, viewport.physicalHeight) * modeScratch.leadScale;
    camera.accY =
      centerizeAcceleration(
        camera.posY,
        target.altitude + leadY,
        viewport.physicalHeight * 0.25,
        viewport.physicalHeight / 2,
        ALIGN_TIME_CENTERIZE,
        giveUp,
      ) + matchSpeedAcceleration(camera.speedY, target.speedY, ALIGN_TIME_MATCH_SPEED);

    camera.speedY += camera.accY * dt;
    camera.posY += camera.speedY * dt;

    // Never look below the ground. Property 5, and the reason the floor is half
    // a viewport rather than zero: the camera is centred, so the BOTTOM EDGE of
    // the frame is what must not go under.
    const floor = viewport.physicalHeight * 0.5;
    if (camera.posY < floor) camera.posY = floor;
  } else {
    camera.accY = 0;
    camera.speedY = 0;
    camera.posY = viewport.physicalHeight * 0.5;
  }
}

/**
 * Advance the camera by `dt` seconds of SIMULATED time.
 *
 * NOT REAL SECONDS, since M9.2, and the change of word is the whole of that
 * task. `App.svelte` used to hand this the wall frame time while `advance()`
 * simulated something else, and the gap between the two is not noise: it is the
 * clamp, the accumulator remainder, the slow-motion divisor, the warp
 * multiplier and the max-steps bailout, all of them one-directional. Pass
 * `AdvanceResult.simulatedDt`.
 *
 * Mutates in place: this runs once per frame and CLAUDE.md asks for no
 * allocation on that path. The sub-step loop allocates nothing.
 */
export function updateCamera(
  camera: CameraState,
  target: CameraTarget,
  viewport: Viewport,
  dt: number,
  options?: CameraOptions,
): void {
  // A negative or NaN dt is a clock that went backwards. Treat it as no time,
  // the same way the loop does, rather than as chaos.
  const span = dt > 0 ? dt : 0;
  const substeps =
    span > CAMERA_MAX_DT ? Math.min(MAX_CAMERA_SUBSTEPS, Math.ceil(span / CAMERA_MAX_DT)) : 1;
  const h = span / substeps;
  const mode = options?.mode ?? 'follow';
  const padX = options?.padX ?? starBaseXPos;
  for (let i = 0; i < substeps; i++) integrateCamera(camera, target, viewport, h, mode, padX);

  /*
    The lens, last, and separately from everything above.

    `shakeTime` advances by the whole span rather than per sub-step, so the
    oscillators run at the same rate whatever the frame rate — a shake driven by
    a frame counter would be a different shake at 30 fps, which is the 2021 bug
    this rewrite exists to avoid repeating.
  */
  if (options?.reducedMotion) {
    camera.shakeX = 0;
    camera.shakeY = 0;
    return;
  }
  camera.shakeTime += span;
  const amplitude =
    shakeAmplitude(target.dynamicPressure ?? 0, target.thrustAcceleration ?? 0) *
    viewport.physicalHeight *
    SHAKE_FRACTION;
  camera.shakeX = amplitude * shakeOffset(camera.shakeTime, 1);
  camera.shakeY = amplitude * shakeOffset(camera.shakeTime, 2);
}

/**
 * World metres to screen pixels, with y increasing upward in the world.
 *
 * The shake is applied HERE rather than in the camera's position, so every layer
 * that projects through this function shakes together — which is what makes it
 * read as the lens moving rather than as the vehicle wobbling against a still
 * world.
 */
export function worldToScreen(
  camera: CameraState,
  viewport: Viewport,
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  return {
    x: viewport.width / 2 + (worldX - camera.posX - camera.shakeX) * viewport.scale,
    y: viewport.height / 2 - (worldY - camera.posY - camera.shakeY) * viewport.scale,
  };
}
