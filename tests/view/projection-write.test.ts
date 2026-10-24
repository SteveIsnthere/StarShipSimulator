import { afterEach, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import * as cameraSpace from '$view/camera';
import { createWorld } from '$view/world';
import { GROUND_OBJECTS } from '$view/assets';
import { createSunLight, writeSun, DEFAULT_LAUNCH_HOUR } from '$view/sun';
import { createEffectDriver } from '$view/effects';
import { createParticleSystem } from '$view/particles';
import { createInitialState } from '$core/state';
import { SHIP } from '$core/vehicle';
import { rad } from '$core/units';

afterEach(() => vi.restoreAllMocks());

it('writes the original projection into owned outputs through pan, shake and zoom without changing its inputs', () => {
  expect(typeof cameraSpace.writeWorldToScreen).toBe('function');
  const out = { x: NaN, y: NaN, owner: 'caller' };
  for (const [width, height] of [[1280, 720], [390, 844], [844, 390]]) {
    const viewport = { ...cameraSpace.computeViewport(width!, height!, SHIP.height) };
    const camera = cameraSpace.createCamera(viewport, 0, 0, 0);
    camera.posX = 123.5; camera.posY = 40; camera.shakeX = -0.25; camera.shakeY = 0.125;
    for (const scale of [0.001, 0.5, 2, 12]) {
      viewport.scale = scale;
      const inputs = JSON.stringify({ camera, viewport });
      for (const x of [-1e7, -0, 0, 123.5, 1e7, Infinity, NaN]) {
        const y = x * 0.25;
        // Frozen pre-change expressions, independent of the new allocating wrapper.
        const expectedX = viewport.width / 2 + (x - camera.posX - camera.shakeX) * viewport.scale;
        const expectedY = viewport.height / 2 - (y - camera.posY - camera.shakeY) * viewport.scale;
        cameraSpace.writeWorldToScreen(camera, viewport, x, y, out);
        expect(Object.is(out.x, expectedX)).toBe(true);
        expect(Object.is(out.y, expectedY)).toBe(true);
        expect(out.owner).toBe('caller');
      }
      expect(JSON.stringify({ camera, viewport })).toBe(inputs);
    }
    camera.shakeX = camera.shakeY = 0;
    cameraSpace.writeWorldToScreen(camera, viewport, camera.posX, camera.posY, out);
    expect([out.x, out.y]).toEqual([viewport.width / 2, viewport.height / 2]);
  }
});

it('keeps allocating callers independent of later writes and other outputs', () => {
  expect(typeof cameraSpace.writeWorldToScreen).toBe('function');
  const viewport = cameraSpace.computeViewport(800, 600, SHIP.height);
  const camera = cameraSpace.createCamera(viewport, 0, 0, 0);
  const first = cameraSpace.worldToScreen(camera, viewport, 20, 30);
  const snapshot = { ...first };
  const second = cameraSpace.worldToScreen(camera, viewport, 20, 30);
  expect(second).toEqual(first); expect(second).not.toBe(first);
  const owned = { x: 0, y: 0 };
  cameraSpace.writeWorldToScreen(camera, viewport, 100, 200, owned);
  expect(first).toEqual(snapshot); expect(second).toEqual(snapshot);
  expect(owned).not.toEqual(snapshot);
});

function observeWrites() {
  expect(typeof cameraSpace.writeWorldToScreen).toBe('function');
  const original = cameraSpace.writeWorldToScreen;
  const samples: { out: object; x: number; y: number }[] = [];
  vi.spyOn(cameraSpace, 'writeWorldToScreen').mockImplementation((camera, viewport, x, y, out) => {
    original(camera, viewport, x, y, out);
    // Capture values now: every later write mutates the same owned scratch.
    expect(Object.is(out.x, viewport.width / 2 + (x - camera.posX - camera.shakeX) * viewport.scale)).toBe(true);
    expect(Object.is(out.y, viewport.height / 2 - (y - camera.posY - camera.shakeY) * viewport.scale)).toBe(true);
    samples.push({ out, x: out.x, y: out.y });
  });
  return samples;
}

it('real worlds reuse private horizon/shadow/pad/scenery outputs across day, night and changed projection', () => {
  const samples = observeWrites();
  const worlds = [createWorld(new Map()), createWorld(new Map())];
  const owned: Set<object>[] = [];
  try {
    for (const world of worlds) {
      const viewport = { ...cameraSpace.computeViewport(800, 600, SHIP.height) };
      const camera = cameraSpace.createCamera(viewport, 0, 0, 0); camera.posY = 50;
      const lighting = { sun: createSunLight(), downRangeDistance: 0, altitude: 50, pitch: 0 };
      const start = samples.length;
      for (const hour of [12, 0, 12, 0]) {
        writeSun(lighting.sun, 'custom', (hour - DEFAULT_LAUNCH_HOUR) * 3600, 0);
        world.update(camera, viewport, 0, 50, lighting);
        camera.posX += 5; camera.shakeX += 0.125; viewport.scale *= 0.99;
      }
      const writes = samples.slice(start);
      expect(writes.length).toBe(4 * (GROUND_OBJECTS.length + 2));
      const outputs = new Set(writes.map(sample => sample.out));
      expect(outputs.size).toBe(4);
      owned.push(outputs);
      const first = writes[0]!;
      expect(writes.filter(sample => sample.out === first.out)).toHaveLength(4);
      expect(writes.filter(sample => sample.out === first.out).at(-1)!.x).not.toBe(first.x);
    }
    for (const out of owned[0]!) expect(owned[1]!.has(out)).toBe(false);
  } finally { for (const world of worlds) world.container.destroy({ children: true }); }
});

it('real near-ground effect drivers reuse independent outputs and emit at the current ground projection', () => {
  const samples = observeWrites();
  const pools = [createParticleSystem(Texture.EMPTY, 64), createParticleSystem(Texture.EMPTY, 64)];
  const outputs: object[] = [];
  try {
    for (const pool of pools) {
      const driver = createEffectDriver(), state = createInitialState(123, SHIP);
      state.kinematics.altitude = 100; state.kinematics.pitch = rad(0);
      state.kinematics.downRangeDistance = 20; state.forces.thrust = 1;
      state.engines.running[0] = true;
      const viewport = { ...cameraSpace.computeViewport(800, 600, SHIP.height) };
      const camera = cameraSpace.createCamera(viewport, 0, 0, 0);
      const emitted = vi.spyOn(pool, 'emit');
      const start = samples.length;
      for (let i = 0; i < 3; i++) {
        camera.posX += 10; camera.posY += 2; viewport.scale *= 1.01;
        driver.update(pool, camera, viewport, state, state, 1 / 120);
        const smoke = emitted.mock.calls.filter(call => call[0] === 'groundSmoke').at(-1)!;
        expect(smoke[1]).toBe(samples.at(-1)!.x); expect(smoke[2]).toBe(samples.at(-1)!.y);
      }
      const writes = samples.slice(start);
      expect(writes).toHaveLength(3);
      expect(new Set(writes.map(sample => sample.out)).size).toBe(1);
      outputs.push(writes[0]!.out);
    }
    expect(outputs[0]).not.toBe(outputs[1]);
  } finally { for (const pool of pools) pool.destroy(); }
});
