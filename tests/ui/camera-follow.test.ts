/** Actual camera law and physical model dimensions; no renderer/clock mock. */
import { describe, expect, it } from 'vitest';
import { createCameraFollow, type CameraFollowView } from '$ui/session/camera-follow';
import { computeViewport, createCamera, updateCamera, worldToScreen } from '$view/camera';
import { createInitialState } from '$core/state';
import { createIntroState } from '$core/scenarios';
import { step } from '$core/step';
import { starBaseXPos } from '$core/constants';
import { DT } from '$app/loop';
import { SHIP } from '$core/vehicle';
import { CATCH, SUPER_HEAVY } from '$core/vehicles/super-heavy';

function fixture(width: number, height: number): CameraFollowView {
  const native = computeViewport(width, height, 50);
  return { viewport: native, camera: createCamera(native, 0, 0, 0),
    followAltitude(altitude) { this.viewport = computeViewport(width, height, 50, 1, altitude); } };
}

describe('selected physical vehicle framing', () => {
  for (const [width, height] of [[844, 47], [864, 215 / 3]] as const) {
    it(`keeps the complete airborne caught booster and ground in the first ${width}x${height} frame`, () => {
      const view = fixture(width, height), follow = createCameraFollow();
      const state = createInitialState(undefined, SUPER_HEAVY);
      state.status.landed = true; state.status.onTheGround = false;
      state.kinematics.altitude = CATCH.bodyCentreAltitude;
      state.kinematics.speedX = state.kinematics.speedY = 0;
      follow.reset(view, state, undefined, SUPER_HEAVY);
      follow.step(view, state, undefined, SUPER_HEAVY);
      const top = worldToScreen(view.camera, view.viewport, 0, CATCH.bodyCentreAltitude + SUPER_HEAVY.height / 2);
      const bottom = worldToScreen(view.camera, view.viewport, 0, CATCH.bodyCentreAltitude - SUPER_HEAVY.height / 2);
      const ground = worldToScreen(view.camera, view.viewport, 0, 0);
      expect(top.y).toBeGreaterThan(height * 0.1);
      expect(bottom.y).toBeLessThan(height * 0.9);
      expect(ground.y).toBeLessThanOrEqual(height);
      expect(view.camera.sticky).toBe(true);
      expect(state.status.landed).toBe(true); expect(state.status.onTheGround).toBe(false);
    });
  }

  it('retains the Ship ground framing and native field of view', () => {
    const view = fixture(1280, 720), follow = createCameraFollow();
    const state = createInitialState(undefined, SHIP);
    state.status.landed = true; state.status.onTheGround = true;
    const native = computeViewport(1280, 720, 50, 1, state.kinematics.altitude);
    follow.reset(view, state, undefined, SHIP); follow.step(view, state, undefined, SHIP);
    expect(view.viewport).toEqual(native);
    expect(view.camera.posY).toBe(native.physicalHeight / 2);
    expect(view.camera.sticky).toBe(false);
  });
});

it('frames the real attached stack readably while retaining its whole hull extent', async () => {
  const { createHotStageMission } = await import('$core/mission');
  const mission = createHotStageMission(), view = fixture(1280, 720), follow = createCameraFollow();
  follow.reset(view, mission.ship, mission, SHIP);
  const positions = [];
  for (const [state, model] of [[mission.ship, SHIP], [mission.booster, SUPER_HEAVY]] as const) {
    const k = state.kinematics;
    const spanY = (Math.abs(Math.cos(k.pitch)) * model.height + Math.abs(Math.sin(k.pitch)) * model.diameter) / 2;
    positions.push(worldToScreen(view.camera, view.viewport, k.downRangeDistance, k.altitude + spanY).y,
      worldToScreen(view.camera, view.viewport, k.downRangeDistance, k.altitude - spanY).y);
  }
  const top = Math.min(...positions), bottom = Math.max(...positions);
  expect(top).toBeGreaterThan(720 * 0.1);
  expect(bottom).toBeLessThan(720 * 0.9);
  expect(bottom - top, 'a real stack should occupy enough of the frame to read its separation').toBeGreaterThan(720 * 0.25);
});

it('preserves the original intro follow and native FOV at every real step on all five canvas sizes', () => {
  for (const [width, height] of [[1280, 720], [412, 783], [864, 360], [390, 608], [750, 340]]) {
    const view = fixture(width!, height!), follow = createCameraFollow();
    let state = createIntroState();
    follow.reset(view, state);
    const original = { ...view.camera };
    for (let i = 0; i < 1800; i++) {
      state = step(state, DT);
      const k = state.kinematics;
      const native = computeViewport(width!, height!, SHIP.height, 1, k.altitude);
      updateCamera(original, { downRangeDistance: k.downRangeDistance, altitude: k.altitude,
        speedX: k.speedX, speedY: k.speedY, landed: state.status.landed && state.status.onTheGround,
        onTheGround: state.status.onTheGround, crashed: state.failures.crashed,
        dynamicPressure: state.forces.dynamicPressure, thrustAcceleration: state.forces.thrustAcceleration,
      }, native, DT, { reducedMotion: false, mode: 'follow', padX: starBaseXPos });
      follow.step(view, state);
      expect(view.viewport).toEqual(native);
      expect(view.camera).toEqual(original);
    }
  }
});
