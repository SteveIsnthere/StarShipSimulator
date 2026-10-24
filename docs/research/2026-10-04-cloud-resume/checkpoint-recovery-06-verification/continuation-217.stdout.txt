import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { Container, DOMAdapter, Texture } from 'pixi.js';
import { createVehicle } from '$view/vehicle';
import { createBoosterVehicle } from '$view/booster';
import { createSceneVehicles } from '$ui/session/scene-vehicles';
import { createInitialState } from '$core/state';
import { createHotStageMission } from '$core/mission';
import { damageModelFor } from '$core/physics/damage-model';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { finActuationMaxAngle } from '$core/constants';
import { rad } from '$core/units';
import { computeViewport, createCamera } from '$view/camera';
import { createSunLight } from '$view/sun';
import { tileGlow } from '$view/heat-look';
import { createOnboardInset } from '$view/reentry';
import type { ViewApp } from '$view/app';
import type { MissionController } from '$ui/session/mission-controller';

beforeAll(() => vi.spyOn(DOMAdapter.get(), 'createCanvas').mockReturnValue({ getContext: () => null } as unknown as HTMLCanvasElement));
afterAll(() => vi.restoreAllMocks());

it('binds delivered articulation and attachment by physical ID without spreading tiny root heat across a flap', () => {
  const body = createVehicle(), state = createInitialState(123, SHIP);
  const catalogue = damageModelFor(SHIP).partition.components;
  const index = catalogue.findIndex(p => p.id === 'ship-front-flap-right');
  const part = body.components.partsById.get(catalogue[index]!.id)!;
  state.damage!.components[index]!.loadedAngle = rad(0.2);
  state.damage!.components[index]!.root.temperature = 1300;
  state.damage!.components[index]!.tps[0].temperature = 1300;
  state.damage!.hull.temperature = 1100;
  const viewport = computeViewport(800, 600, SHIP.height), camera = createCamera(viewport, 0, 0, 0);
  const pose = { altitude: 200, downRangeDistance: 0, pitch: 0, frontFinExtension: 100, aftFinExtension: 100,
    surfaceTemperature: 300, damage: state.damage };
  body.update(camera, viewport, pose);
  expect(part.container.scale.x).toBeCloseTo(0.04 + 0.96 * Math.sin(0.2) / Math.sin(finActuationMaxAngle));
  expect(part.materials.every(m => m.uniforms.uGlow === 0)).toBe(true);
  const hull = body.components.partsById.get('ship-hull-forward')!;
  expect(hull.materials[0]!.uniforms.uGlow).toBe(tileGlow(1100));
  expect(hull.materials[1]!.uniforms.uGlow).toBe(0);
  state.damage!.components[index]!.attached = false;
  body.update(camera, viewport, pose);
  expect(part.container.visible).toBe(false);
  expect(body.components.partsById.get('ship-front-flap-left')!.container.visible).toBe(true);
  body.destroy();
});

it('retains grid articulation and the exact world pivot when a physical-centroid piece detaches', () => {
  const body = createBoosterVehicle(), state = createInitialState(123, SUPER_HEAVY);
  const catalogue = damageModelFor(SUPER_HEAVY).partition.components;
  const index = catalogue.findIndex(p => p.id === 'booster-grid-1');
  const physical = catalogue[index]!, part = body.components.partsById.get(physical.id)!;
  const viewport = computeViewport(800, 600, 72), camera = createCamera(viewport, 0, 0, 0);
  state.damage!.components[index]!.loadedAngle = rad(0.2);
  const pose = { altitude: 200, downRangeDistance: 30, pitch: 0.3, frontFinExtension: 100, aftFinExtension: 100, damage: state.damage };
  body.update(camera, viewport, pose);
  const before = part.container.toGlobal({ x: 0, y: 0 }), rotation = part.container.rotation;
  const dx = physical.x, dz = physical.station - SUPER_HEAVY.height / 2;
  const debris = state.damage!.debris[index]!;
  debris.active = true; debris.pitch = rad(pose.pitch);
  debris.x = pose.downRangeDistance + Math.cos(pose.pitch) * dx + Math.sin(pose.pitch) * dz;
  debris.altitude = pose.altitude - Math.sin(pose.pitch) * dx + Math.cos(pose.pitch) * dz;
  state.damage!.components[index]!.attached = false;
  body.update(camera, viewport, pose);
  const after = part.container.toGlobal({ x: 0, y: 0 });
  expect(after.x).toBeCloseTo(before.x); expect(after.y).toBeCloseTo(before.y);
  expect(part.container.parent!.rotation).toBeCloseTo(pose.pitch + rotation);
  expect(part.container.visible).toBe(true);
  body.destroy();
});

it('keeps the onboard inset synchronized with actual missing components and delivered articulation', () => {
  const inset = createOnboardInset(), state = createInitialState(123, SHIP);
  const catalogue = damageModelFor(SHIP).partition.components;
  const missing = catalogue.findIndex(p => p.id === 'ship-aft-flap-left');
  const front = catalogue.findIndex(p => p.id === 'ship-front-flap-right');
  state.damage!.components[missing]!.attached = false;
  state.damage!.components[front]!.loadedAngle = rad(0.2);
  const pose = { altitude: 50000, downRangeDistance: 0, pitch: 0, angleOfAttack: 0,
    frontFinExtension: 100, aftFinExtension: 100, damage: state.damage };
  inset.update(computeViewport(800, 600, 52), pose, 1, createSunLight(), 0);
  expect(inset.container.visible).toBe(true);
  const body = inset.container.getChildByLabel('onboard-scene')!.getChildByLabel('starship')!;
  expect(body.getChildByLabel('ship-aft-flap-left')!.visible).toBe(false);
  expect(body.getChildByLabel('ship-front-flap-right')!.scale.x).toBeCloseTo(0.04 + 0.96 * Math.sin(0.2) / Math.sin(finActuationMaxAngle));
  inset.destroy();
});

it('shows only real terminal debris, suppresses missing-support emission, and restores originals on restart', () => {
  const viewport = computeViewport(800, 600, 52);
  const layers = { sky: new Container(), far: new Container(), world: new Container(), effectsBehind: new Container(), vehicle: new Container(), effectsFront: new Container() };
  const view = { viewport, camera: createCamera(viewport, 0, 0, 0), layers } as unknown as ViewApp;
  const atlas = { core: Texture.EMPTY, soft: Texture.EMPTY, smoke: Texture.EMPTY, wisp: Texture.EMPTY };
  const scene = createSceneVehicles(view, atlas);
  const state = createInitialState(123, SHIP), sun = createSunLight();
  const controller = { model: SHIP, mission: undefined, previousMission: undefined } as unknown as MissionController;
  const body = layers.vehicle.getChildByLabel('starship')!;
  const original = body.children.filter(p => p.label.startsWith('ship-'));
  state.engines.running.fill(true); state.forces.thrust = 100;
  const support = damageModelFor(SHIP).partition.components.findIndex(p => p.kind === 'engine-support');
  state.damage!.components[support]!.attached = false;
  state.damage!.debris[support]!.active = true;
  state.damage!.debris[support]!.altitude = 200;
  scene.draw(state, state, 1 / 60, sun, 0, controller);
  expect(body.visible).toBe(true);
  expect(scene.presentation().bell.visibleMounts).toBe(0);
  expect(scene.presentation().particles.filter(p => p.effect === 'raptorPlumeCore' || p.effect === 'raptorPlume').every(p => p.count === 0)).toBe(true);
  state.damage!.terminal.active = true;
  for (let i = 0; i < state.damage!.components.length; i++) {
    state.damage!.components[i]!.attached = false;
    const slot = state.damage!.debris[i]!;
    slot.active = true; slot.x = i * 10; slot.altitude = 200; slot.pitch = rad(0.1);
  }
  scene.draw(state, state, 1 / 60, sun, 0, controller);
  const debris = layers.vehicle.getChildByLabel('ship-debris')!;
  expect(body.visible).toBe(false); expect(debris.visible).toBe(true);
  expect(debris.children.filter(slot => slot.children.length === 1)).toHaveLength(8);
  expect(scene.presentation().bell.visibleMounts).toBe(0);
  expect(scene.presentation().particles.filter(p => p.effect === 'raptorPlumeCore' || p.effect === 'raptorPlume').every(p => p.count === 0)).toBe(true);
  expect(state.engines.running.every(Boolean)).toBe(true);
  const firstPart = scene.presentation().components.find(c => c.vehicle === body.label)!;
  scene.setComponentVisible('unknown-part', false);
  expect(scene.presentation().components.find(c => c.id === firstPart.id)!.visible).toBe(true);
  scene.setComponentVisible(firstPart.id, false);
  expect(scene.presentation().components.find(c => c.id === firstPart.id)!.visible).toBe(false);
  const transferred = debris.children.map(slot => slot.children[0]);
  scene.draw(state, state, 1 / 60, sun, 1, controller);
  expect(debris.children.map(slot => slot.children[0])).toEqual(transferred);
  scene.setVehiclesVisible(false); scene.draw(state, state, 0, sun, 1, controller);
  expect(debris.visible).toBe(false);
  expect(scene.presentation().components.filter(c => c.vehicle === body.label).every(c => !c.visible)).toBe(true);
  scene.reset();
  const fresh = createInitialState(123, SHIP);
  scene.draw(fresh, fresh, 0, sun, 0, controller);
  expect(body.visible).toBe(true);
  expect(original.every(part => part.parent === body && part.visible)).toBe(true);
  expect(debris.children.every(slot => slot.children.length === 0)).toBe(true);
  expect(scene.presentation().components.filter(c => c.vehicle === body.label).every(c => c.visible && !c.detached)).toBe(true);
  scene.destroy();
});

it('reuses every startup node through simultaneous breakup, pause and fifty mission resets', () => {
  const viewport = computeViewport(800, 600, 52);
  const layers = { sky: new Container(), far: new Container(), world: new Container(), effectsBehind: new Container(), vehicle: new Container(), effectsFront: new Container() };
  const view = { viewport, camera: createCamera(viewport, 0, 0, 0), layers } as unknown as ViewApp;
  const atlas = { core: Texture.EMPTY, soft: Texture.EMPTY, smoke: Texture.EMPTY, wisp: Texture.EMPTY };
  const scene = createSceneVehicles(view, atlas), sun = createSunLight();
  const nodes = (): Set<Container> => {
    const result = new Set<Container>();
    const visit = (node: Container) => { result.add(node); for (const child of node.children) visit(child); };
    for (const layer of Object.values(layers)) visit(layer);
    return result;
  };
  const initial = nodes();
  const pools = layers.effectsBehind.children.filter(node => node.children.length === 4000);
  expect(pools).toHaveLength(2);
  expect(pools.reduce((count, pool) => count + pool.children.length, 0)).toBe(8000);
  for (let cycle = 0; cycle < 50; cycle++) {
    const mission = createHotStageMission(123);
    const controller = { model: SHIP, mission, previousMission: mission } as unknown as MissionController;
    scene.draw(mission.ship, mission.ship, 0, sun, 0, controller);
    const attached = scene.presentation().components;
    for (const [state, model] of [[mission.ship, SHIP], [mission.booster, SUPER_HEAVY]] as const) {
      const damage = state.damage!;
      expect(damage.components.length).toBeLessThanOrEqual(12);
      damage.terminal.active = true;
      for (let index = 0; index < damage.components.length; index++) {
        damage.components[index]!.attached = false;
        const piece = damage.debris[index]!;
        piece.active = true; piece.x = index * 10; piece.altitude = model.height + 200;
      }
    }
    // This is a renderer resource witness; natural loss and conservation have
    // separate real-step witnesses. Injecting terminal state cannot prove them.
    scene.draw(mission.ship, mission.ship, 1 / 60, sun, 1, controller);
    const broken = scene.presentation().components;
    expect(broken).toHaveLength(attached.length);
    expect(broken.every(part => part.detached && part.visible)).toBe(true);
    expect(broken.map(part => part.meshIds)).toEqual(attached.map(part => part.meshIds));
    expect(scene.presentation().bodies).toHaveLength(0);
    scene.draw(mission.ship, mission.ship, 0, sun, 1, controller);
    expect(scene.presentation().components).toEqual(broken);
    expect(nodes()).toEqual(initial);
    scene.reset();
    const fresh = createHotStageMission(123);
    const restarted = { model: SHIP, mission: fresh, previousMission: fresh } as unknown as MissionController;
    scene.draw(fresh.ship, fresh.ship, 0, sun, 0, restarted);
    expect(scene.presentation().components.every(part => !part.detached && part.visible)).toBe(true);
    expect(nodes()).toEqual(initial);
    expect(pools.every(pool => pool.children.every(sprite => !sprite.visible))).toBe(true);
  }
  scene.destroy();
});
