/**
 * The camera's per-step follow: the simulation state the camera reads, copied
 * into one object allocated at creation, so the per-step path allocates
 * nothing (sim-core-conventions), and the follow options the session switches
 * (the cinematic camera mode).
 */
import { DT } from '$app/loop';
import { starBaseXPos } from '$core/constants';
import type { SimState } from '$core/state';
import type { MissionState } from '$core/mission';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import type { ViewApp } from '$view/app';
import { updateCamera, type CameraMode, type MutableViewport } from '$view/camera';

export interface CameraFollow {
  /** Move the camera one simulation step toward the vehicle. */
  step(view: ViewApp, state: SimState, mission?: MissionState): void;
  reset(view: ViewApp, state: SimState, mission?: MissionState): void;
  select(view: ViewApp, state: SimState): void;
  /** The framing in effect: follow, or the cinematic mode chosen. */
  setMode(mode: CameraMode): void;
}

export function createCameraFollow(): CameraFollow {
  let pairFraming = true;
  const fitted: MutableViewport = { width: 0, height: 0, physicalWidth: 0, physicalHeight: 0, scale: 0 };
  const target = {
    downRangeDistance: 0,
    altitude: 0,
    speedX: 0,
    speedY: 0,
    landed: false,
    onTheGround: false,
    crashed: false,
    dynamicPressure: 0,
    thrustAcceleration: 0,
  };
  const options: { reducedMotion: boolean; mode: CameraMode; padX: number } = {
    reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    mode: 'follow',
    padX: starBaseXPos,
  };
  function read(state: SimState) {
    target.downRangeDistance = state.kinematics.downRangeDistance;
    target.altitude = state.kinematics.altitude;
    target.speedX = state.kinematics.speedX;
    target.speedY = state.kinematics.speedY;
    target.landed = state.status.landed;
    target.onTheGround = state.status.onTheGround;
    target.crashed = state.failures.crashed;
    target.dynamicPressure = state.forces.dynamicPressure;
    target.thrustAcceleration = state.forces.thrustAcceleration;
  }
  function framePair(view: ViewApp, mission: MissionState) {
    const a = mission.ship.kinematics, b = mission.booster.kinematics;
    // Spatial handoff, never a scripted timer or predicted separation.
    if (Math.hypot(a.downRangeDistance - b.downRangeDistance, a.altitude - b.altitude) > SHIP.height + SUPER_HEAVY.height) {
      pairFraming = false;
      return;
    }
    const ax = (Math.abs(Math.sin(a.pitch)) * SHIP.height + Math.abs(Math.cos(a.pitch)) * SHIP.diameter) / 2;
    const ay = (Math.abs(Math.cos(a.pitch)) * SHIP.height + Math.abs(Math.sin(a.pitch)) * SHIP.diameter) / 2;
    // Include deployed grid-fin span, not just the nine-metre hull.
    const bx = (Math.abs(Math.sin(b.pitch)) * SUPER_HEAVY.height + Math.abs(Math.cos(b.pitch)) * 17) / 2;
    const by = (Math.abs(Math.cos(b.pitch)) * SUPER_HEAVY.height + Math.abs(Math.sin(b.pitch)) * 17) / 2;
    const left = Math.min(a.downRangeDistance - ax, b.downRangeDistance - bx);
    const right = Math.max(a.downRangeDistance + ax, b.downRangeDistance + bx);
    const bottom = Math.min(a.altitude - ay, b.altitude - by);
    const top = Math.max(a.altitude + ay, b.altitude + by);
    target.downRangeDistance = (left + right) / 2;
    target.altitude = (bottom + top) / 2;
    target.speedX = (a.speedX + b.speedX) / 2;
    target.speedY = (a.speedY + b.speedY) / 2;
    const vp = view.viewport;
    const height = Math.max(vp.physicalHeight, (top - bottom) / 0.7, (right - left) / 0.7 * vp.height / vp.width);
    fitted.width = vp.width; fitted.height = vp.height;
    fitted.physicalHeight = height; fitted.physicalWidth = height * vp.width / vp.height;
    fitted.scale = vp.height / height;
    view.viewport = fitted;
  }
  function position(view: ViewApp) {
    const cam = view.camera;
    cam.posX = target.downRangeDistance;
    cam.posY = Math.max(view.viewport.physicalHeight / 2, target.altitude);
    cam.speedX = target.speedX; cam.speedY = target.speedY;
    cam.accX = 0; cam.accY = 0;
    cam.shakeX = 0; cam.shakeY = 0;
    cam.padHeld = false;
  }
  return {
    reset(view, state, mission) {
      pairFraming = true;
      read(state);
      view.followAltitude(state.kinematics.altitude);
      if (mission) framePair(view, mission);
      position(view);
    },
    select(view, state) {
      pairFraming = false;
      read(state);
      view.followAltitude(state.kinematics.altitude);
      position(view);
    },
    step(view, state, mission) {
      read(state);
      view.followAltitude(state.kinematics.altitude);
      if (mission && pairFraming) framePair(view, mission);
      updateCamera(view.camera, target, view.viewport, DT, options);
    },
    setMode(mode) {
      options.mode = mode;
    },
  };
}
