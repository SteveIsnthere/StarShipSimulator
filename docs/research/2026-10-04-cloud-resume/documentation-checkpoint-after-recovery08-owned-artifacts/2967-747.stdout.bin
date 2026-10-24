import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DOMAdapter, Texture } from 'pixi.js';
import { createBoosterVehicle } from '$view/booster';
import { createEmissiveBell } from '$view/emissive-bell';
import { createEffectDriver } from '$view/effects';
import { createParticleSystem } from '$view/particles';
import { computeViewport, createCamera } from '$view/camera';
import { createScenarioVehicle, getScenario } from '$core/scenarios';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { rad } from '$core/units';
import { getGimbalPointingDirection } from '$core/physics/engines';

describe('the actual booster body and engine plane', () => {
  beforeAll(() => vi.spyOn(DOMAdapter.get(), 'createCanvas').mockReturnValue({
    getContext: () => null,
  } as unknown as HTMLCanvasElement));
  afterAll(() => vi.restoreAllMocks());
  it('aligns neutral inner and fixed outer plumes with the real45degree hull, and follows the world gimbal heading', () => {
    const bell = createEmissiveBell(SUPER_HEAVY);
    const state = createScenarioVehicle(getScenario('booster-sep')!).state;
    expect(state.kinematics.pitch).toBeCloseTo(Math.PI / 4);
    state.engines.running[0] = state.engines.running[13] = true;
    state.forces.thrust = 1;
    state.vehicle.gimbalPointingDirection = getGimbalPointingDirection(state.kinematics.pitch, 0);
    bell.update(state, 1, 0, 0, 1 / 120);
    expect(bell.container.children[0]!.rotation).toBeCloseTo(Math.PI / 4);
    expect(bell.container.children[13]!.rotation).toBeCloseTo(Math.PI / 4);
    state.vehicle.gimbalPointingDirection = getGimbalPointingDirection(state.kinematics.pitch, 20);
    bell.update(state, 1, 0, 0, 1 / 120);
    expect(bell.container.children[0]!.rotation).toBeCloseTo(Math.PI / 4 - 3 * Math.PI / 180);
    expect(bell.container.children[13]!.rotation).toBeCloseTo(Math.PI / 4);
    bell.destroy();
  });
  it('draws its V3 hull and three real upper fins at the physical pose', () => {
    const body = createBoosterVehicle();
    const viewport = computeViewport(800, 600, 50);
    const camera = createCamera(viewport, 0, 0, 0);
    const pose = { altitude: 100, downRangeDistance: 20, pitch: 0.2,
      frontFinExtension: 50, aftFinExtension: 50 };
    body.update(camera, viewport, pose);
    const parts = [...body.components.partsById.values()];
    const points = parts.flatMap(p => p.component.polygons.flatMap(polygon => polygon.points));
    expect(Math.max(...points.map(p => p.station)) - Math.min(...points.map(p => p.station))).toBe(SUPER_HEAVY.height);
    const wall = body.components.partsById.get('booster-hull-aft')!.component.polygons[0]!;
    expect(Math.max(...wall.points.map(p => p.x)) - Math.min(...wall.points.map(p => p.x))).toBe(SUPER_HEAVY.diameter);
    expect(body.container.x).toBeCloseTo(400 + 20 * viewport.scale);
    expect(body.container.rotation).toBe(0.2);
    const fins = parts.filter(p => p.component.kind === 'grid-fin');
    expect(fins).toHaveLength(SUPER_HEAVY.gridFins!.count);
    for (const fin of fins) expect(fin.container.y).toBeCloseTo(SUPER_HEAVY.height / 2 - SUPER_HEAVY.gridFins!.station);
    const neutral = fins.map(fin => Array.from(fin.meshes[0]!.geometry.positions));
    pose.frontFinExtension = 100;
    body.update(camera, viewport, pose);
    for (let i = 0; i < fins.length; i++) {
      const fin = fins[i]!, positions = Array.from(fin.meshes[0]!.geometry.positions);
      expect(positions).not.toEqual(neutral[i]);
      expect(fin.container.rotation).toBe(0);
      const ys = positions.filter((_, j) => j % 2);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(SUPER_HEAVY.diameter * .36 * Math.sin(SUPER_HEAVY.gridFins!.maxAngle));
    }
    body.destroy();
  });

  it('shows the actual healthy firing mounts, including fixed outer engines', () => {
    const bell = createEmissiveBell(SUPER_HEAVY);
    const state = createScenarioVehicle(getScenario('booster-sep')!).state;
    expect(bell.container.children).toHaveLength(33);
    state.engines.running.fill(true);
    state.engines.failed[13] = true;
    state.forces.thrust = 100;
    state.vehicle.gimbalPointingDirection = rad(0.1);
    bell.update(state, 2, 100, 200, 0.1);
    expect(bell.container.children.filter(child => child.visible)).toHaveLength(32);
    expect(bell.container.children[0]!.rotation).toBeCloseTo(0.1);
    expect(bell.container.children[14]!.rotation).toBe(state.kinematics.pitch);
    expect(bell.container.children[32]!.x).toBeCloseTo(100 + Math.cos(state.kinematics.pitch) * SUPER_HEAVY.engines[32]!.offAxis * 2);
    state.forces.thrust = 0;
    bell.update(state, 2, 100, 200, 0);
    expect(bell.container.children.every(child => !child.visible)).toBe(true);
    bell.destroy();
  });

  it('attaches exhaust to the booster engine plane, with no thrust for failed engines', () => {
    const particles = createParticleSystem(Texture.EMPTY, 1000, 12);
    const driver = createEffectDriver(SUPER_HEAVY);
    const state = createScenarioVehicle(getScenario('booster-sep')!).state;
    state.kinematics.pitch = rad(0);
    state.kinematics.downRangeDistance = 0;
    state.kinematics.altitude = 100;
    state.kinematics.trueSpeed = 0;
    state.forces.dynamicPressure = 0;
    state.forces.thermalPower = 0;
    state.forces.thrust = 100;
    state.engines.running.fill(true);
    state.engines.failed.fill(true);
    const viewport = computeViewport(800, 600, 50);
    const camera = createCamera(viewport, 0, 0, 0);
    camera.posY = 100;
    driver.update(particles, camera, viewport, state, state, 1 / 60);
    expect(driver.nozzle.x).toBeCloseTo(400);
    expect(driver.nozzle.y).toBeCloseTo(300 + SUPER_HEAVY.height / 2 * viewport.scale);
    expect(particles.inspect().filter(row => row.effect === 'raptorPlumeCore' || row.effect === 'raptorPlume').every(row => row.count === 0)).toBe(true);
    state.engines.failed[0] = false;
    driver.update(particles, camera, viewport, state, state, 1 / 60);
    expect(particles.inspect().find(row => row.effect === 'raptorPlumeCore')!.count).toBeGreaterThan(0);
    particles.container.destroy({ children: true });
  });
});
