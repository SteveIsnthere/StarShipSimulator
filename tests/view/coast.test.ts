import { expect, it } from 'vitest';
import { Graphics, Texture } from 'pixi.js';
import { createCoast } from '$view/coast';
import { createWorld } from '$view/world';
import { createDistantEarth } from '$view/distant-earth';
import { computeViewport, createCamera } from '$view/camera';
import { createSunLight, writeSun, DEFAULT_LAUNCH_HOUR } from '$view/sun';
import { starBaseXPos } from '$core/constants';
import { GROUND_OBJECTS } from '$view/assets';

function sunAt(hour: number) {
  const sun = createSunLight();
  writeSun(sun, 'custom', (hour - DEFAULT_LAUNCH_HOUR) * 3600, starBaseXPos);
  return sun;
}

it('keeps authored coast and pad attached to the world under pan and zoom, culling distant assets', () => {
  const coast = createCoast(), viewport = computeViewport(800, 600, 50);
  const camera = createCamera(viewport, starBaseXPos, 0, 0); camera.posY = 50;
  coast.update(camera, viewport, sunAt(12));
  const x = coast.container.x;
  const pad = coast.container.getChildByLabel('coast-pad')!;
  const initial = pad.getBounds().minX;
  camera.posX += 100;
  coast.update(camera, viewport, sunAt(12));
  expect(coast.container.x - x).toBeCloseTo(-100 * viewport.scale);
  expect(pad.getBounds().minX - initial).toBeCloseTo(-100 * viewport.scale);
  const geometry = (pad as Graphics).context;
  const zoom = computeViewport(800, 600, 50, 2);
  coast.update(camera, zoom, sunAt(12));
  expect(coast.container.scale.x).toBe(zoom.scale);
  expect((pad as Graphics).context).toBe(geometry);
  camera.posX = 1e6; coast.update(camera, viewport, sunAt(12));
  expect(pad.visible).toBe(false);
  coast.container.destroy({ children: true });
});

it('dims coastal surfaces and raises only the authored pad lamps at night', () => {
  const coast = createCoast(), viewport = computeViewport(800, 600, 50);
  const camera = createCamera(viewport, starBaseXPos, 0, 0); camera.posY = 50;
  const ocean = coast.container.getChildByLabel('coast-ocean') as Graphics;
  const lights = coast.container.getChildByLabel('coast-lights')!;
  coast.update(camera, viewport, sunAt(12));
  const day = ocean.tint; expect(lights.alpha).toBe(0);
  coast.update(camera, viewport, sunAt(0));
  expect(ocean.tint).toBeLessThan(day); expect(lights.alpha).toBeGreaterThan(0.5);
  coast.container.destroy({ children: true });
});

it('clips near and distant coast to the original shared curved ground, without moving scenery', () => {
  const world = createWorld(new Map(GROUND_OBJECTS.map(item => [item.src, Texture.EMPTY])));
  const viewport = computeViewport(800, 600, 50), camera = createCamera(viewport, 0, 0, 0);
  camera.posY = 50;
  world.update(camera, viewport, 0, 40000, { sun: sunAt(12), downRangeDistance: 0, altitude: 40000, pitch: 0 });
  const coast = world.container.getChildByLabel('coast')!;
  expect((coast.mask as Graphics).context).toBe((world.container.children[0] as Graphics).context);
  expect((coast.mask as Graphics).y).toBe(world.container.children[0]!.y);
  for (const id of ['pig', 'starBaseBackGround']) {
    const item = GROUND_OBJECTS.find(item => item.id === id);
    if (item) expect(world.container.getChildByLabel(id)!.x).toBeCloseTo(viewport.width / 2 + item.x * viewport.scale);
  }
  const far = createDistantEarth(); far.update(viewport, 100000, 0, 0, sunAt(12));
  const ocean = far.container.getChildByLabel('distant-coast')!;
  expect(ocean.visible).toBe(true);
  expect((ocean.mask as Graphics).context).toBe((far.container.getChildByLabel('distant-ground') as Graphics).context);
  world.container.destroy({ children: true }); far.container.destroy({ children: true });
});

it('keeps true-ground night shading below half daylight while preserving the visible fill and separate clip', () => {
  const world = createWorld(new Map());
  const viewport = computeViewport(800, 600, 50), camera = createCamera(viewport, starBaseXPos, 0, 0);
  const light = { sun: sunAt(12), downRangeDistance: starBaseXPos, altitude: 50, pitch: 0 };
  world.update(camera, viewport, 0, 50, light);
  const fill = world.container.children[0] as Graphics, day = fill.tint;
  light.sun = sunAt(0); world.update(camera, viewport, 0, 50, light);
  const channel = (colour: number) => (colour >> 16) & 255;
  expect(channel(fill.tint)).toBeLessThan(channel(day) * 0.5);
  expect(fill.includeInBuild).toBe(true);
  world.container.destroy({ children: true });
});

it('darkens the distant ridgeline at midnight instead of leaving a daylight seam above the clipped band', () => {
  const earth = createDistantEarth(), viewport = computeViewport(800, 600, 50);
  const ridges = earth.container.children.slice(0, 3) as Graphics[];
  earth.update(viewport, 20000, 0, 0, sunAt(12));
  const values = ridges.map(ridge => ridge.tint);
  earth.update(viewport, 20000, 0, 0, sunAt(0));
  for (let i = 0; i < 3; i++) {
    const luma = (colour: number) => ((colour >> 16) & 255) + ((colour >> 8) & 255) + (colour & 255);
    expect(luma(ridges[i]!.tint)).toBeLessThan(luma(values[i]!) * 0.5);
  }
  earth.container.destroy({ children: true });
});
