import { expect, it } from 'vitest';
import { Texture } from 'pixi.js';
import { createVehicleDetail } from '$view/vehicle-detail';
import { createBoosterVehicle } from '$view/booster';
import { createVehicle } from '$view/vehicle';
import { STARSHIP_TEXTURE } from '$view/assets';
import { computeViewport, createCamera } from '$view/camera';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createSunLight, writeSun } from '$view/sun';
import { starBaseXPos } from '$core/constants';

it.each([SHIP, SUPER_HEAVY])('builds startup-owned model-scale detail and every actual projected engine mount for $id', model => {
  const detail = createVehicleDetail(model.height, model.diameter, model.id === 'super-heavy');
  expect(detail.label).toBe(model.id === 'super-heavy' ? 'booster-detail' : 'ship-detail');
  expect(detail.children.length).toBeGreaterThan(0);
  const bells = detail.children.filter(child => child.label.startsWith('detail-bell-'));
  expect(bells).toHaveLength(model.engines.length);
  for (let i = 0; i < bells.length; i++) {
    expect(bells[i]!.x).toBeCloseTo(model.engines[i]!.offAxis);
    expect(bells[i]!.y).toBe(model.height / 2);
  }
  const geometry = detail.children.slice();
  detail.scale.set(2);
  expect(detail.children).toEqual(geometry);
  expect(detail.getBounds().width).toBeLessThanOrEqual(model.diameter * 2);
  detail.destroy({ children: true });
});

it('lights detail through the shared sun and all four actual booster grids still articulate', () => {
  const body = createBoosterVehicle(), viewport = computeViewport(800, 600, SHIP.height);
  const camera = createCamera(viewport, starBaseXPos, 0, 0), sun = createSunLight();
  const pose = { altitude: 100, downRangeDistance: starBaseXPos, pitch: 0,
    frontFinExtension: 50, aftFinExtension: 50 };
  writeSun(sun, 'custom', 0, starBaseXPos, 12); body.update(camera, viewport, pose, sun);
  const day = body.container.tint;
  const fins = body.container.children.filter(child => child.label.startsWith('grid-fin-'));
  const neutral = fins.map(fin => fin.rotation);
  expect(body.container.getChildByLabel('booster-detail')).not.toBeNull();
  writeSun(sun, 'custom', 0, starBaseXPos, 0); pose.frontFinExtension = 100;
  body.update(camera, viewport, pose, sun);
  expect(body.container.tint).toBeLessThan(day);
  expect(fins).toHaveLength(4); expect(fins.every((fin, i) => fin.rotation !== neutral[i])).toBe(true);
  body.container.destroy({ children: true });
});

it('keeps the two Ship fin pairs independently articulated at finite zoom while detail dims at night', () => {
  const body = createVehicle(new Map([[STARSHIP_TEXTURE, Texture.EMPTY]]));
  const viewport = computeViewport(800, 600, SHIP.height), camera = createCamera(viewport, starBaseXPos, 0, 0);
  const sun = createSunLight(), pose = { altitude: 100, downRangeDistance: starBaseXPos, pitch: 0,
    frontFinExtension: 0, aftFinExtension: 0 };
  writeSun(sun, 'custom', 0, starBaseXPos, 12); body.update(camera, viewport, pose, sun);
  const detail = body.container.getChildByLabel('ship-detail')!;
  const fins = body.container.getChildByLabel('ship-fins')!;
  const front = fins.getChildByLabel('fin-front-left')!, aft = fins.getChildByLabel('fin-aft-left')!;
  const frontWidth = front.width, aftWidth = aft.width, day = detail.tint;
  pose.frontFinExtension = 100; body.update(camera, viewport, pose, sun);
  expect(front.width).toBeGreaterThan(frontWidth); expect(aft.width).toBe(aftWidth);
  expect(front.getBounds().minX, 'a deployed fin begins at the actual hull flank, not inside its centre').toBeLessThan(body.container.x - SHIP.diameter / 2 * viewport.scale);
  const extendedFront = front.width;
  pose.aftFinExtension = 100; body.update(camera, viewport, pose, sun);
  expect(aft.width).toBeGreaterThan(aftWidth); expect(front.width).toBe(extendedFront);
  writeSun(sun, 'custom', 0, starBaseXPos, 0); body.update(camera, viewport, pose, sun);
  expect(detail.tint).toBeLessThan(day);
  expect(Number.isFinite(detail.scale.x + detail.scale.y)).toBe(true);
  body.container.destroy({ children: true });
});

it('places Ship fin pairs at their existing physical stations above the engine plane', () => {
  const body = createVehicle(new Map([[STARSHIP_TEXTURE, Texture.EMPTY]]));
  const viewport = computeViewport(800, 600, SHIP.height), camera = createCamera(viewport, starBaseXPos, 0, 0);
  body.update(camera, viewport, { altitude: 100, downRangeDistance: starBaseXPos, pitch: 0, frontFinExtension: 100, aftFinExtension: 100 });
  const fins = body.container.getChildByLabel('ship-fins')!;
  for (const [id, station] of [['fin-front-left', SHIP.frontFinStation], ['fin-aft-left', SHIP.aftFinStation]] as const) {
    const box = fins.getChildByLabel(id)!.getBounds();
    expect((box.minY + box.maxY) / 2).toBeCloseTo(body.container.y + (SHIP.height / 2 - station) * viewport.scale);
  }
  body.container.destroy({ children: true });
});
