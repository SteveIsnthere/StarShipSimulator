/**
 * The camera's per-step follow: the simulation state the camera reads, copied
 * into one object allocated at creation, so the per-step path allocates
 * nothing (sim-core-conventions), and the follow options the session switches
 * (the cinematic camera mode).
 */
import { DT } from '$app/loop';
import { starBaseXPos } from '$core/constants';
import type { SimState } from '$core/state';
import type { ViewApp } from '$view/app';
import { updateCamera, type CameraMode } from '$view/camera';

export interface CameraFollow {
  /** Move the camera one simulation step toward the vehicle. */
  step(view: ViewApp, state: SimState): void;
  /** The framing in effect: follow, or the cinematic mode chosen. */
  setMode(mode: CameraMode): void;
}

export function createCameraFollow(): CameraFollow {
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
  return {
    step(view, state) {
      target.downRangeDistance = state.kinematics.downRangeDistance;
      target.altitude = state.kinematics.altitude;
      target.speedX = state.kinematics.speedX;
      target.speedY = state.kinematics.speedY;
      target.landed = state.status.landed;
      target.onTheGround = state.status.onTheGround;
      target.crashed = state.failures.crashed;
      target.dynamicPressure = state.forces.dynamicPressure;
      target.thrustAcceleration = state.forces.thrustAcceleration;
      updateCamera(view.camera, target, view.viewport, DT, options);
    },
    setMode(mode) {
      options.mode = mode;
    },
  };
}
