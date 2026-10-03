import { describe, expect, it } from 'vitest';
import { Texture, Sprite } from 'pixi.js';
import { createScenarioState, getScenario } from '$core/scenarios';
import { rad } from '$core/units';
import { createEngineGlare } from '$view/engine-glare';

describe('state-driven engine and ground glare', () => {
  it('lights actual mounts, with no contribution from off, failed or secured engines', () => {
    const glare = createEngineGlare(Texture.EMPTY);
    const state = createScenarioState(getScenario('landing-burn')!);
    state.engines.running.fill(false);
    state.engines.failed.fill(false);
    state.engines.running[0] = true;
    state.forces.thrust = 1;
    state.vehicle.throttleCurrent = 100;
    state.kinematics.pitch = rad(0.4);
    glare.update(state, 2, 100, 200, 500, 20);
    const light = glare.container.children[0] as Sprite;
    expect(light.visible).toBe(true);
    expect(light.x).toBeCloseTo(100 - 2 * Math.cos(0.4));
    expect(light.y).toBeCloseTo(200 - 2 * Math.sin(0.4));
    state.engines.failed[0] = true;
    glare.update(state, 2, 100, 200, 500, 20);
    expect(light.visible).toBe(false);
    state.engines.failed[0] = false;
    state.forces.thrust = 0;
    glare.update(state, 2, 100, 200, 500, 20);
    expect(glare.container.children.every(child => !child.visible)).toBe(true);
    glare.destroy();
    expect(Texture.EMPTY.destroyed).toBe(false);
  });

  it('places the ground wash on physical ground and removes it away from the ground or sideways', () => {
    const glare = createEngineGlare(Texture.EMPTY);
    const state = createScenarioState(getScenario('landing-burn')!);
    state.engines.running.fill(true);
    state.engines.failed.fill(false);
    state.forces.thrust = 1;
    state.vehicle.throttleCurrent = 100;
    state.kinematics.pitch = rad(0);
    glare.update(state, 2, 100, 200, 500, 20);
    const ground = glare.container.children.at(-1) as Sprite;
    expect(ground.visible).toBe(true);
    expect(ground.y).toBe(500);
    const near = ground.alpha;
    glare.update(state, 2, 100, 200, 500, 100);
    expect(ground.alpha).toBeLessThan(near);
    glare.update(state, 2, 100, 200, 500, 5000);
    expect(ground.visible).toBe(false);
    state.kinematics.pitch = rad(Math.PI / 2);
    glare.update(state, 2, 100, 200, 500, 20);
    expect(ground.visible).toBe(false);
    glare.reset();
    expect(glare.container.children.every(child => !child.visible)).toBe(true);
    glare.destroy();
  });

  it('keeps independent body light and a stable paused image without a wall clock', () => {
    const ship = createEngineGlare(Texture.EMPTY);
    const booster = createEngineGlare(Texture.EMPTY);
    const firing = createScenarioState(getScenario('landing-burn')!);
    firing.engines.running.fill(true);
    firing.forces.thrust = 1;
    firing.vehicle.throttleCurrent = 100;
    const dark = createScenarioState(getScenario('landing-burn')!);
    dark.engines.running.fill(false);
    dark.forces.thrust = 0;
    ship.update(firing, 2, 100, 200, 500, 20);
    booster.update(dark, 2, 300, 400, 500, 20);
    expect(ship.container.children.some(child => child.visible)).toBe(true);
    expect(booster.container.children.every(child => !child.visible)).toBe(true);
    const light = ship.container.children[0] as Sprite;
    const paused = [light.x, light.y, light.alpha, light.width, light.height];
    ship.update(firing, 2, 100, 200, 500, 20);
    expect([light.x, light.y, light.alpha, light.width, light.height]).toEqual(paused);
    ship.destroy(); booster.destroy();
  });
});
