import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';
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
  it('draws its 71m hull and four real upper fins at the physical pose', () => {
    const body = createBoosterVehicle();
    const viewport = computeViewport(800, 600, 50);
    const camera = createCamera(viewport, 0, 0, 0);
    const pose = { altitude: 100, downRangeDistance: 20, pitch: 0.2,
      frontFinExtension: 50, aftFinExtension: 50 };
    body.update(camera, viewport, pose);
    const hull = body.container.getChildByLabel('booster-hull')!;
    expect(hull.height).toBe(71);
    expect(hull.width).toBe(9);
    expect(body.container.x).toBeCloseTo(400 + 20 * viewport.scale);
    expect(body.container.rotation).toBe(0.2);
    const fins = body.container.children.filter(child => child.label.startsWith('grid-fin-'));
    expect(fins).toHaveLength(4);
    expect(fins.every(fin => fin.y === -30.5)).toBe(true);
    const neutral = fins.map(fin => fin.rotation);
    pose.frontFinExtension = 100;
    body.update(camera, viewport, pose);
    expect(fins.every((fin, i) => fin.rotation !== neutral[i])).toBe(true);
    expect(fins[0]!.rotation - neutral[0]!).toBeCloseTo(Math.PI / 4);
    body.container.destroy({ children: true });
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
    expect(driver.nozzle.y).toBeCloseTo(300 + 35.5 * viewport.scale);
    expect(particles.inspect().filter(row => row.effect === 'raptorPlumeCore' || row.effect === 'raptorPlume').every(row => row.count === 0)).toBe(true);
    state.engines.failed[0] = false;
    driver.update(particles, camera, viewport, state, state, 1 / 60);
    expect(particles.inspect().find(row => row.effect === 'raptorPlumeCore')!.count).toBeGreaterThan(0);
    particles.container.destroy({ children: true });
  });
});
