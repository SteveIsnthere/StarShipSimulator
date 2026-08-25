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
 *   1. the vehicle stays inside the frame, with margin, over all seven goldens
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
  };
}

/**
 * drawMethods.js:184 — accelerate toward a target position.
 *
 * Inside `threshold` it is a simple proportional pull. Between `threshold` and
 * `max` the gain rises as the gap widens, so the camera catches up harder the
 * further behind it falls. Beyond `max` it gives up and lets the vehicle leave
 * the frame, which is what keeps it from lurching after a crash.
 */
export function centerizeAcceleration(
  currentPos: number,
  targetPos: number,
  threshold: number,
  max: number,
  timeToAlign: number,
): number {
  const difference = targetPos - currentPos;
  const magnitude = Math.abs(difference);

  if (magnitude < threshold) return difference / timeToAlign;
  if (magnitude < max) {
    return (difference / timeToAlign) * ((max - threshold) / (max - magnitude));
  }
  return 0;
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
 * Pa — dynamic pressure at which airframe shake reaches its full amplitude.
 *
 * Max-Q on an ascent is around 30 kPa, which is where the vehicle is being
 * shaken hardest and is the moment the shake exists to convey.
 */
export const SHAKE_FULL_Q = 30_000;

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
 * Advance the camera by `dt` real seconds.
 *
 * Mutates in place: this runs once per frame and CLAUDE.md asks for no
 * allocation on that path.
 */
export function updateCamera(
  camera: CameraState,
  target: CameraTarget,
  viewport: Viewport,
  dt: number,
  options?: CameraOptions,
): void {
  camera.sticky = shouldBeSticky(target, viewport);

  /*
    Where the camera looks is the vehicle plus a LEAD along its direction of
    travel, so there is space ahead of the ship rather than behind it. The lead
    goes into the TARGET, not into the camera's position: the follow law then
    converges on it the same damped way it converges on everything else, which
    is what keeps properties 2 and 3 true for free. An offset added to the
    output would have needed its own damping and its own frame-rate proof.
  */
  const leadX = framingLead(target.speedX, viewport.physicalWidth);

  camera.accX =
    centerizeAcceleration(
      camera.posX,
      target.downRangeDistance + leadX,
      viewport.physicalWidth * 0.25,
      viewport.physicalWidth / 2,
      ALIGN_TIME_CENTERIZE,
    ) +
    matchSpeedAcceleration(
      camera.speedX,
      target.speedX,
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
    const leadY = framingLead(target.speedY, viewport.physicalHeight);
    camera.accY =
      centerizeAcceleration(
        camera.posY,
        target.altitude + leadY,
        viewport.physicalHeight * 0.25,
        viewport.physicalHeight / 2,
        ALIGN_TIME_CENTERIZE,
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

  /*
    The lens, last, and separately from everything above.

    `shakeTime` advances by dt so the oscillators run at the same rate whatever
    the frame rate — a shake driven by a frame counter would be a different
    shake at 30 fps, which is the 2021 bug this rewrite exists to avoid
    repeating.
  */
  if (options?.reducedMotion) {
    camera.shakeX = 0;
    camera.shakeY = 0;
    return;
  }
  camera.shakeTime += dt;
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
