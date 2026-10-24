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
import { captureDamageTerminal, DamageTerminalReason } from '$core/physics/damage-terminal';
import { damageModelFor } from '$core/physics/damage-model';

it.each([SHIP, SUPER_HEAVY])('tracks actual moving terminal debris instead of the frozen $id parent while preserving onboard mode', model => {
  let state = createInitialState(123, model);
  state.kinematics.altitude = 3000; state.kinematics.downRangeDistance = 1000;
  state.kinematics.speedX = 120; state.kinematics.speedY = -50;
  captureDamageTerminal(state, model, DamageTerminalReason.Pressure, 0);
  state.failures.crashed = true;
  const frozen = { ...state.kinematics };
  for (let i = 0; i < 60; i++) state = step(state, DT, undefined, model);
  expect(state.kinematics.downRangeDistance).toBe(frozen.downRangeDistance);
  const catalogue = damageModelFor(model).partition.components;
  let mass = 0, x = 0, y = 0;
  for (let i = 0; i < catalogue.length; i++) {
    const p = state.damage!.debris[i]!, m = catalogue[i]!.mass;
    expect(p.active).toBe(true); mass += m; x += m * p.x; y += m * p.altitude;
  }
  const before = JSON.stringify(state), view = fixture(800, 600), follow = createCameraFollow();
  follow.setMode('onboard'); follow.reset(view, state, undefined, model); follow.step(view, state, undefined, model);
  expect(view.camera.posX).toBeCloseTo(x / mass);
  expect(view.camera.posY).toBeCloseTo(y / mass);
  expect(view.camera.posX).not.toBeCloseTo(frozen.downRangeDistance);
  expect(JSON.stringify(state)).toBe(before);
});

it('does not clamp terminal Follow framing back to a vanished uncrashed hull', () => {
  let state = createInitialState(123, SHIP);
  state.kinematics.altitude = 30000; state.kinematics.downRangeDistance = 1000;
  state.kinematics.speedX = 900; state.kinematics.speedY = -50;
  captureDamageTerminal(state, SHIP, DamageTerminalReason.Pressure, 0);
  for (let i = 0; i < 120; i++) state = step(state, DT, undefined, SHIP);
  state.failures.crashed = false;
  const view = fixture(800, 600), follow = createCameraFollow();
  follow.reset(view, state);
  const pieceCentre = view.camera.posX;
  follow.step(view, state);
  expect(view.camera.posX).toBeGreaterThan(pieceCentre - 1);
  expect(view.camera.posX).toBeGreaterThan(state.kinematics.downRangeDistance + 100);
});

it('keeps decelerating terminal pieces visible during continuous phone Follow', () => {
  let state = createInitialState(123, SHIP);
  state.kinematics.altitude = 700; state.kinematics.downRangeDistance = 30000;
  state.kinematics.speedX = 900; state.kinematics.speedY = -50;
  const view = fixture(390, 788), follow = createCameraFollow();
  follow.reset(view, state);
  captureDamageTerminal(state, SHIP, DamageTerminalReason.Pressure, 0);
  for (let tick = 0; tick < 720; tick++) {
    state = step(state, DT, undefined, SHIP); follow.step(view, state);
    for (const piece of state.damage!.debris) {
      if (!piece.active) continue;
      const at = worldToScreen(view.camera, view.viewport, piece.x, piece.altitude);
      expect(at.x).toBeGreaterThanOrEqual(0); expect(at.x).toBeLessThanOrEqual(390);
      expect(at.y).toBeGreaterThanOrEqual(0); expect(at.y).toBeLessThanOrEqual(788);
    }
  }
});

it('fits terminal piece envelopes in Follow while leaving an attached damaged hull and manual pad choice alone', () => {
  const state = createInitialState(123, SHIP), view = fixture(800, 600), follow = createCameraFollow();
  state.kinematics.altitude = 3000; state.kinematics.downRangeDistance = starBaseXPos;
  state.damage!.debris[0]!.active = true; state.damage!.debris[0]!.x = 99999; state.damage!.debris[0]!.altitude = 99999;
  follow.setMode('onboard'); follow.reset(view, state); follow.step(view, state);
  expect(view.camera.posX).toBe(starBaseXPos); expect(view.camera.posY).toBe(3000);
  state.damage!.debris[0]!.active = false;
  captureDamageTerminal(state, SHIP, DamageTerminalReason.Pressure, 0);
  state.failures.crashed = true;
  follow.setMode('onboard'); follow.reset(view, state);
  const nativeHeight = view.viewport.physicalHeight;
  follow.setMode('follow'); follow.reset(view, state); follow.step(view, state);
  expect(view.viewport.physicalHeight).toBeGreaterThanOrEqual(nativeHeight);
  const pieces = damageModelFor(SHIP).debris.pieces;
  for (let i = 0; i < pieces.length; i++) {
    const p = state.damage!.debris[i]!, radius = pieces[i]!.supportRadius;
    const top = worldToScreen(view.camera, view.viewport, p.x, p.altitude + radius);
    const bottom = worldToScreen(view.camera, view.viewport, p.x, p.altitude - radius);
    expect(top.y).toBeGreaterThan(600 * .1); expect(bottom.y).toBeLessThan(600 * .9);
  }
  follow.setMode('pad'); follow.reset(view, state); follow.step(view, state);
  expect(view.camera.padHeld).toBe(true);
  expect(view.camera.posX).toBeCloseTo(starBaseXPos);
});

function fixture(width: number, height: number): CameraFollowView {
  const native = computeViewport(width, height, SHIP.height);
  return { viewport: native, camera: createCamera(native, 0, 0, 0),
    followAltitude(altitude) { this.viewport = computeViewport(width, height, SHIP.height, 1, altitude); } };
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
    const native = computeViewport(1280, 720, SHIP.height, 1, state.kinematics.altitude);
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
