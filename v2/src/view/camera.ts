/**
 * The camera, ported from render/drawMethods/drawMethods.js.
 *
 * A second-order "semi-sticky" follow: rather than snapping to the vehicle, the
 * camera accelerates toward it and toward matching its velocity, which is what
 * gives the 2021 game its floaty, weighty feel. That feel is worth preserving
 * exactly, so the control law is ported verbatim.
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

/**
 * Work out how much world the viewport covers, from its pixel size.
 * drawMethods.js:62 (getInitSize) and :28-31.
 *
 * @param vehicleHeight m
 */
export function computeViewport(
  widthPx: number,
  heightPx: number,
  vehicleHeight: number,
  zoom = 1,
): Viewport {
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
  proportion /= zoom;
  drawnVehicleHeight *= zoom;

  const physicalHeight = vehicleHeight * proportion;
  const aspect = widthPx / heightPx;

  return {
    width: widthPx,
    height: heightPx,
    physicalHeight,
    physicalWidth: physicalHeight * aspect,
    scale: drawnVehicleHeight / vehicleHeight,
  };
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

/** What the camera needs to know about the vehicle. */
export interface CameraTarget {
  readonly downRangeDistance: number;
  readonly altitude: number;
  readonly speedX: number;
  readonly speedY: number;
  readonly landed: boolean;
  readonly onTheGround: boolean;
  readonly crashed: boolean;
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
): void {
  camera.sticky = shouldBeSticky(target, viewport);

  camera.accX =
    centerizeAcceleration(
      camera.posX,
      target.downRangeDistance,
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

  camera.speedX += camera.accX * dt;
  camera.posX += camera.speedX * dt;

  if (camera.sticky) {
    camera.accY =
      centerizeAcceleration(
        camera.posY,
        target.altitude,
        viewport.physicalHeight * 0.25,
        viewport.physicalHeight / 2,
        ALIGN_TIME_CENTERIZE,
      ) + matchSpeedAcceleration(camera.speedY, target.speedY, ALIGN_TIME_MATCH_SPEED);

    camera.speedY += camera.accY * dt;
    camera.posY += camera.speedY * dt;

    // Never look below the ground.
    const floor = viewport.physicalHeight * 0.5;
    if (camera.posY < floor) camera.posY = floor;
  } else {
    camera.accY = 0;
    camera.speedY = 0;
    camera.posY = viewport.physicalHeight * 0.5;
  }
}

/** World metres to screen pixels, with y increasing upward in the world. */
export function worldToScreen(
  camera: CameraState,
  viewport: Viewport,
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  return {
    x: viewport.width / 2 + (worldX - camera.posX) * viewport.scale,
    y: viewport.height / 2 - (worldY - camera.posY) * viewport.scale,
  };
}
