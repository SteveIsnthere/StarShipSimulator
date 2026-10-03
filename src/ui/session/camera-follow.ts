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
import { SHIP, type VehicleDefinition } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import type { ViewApp } from '$view/app';
import { updateCamera, type CameraMode, type MutableViewport } from '$view/camera';

export type CameraFollowView = Pick<ViewApp, 'viewport' | 'camera' | 'followAltitude'>;

export interface CameraFollow {
  /** Move the camera one simulation step toward the vehicle. */
  step(view: CameraFollowView, state: SimState, mission?: MissionState, model?: VehicleDefinition): void;
  reset(view: CameraFollowView, state: SimState, mission?: MissionState, model?: VehicleDefinition): void;
  select(view: CameraFollowView, state: SimState, model?: VehicleDefinition): void;
  /** The framing in effect: follow, or the cinematic mode chosen. */
  setMode(mode: CameraMode): void;
}

export function createCameraFollow(): CameraFollow {
  let pairFraming = true;
  const fitted: MutableViewport = { width: 0, height: 0, physicalWidth: 0, physicalHeight: 0, scale: 0 };
  const shipBounds = { left: 0, right: 0, bottom: 0, top: 0 };
  const boosterBounds = { ...shipBounds };
  const bounds = { ...shipBounds };
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
    // Camera ground-stop signal, not the physical landed/caught verdict.
    target.landed = state.status.landed && state.status.onTheGround;
    target.onTheGround = state.status.onTheGround;
    target.crashed = state.failures.crashed;
    target.dynamicPressure = state.forces.dynamicPressure;
    target.thrustAcceleration = state.forces.thrustAcceleration;
  }
  function writeBounds(out: typeof bounds, pose: SimState['kinematics'], height: number, diameter: number) {
    const x = (Math.abs(Math.sin(pose.pitch)) * height + Math.abs(Math.cos(pose.pitch)) * diameter) / 2;
    const y = (Math.abs(Math.cos(pose.pitch)) * height + Math.abs(Math.sin(pose.pitch)) * diameter) / 2;
    out.left = pose.downRangeDistance - x; out.right = pose.downRangeDistance + x;
    out.bottom = pose.altitude - y; out.top = pose.altitude + y;
  }
  function fit(view: CameraFollowView, groundSpan = 0) {
    const vp = view.viewport;
    const height = Math.max(vp.physicalHeight, groundSpan, (bounds.top - bounds.bottom) / 0.7,
      (bounds.right - bounds.left) / 0.7 * vp.height / vp.width);
    fitted.width = vp.width; fitted.height = vp.height;
    fitted.physicalHeight = height; fitted.physicalWidth = height * vp.width / vp.height;
    fitted.scale = vp.height / height;
    view.viewport = fitted;
  }
  function frameBooster(view: CameraFollowView, state: SimState, model: VehicleDefinition) {
    if (model.id !== 'super-heavy') return;
    writeBounds(bounds, state.kinematics, model.height, 17);
    const caught = state.status.landed && !state.status.onTheGround;
    if (caught) {
      // A real airborne catch must include the pad at the unchanged first
      // verdict frame. The ordinary camera floor/damping still owns position.
      bounds.left = Math.min(bounds.left, starBaseXPos);
      bounds.right = Math.max(bounds.right, starBaseXPos);
      bounds.bottom = Math.min(bounds.bottom, 0);
    }
    // The fixed physical target is the frame centre; its distance to ground
    // therefore needs twice that span to keep the pad inside the first frame.
    fit(view, caught ? 2 * Math.max(0, state.kinematics.altitude) : 0);
  }
  function framePair(view: CameraFollowView, mission: MissionState) {
    const a = mission.ship.kinematics, b = mission.booster.kinematics;
    // Spatial handoff, never a scripted timer or predicted separation.
    if (Math.hypot(a.downRangeDistance - b.downRangeDistance, a.altitude - b.altitude) > SHIP.height + SUPER_HEAVY.height) {
      pairFraming = false;
      return;
    }
    writeBounds(shipBounds, a, SHIP.height, SHIP.diameter);
    writeBounds(boosterBounds, b, SUPER_HEAVY.height, 17);
    bounds.left = Math.min(shipBounds.left, boosterBounds.left);
    bounds.right = Math.max(shipBounds.right, boosterBounds.right);
    bounds.bottom = Math.min(shipBounds.bottom, boosterBounds.bottom);
    bounds.top = Math.max(shipBounds.top, boosterBounds.top);
    target.downRangeDistance = (bounds.left + bounds.right) / 2;
    target.altitude = (bounds.bottom + bounds.top) / 2;
    target.speedX = (a.speedX + b.speedX) / 2;
    target.speedY = (a.speedY + b.speedY) / 2;
    fit(view);
  }
  function position(view: CameraFollowView) {
    const cam = view.camera;
    cam.posX = target.downRangeDistance;
    cam.posY = Math.max(view.viewport.physicalHeight / 2, target.altitude);
    cam.speedX = target.speedX; cam.speedY = target.speedY;
    cam.accX = 0; cam.accY = 0;
    cam.shakeX = 0; cam.shakeY = 0;
    cam.padHeld = false;
  }
  return {
    reset(view, state, mission, model = SHIP) {
      pairFraming = true;
      read(state);
      view.followAltitude(state.kinematics.altitude);
      frameBooster(view, state, model);
      if (mission) framePair(view, mission);
      position(view);
    },
    select(view, state, model = SHIP) {
      pairFraming = false;
      read(state);
      view.followAltitude(state.kinematics.altitude);
      frameBooster(view, state, model);
      position(view);
    },
    step(view, state, mission, model = SHIP) {
      read(state);
      view.followAltitude(state.kinematics.altitude);
      frameBooster(view, state, model);
      if (mission && pairFraming) framePair(view, mission);
      updateCamera(view.camera, target, view.viewport, DT, options);
    },
    setMode(mode) {
      options.mode = mode;
    },
  };
}
