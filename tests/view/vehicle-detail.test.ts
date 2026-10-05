import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { DOMAdapter } from 'pixi.js';
import { createBoosterVehicle } from '$view/booster';
import { createVehicle } from '$view/vehicle';
import { computeViewport, createCamera } from '$view/camera';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createSunLight, writeSun } from '$view/sun';
import { starBaseXPos } from '$core/constants';

// Node inspects the retained graph/uniforms; this precision probe is not a GPU test.
beforeAll(() => vi.spyOn(DOMAdapter.get(), 'createCanvas').mockReturnValue({
  getContext: () => null,
} as unknown as HTMLCanvasElement));
afterAll(() => vi.restoreAllMocks());

it.each([SHIP, SUPER_HEAVY])('renders startup-owned bells at every physical mount for $id', model => {
  const body = model.id === 'super-heavy' ? createBoosterVehicle() : createVehicle();
  const support = body.components.partsById.get(model.id === 'super-heavy' ? 'booster-engine-support' : 'ship-engine-support')!;
  const shells = support.component.polygons.filter(p => p.surfaceRole === 'bell-shell');
  expect(shells).toHaveLength(model.engines.length);
  for (const polygon of shells) {
    const mount = model.engines[polygon.engineIndex!]!;
    const mesh = support.meshes.find(m => m.label === polygon.id)!;
    const positions = mesh.geometry.positions;
    const xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < positions.length; i += 2) {
      xs.push(positions[i]! + support.container.x);
      ys.push(positions[i + 1]! + support.container.y);
    }
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(mount.offAxis);
    expect(Math.max(...ys)).toBeCloseTo(model.height / 2);
    expect(polygon.engineKind).toBe(mount.kind);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(mount.kind === 'vacuum' ? 2.3 : 1.3);
  }
  const meshes = support.meshes.slice(), buffers = meshes.map(m => m.geometry.positions);
  support.container.scale.set(2);
  expect(support.meshes).toEqual(meshes);
  for (let i = 0; i < meshes.length; i++) expect(meshes[i]!.geometry.positions).toBe(buffers[i]);
  expect(support.container.getBounds().width).toBeLessThanOrEqual(model.diameter * 2);
  body.destroy();
});

it('lights actual component materials through the shared sun and articulates all three booster grids', () => {
  const body = createBoosterVehicle(), viewport = computeViewport(800, 600, SHIP.height);
  const camera = createCamera(viewport, starBaseXPos, 0, 0), sun = createSunLight();
  const pose = { altitude: 100, downRangeDistance: starBaseXPos, pitch: 0,
    frontFinExtension: 50, aftFinExtension: 50 };
  const parts = [...body.components.partsById.values()];
  const grids = parts.filter(p => p.component.kind === 'grid-fin');
  writeSun(sun, 'custom', 0, starBaseXPos, 12); body.update(camera, viewport, pose, sun);
  const daylight = parts.map(p => p.materials[0]!.uniforms.uDaylight);
  const neutral = grids.map(p => Array.from(p.meshes[0]!.geometry.positions));
  writeSun(sun, 'custom', 0, starBaseXPos, 0); pose.frontFinExtension = 100;
  body.update(camera, viewport, pose, sun);
  expect(parts.every((p, i) => p.materials[0]!.uniforms.uDaylight < daylight[i]!)).toBe(true);
  expect(grids).toHaveLength(SUPER_HEAVY.gridFins!.count);
  for (let i = 0; i < grids.length; i++) {
    expect(Array.from(grids[i]!.meshes[0]!.geometry.positions)).not.toEqual(neutral[i]);
    expect(grids[i]!.container.rotation).toBe(0);
    // The visible side flips the normal for back faces; incidence magnitude
    // remains the same physical angle on all three clock positions.
    expect(Math.abs(grids[i]!.materials[0]!.uniforms.uFlatNormal[1]!)).toBeCloseTo(Math.cos(SUPER_HEAVY.gridFins!.maxAngle));
  }
  body.destroy();
});

it('keeps Ship fin pairs independently articulated at finite zoom while materials dim at night', () => {
  const body = createVehicle();
  const viewport = computeViewport(800, 600, SHIP.height), camera = createCamera(viewport, starBaseXPos, 0, 0);
  const sun = createSunLight(), pose = { altitude: 100, downRangeDistance: starBaseXPos, pitch: 0,
    frontFinExtension: 0, aftFinExtension: 0 };
  const front = body.components.partsById.get('ship-front-flap-left')!;
  const aft = body.components.partsById.get('ship-aft-flap-left')!;
  writeSun(sun, 'custom', 0, starBaseXPos, 12); body.update(camera, viewport, pose, sun);
  const frontWidth = front.container.width, aftWidth = aft.container.width;
  const day = front.materials[0]!.uniforms.uDaylight;
  pose.frontFinExtension = 100; body.update(camera, viewport, pose, sun);
  expect(front.container.width).toBeGreaterThan(frontWidth); expect(aft.container.width).toBe(aftWidth);
  expect(front.container.getBounds().minX, 'a deployed fin reaches beyond the hull flank').toBeLessThan(body.container.x - SHIP.diameter / 2 * viewport.scale);
  const extendedFront = front.container.width;
  pose.aftFinExtension = 100; body.update(camera, viewport, pose, sun);
  expect(aft.container.width).toBeGreaterThan(aftWidth); expect(front.container.width).toBe(extendedFront);
  writeSun(sun, 'custom', 0, starBaseXPos, 0); body.update(camera, viewport, pose, sun);
  expect(front.materials[0]!.uniforms.uDaylight).toBeLessThan(day);
  expect(Number.isFinite(front.container.scale.x + front.container.scale.y)).toBe(true);
  body.destroy();
});

it('anchors both Ship fin pairs at their physical hinge stations above the engine plane', () => {
  const body = createVehicle();
  const viewport = computeViewport(800, 600, SHIP.height), camera = createCamera(viewport, starBaseXPos, 0, 0);
  body.update(camera, viewport, { altitude: 100, downRangeDistance: starBaseXPos, pitch: 0, frontFinExtension: 100, aftFinExtension: 100 });
  for (const [id, station] of [['ship-front-flap-left', SHIP.frontFinStation], ['ship-aft-flap-left', SHIP.aftFinStation]] as const) {
    const part = body.components.partsById.get(id)!;
    expect(part.container.y).toBeCloseTo(SHIP.height / 2 - station);
    const worldHinge = part.container.toGlobal({ x: 0, y: 0 });
    expect(worldHinge.y).toBeCloseTo(body.container.y + (SHIP.height / 2 - station) * viewport.scale);
  }
  body.destroy();
});

it('keeps complete main and inset catalogues independent across pose and visibility updates', () => {
  const main = createVehicle(), inset = createVehicle();
  const viewport = computeViewport(800, 600, SHIP.height), small = computeViewport(200, 150, SHIP.height);
  const camera = createCamera(viewport, starBaseXPos, 0, 0);
  const pose = { altitude: 100, downRangeDistance: starBaseXPos, pitch: 0.2, frontFinExtension: 100, aftFinExtension: 100 };
  expect(main.components.partsById.size).toBe(8);
  expect(inset.components.partsById.size).toBe(8);
  expect([...main.components.partsById.values()].every(p => p.container.visible)).toBe(true);
  main.components.setComponentState('ship-front-flap-left', false, 300);
  main.update(camera, viewport, pose); inset.update(camera, small, pose);
  expect(main.components.partsById.get('ship-front-flap-left')!.container.visible).toBe(false);
  expect([...inset.components.partsById.values()].every(p => p.container.visible)).toBe(true);
  expect(main.container.scale.x).toBe(viewport.scale); expect(inset.container.scale.x).toBe(small.scale);
  main.destroy(); inset.destroy();
});
