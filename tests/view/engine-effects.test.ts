import { describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import { createParticleSystem } from '$view/particles';
import { createEffectDriver } from '$view/effects';
import { createCamera } from '$view/camera';
import { createScenarioState, getScenario } from '$core/scenarios';
import { rad } from '$core/units';

describe('actual per-engine particle origins', () => {
  it.each([{ index: 0, offset: -1, direction: 0.2 }, { index: 3, offset: -3, direction: 0.4 }])(
    'emits engine $index at its mount and respects its steering policy', ({ index, offset, direction }) => {
      const particles = createParticleSystem(Texture.EMPTY);
      // Spy through to the real pool: assertions describe the driver's boundary
      // and the visible sprites, rather than replacing particle behavior.
      const emission = vi.spyOn(particles, 'emit');
      const state = createScenarioState(getScenario('landing-burn')!);
      state.engines.running.fill(false);
      state.engines.failed.fill(false);
      state.engines.running[index] = true;
      state.forces.thrust = 1;
      state.forces.thermalPower = 0;
      state.forces.dynamicPressure = 0;
      state.vehicle.throttleCurrent = 100;
      state.kinematics.pitch = rad(0.4);
      state.vehicle.gimbalPointingDirection = rad(0.2);
      state.kinematics.altitude = 2000;
      state.kinematics.downRangeDistance = 0;
      state.kinematics.trueSpeed = state.kinematics.machSpeed = 0;
      const viewport = { width: 1280, height: 800, physicalWidth: 1280, physicalHeight: 800, scale: 2 };
      const camera = createCamera(viewport, 0, 2000, 0);
      const driver = createEffectDriver();
      driver.update(particles, camera, viewport, state, state, 0.05);
      const core = emission.mock.calls.find(call => call[0] === 'raptorPlumeCore')!;
      expect(core[1]).toBeCloseTo(driver.nozzle.x + Math.cos(0.4) * offset * 2);
      expect(core[2]).toBeCloseTo(driver.nozzle.y + Math.sin(0.4) * offset * 2);
      expect(core[3]).toBeCloseTo(direction + Math.PI / 2);
      expect(core[10]).toBe(index + 1);
      expect(particles.alive).toBeGreaterThan(0);
      state.engines.failed[index] = true;
      emission.mockClear();
      driver.update(particles, camera, viewport, state, state, 0.05);
      expect(emission.mock.calls.filter(call => call[0] === 'raptorPlumeCore' || call[0] === 'raptorPlume')).toHaveLength(0);
      particles.destroy();
    },
  );
});
