import { describe, expect, it } from 'vitest';
import { createEmissiveBell, writeBellGeometry } from '$view/emissive-bell';
import { plumeScaleFactor, plumeSpreadFactor } from '$view/atmosphere-look';

import { createScenarioState, getScenario } from '$core/scenarios';
import { Mesh } from 'pixi.js';

const buffers = () => ({ positions: new Float32Array(32 * 5 * 2), uvs: new Float32Array(32 * 5 * 2) });

describe('continuous nozzle-frame gas', () => {
  it('starts at the nozzle without displaying future ages', () => {
    const { positions, uvs } = buffers();
    writeBellGeometry(positions, uvs, 1, 1, 1, 0);
    for (let i = 0; i < positions.length; i += 2) {
      expect(positions[i + 1]).toBe(0);
      expect(uvs[i + 1]).toBe(0);
    }
    expect(positions[0]).toBeCloseTo(-1.53);
    expect(positions[8]).toBeCloseTo(1.53);
  });

  it('clips the growing geometry and fade to the same actual gas age', () => {
    const { positions, uvs } = buffers();
    writeBellGeometry(positions, uvs, 1, 1, 1, 0.105);
    expect(uvs.at(-1)).toBeCloseTo(0.25);
    expect(positions.at(-1)).toBeGreaterThan(0);
    expect(positions.at(-1)).toBeLessThan(11);
    expect(positions.slice(-10)).toEqual(positions.slice(-20, -10));
  });

  it('expands smoothly as ambient pressure drops while reusing finite buffers', () => {
    const { positions, uvs } = buffers();
    let previous = 0;
    for (const pressure of [101.325, 70, 30, 10, 0]) {
      writeBellGeometry(positions, uvs, plumeScaleFactor(pressure), plumeSpreadFactor(pressure), 1, 0.42);
      const width = positions.at(-2)! - positions.at(-10)!;
      expect(width).toBeGreaterThan(previous);
      previous = width;
      expect([...positions, ...uvs].every(Number.isFinite)).toBe(true);
      expect(uvs.at(-1)).toBe(1);
      // The complete envelope uses the same soft profile, not a flat angular plateau.
      expect(uvs.at(-10)).toBe(0);
      expect(uvs.at(-8)).toBeLessThan(0.5);
      expect(uvs.at(-6)).toBe(0.5);
      expect(uvs.at(-4)).toBeGreaterThan(0.5);
      expect(uvs.at(-2)).toBe(1);
    }
  });
});

describe('actual mount lifecycle', () => {
  it('shows only firing, healthy mounts and keeps capture visibility while updating', () => {
    const bell = createEmissiveBell();
    const state = createScenarioState(getScenario('landing-burn')!);
    state.engines.running.fill(true);
    state.engines.failed[1] = true;
    state.forces.thrust = 1;
    state.vehicle.throttleCurrent = 100;
    bell.update(state, 2, 100, 200, 0.42);
    expect(bell.container.children.filter(child => child.visible)).toHaveLength(5);
    expect(bell.container.children[0]!.x).toBe(98);
    expect(bell.container.children[0]!.y).toBe(200);
    bell.container.visible = false;
    bell.update(state, 2, 101, 201, 0);
    expect(bell.container.visible).toBe(false);
    state.forces.thrust = 0;
    bell.update(state, 2, 101, 201, 0);
    expect(bell.container.children.every(child => !child.visible)).toBe(true);
    bell.destroy();
  });

  it('holds gas age when paused and clears it on shutdown and flight reset', () => {
    const bell = createEmissiveBell();
    const state = createScenarioState(getScenario('landing-burn')!);
    state.engines.running.fill(false);
    state.engines.running[0] = true;
    state.forces.thrust = 1;
    bell.update(state, 1, 0, 0, 0.105);
    const mesh = bell.container.children[0] as Mesh;
    const positions = mesh.geometry.positions;
    const first = positions.slice();
    bell.update(state, 1, 0, 0, 0);
    expect(mesh.geometry.positions).toBe(positions);
    expect(positions).toEqual(first);
    state.engines.running[0] = false;
    bell.update(state, 1, 0, 0, 0);
    state.engines.running[0] = true;
    bell.update(state, 1, 0, 0, 0);
    expect(positions.at(-1)).toBe(0);
    bell.update(state, 1, 0, 0, 0.105);
    bell.reset();
    bell.update(state, 1, 0, 0, 0);
    expect(positions.at(-1)).toBe(0);
    bell.destroy();
  });
});

describe('owned renderer resources', () => {
  it('releases every owned geometry buffer when the scene tears down', () => {
    const bell = createEmissiveBell();
    const buffers = (bell.container.children as Mesh[]).flatMap(mesh => mesh.geometry.buffers);
    bell.destroy();
    expect(buffers.every(buffer => buffer.destroyed)).toBe(true);
  });

  it('declares its premultiplied RGBA bytes consistently for both renderer backends', () => {
    const bell = createEmissiveBell();
    const source = (bell.container.children[0] as Mesh).texture.source;
    expect(source.format).toBe('rgba8unorm');
    expect(source.alphaMode).toBe('premultiplied-alpha');
    const bytes = source.resource as Uint8Array;
    for (let i = 0; i < bytes.length; i += 4) {
      expect(bytes[i]!).toBeLessThanOrEqual(bytes[i + 3]!);
      expect(bytes[i + 1]!).toBeLessThanOrEqual(bytes[i + 3]!);
      expect(bytes[i + 2]!).toBeLessThanOrEqual(bytes[i + 3]!);
    }
    bell.destroy();
  });
});


it('places fan vertices in the existing transverse fade instead of a saturated interior plateau', () => {
  const { positions, uvs } = buffers();
  writeBellGeometry(positions, uvs, 1, 1, 1, 0.42);
  // Hand-calculated nominal sea-level endpoint: travel28.649m,
  // fan5.692m, radius11.542m; symmetric normalized transverse coordinates.
  expect(uvs.at(-8)).toBeCloseTo(0.2534, 3);
  expect(uvs.at(-4)).toBeCloseTo(0.7466, 3);
});
