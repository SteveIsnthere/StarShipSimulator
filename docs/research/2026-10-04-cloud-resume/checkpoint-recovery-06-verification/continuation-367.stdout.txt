/** Natural off-nominal editor witness, not a plausible booster orbital mission.
 * Inputs and phase caps were declared before the successful third diagnostic:
 * docs/research/2026-10-03-vehicle-realism/hold-live-outcome.md.
 * No temperature/damage injection occurs on the flown trajectory.
 */
import { expect, it } from 'vitest';
import { PRESETS, createScenarioVehicle } from '$core/scenarios';
import { cloneState, DEFAULT_SEED } from '$core/state';
import { step } from '$core/step';
import { deg } from '$core/units';
import * as C from '$core/constants';
import { circularOrbitalSpeed, groundTangentialSpeed } from '$core/physics/gravity';
import { relativeAirspeed } from '$core/physics/aero';
import { airVelocityX } from '$core/physics/wind';
import { engineMassFlow } from '$core/physics/propulsion';
import { shutdownEngine, IGNITION_DELAY_MAX_S } from '$core/physics/engines';
import { damageModelFor } from '$core/physics/damage-model';
import { ComponentFailure } from '$core/damage-state';
import { toggleRaptor, togglePitchHold, recordHoldingPitchResumeAuto, setManualControl, toggleFin } from '$core/control/commands';

it('flies from cold hardware through applied thermal weakening to permanent in-domain loss below the original guards', () => {
  const dt = 1 / 120, altitude = 80000, radius = C.planetRadius + altitude;
  const base = PRESETS.find(p => p.id === 'booster-sep')!;
  const { state: initial, vehicle } = createScenarioVehicle({ ...base, id: 'custom', basedOn: base.id,
    altitude, xPosition: 0, speedX: groundTangentialSpeed(radius, circularOrbitalSpeed(radius)),
    speedY: 0, pitch: deg(-90), propellant: 3650, wind: 0 }, DEFAULT_SEED);
  initial.status.finActive = initial.status.translationModeOn = true;
  initial.autopilot.manualControlOn = true;
  const partition = damageModelFor(vehicle).partition;
  const indices = partition.components.flatMap((c, i) => c.kind === 'grid-fin' ? [i] : []);
  const coldRoots = indices.map(i => ({ ...initial.damage!.components[i]!.root }));
  expect(coldRoots.every(root => root.temperature < 373.15)).toBe(true);
  const coastCap = 718.8414509444451;
  const burnCap = vehicle.propellantCapacity / (vehicle.engines.length * engineMassFlow(vehicle.propulsion, 'sea-level')) + IGNITION_DELAY_MAX_S;
  const entryCap = 2 * Math.PI * radius / circularOrbitalSpeed(radius);
  let state = initial, phase: 'coast' | 'burn' | 'entry' = 'coast', phaseStart = 0;
  let appliedWarmDifference = 0, compared = false, minimumReserve = Infinity;
  for (let tick = 0; tick < Math.ceil((coastCap + burnCap + entryCap) / dt); tick++) {
    const previous = state;
    const input = phase === 'burn' ? { throttle: 100 } : { pitchControl: phase === 'entry' ? 100 : 0, throttle: 100 };
    state = step(state, dt, input, vehicle);
    minimumReserve = Math.min(minimumReserve, state.vehicle.rcsRunTimeRemaining);
    // One cold counterfactual at identical mechanics/commands proves that warm
    // roots affect the actual paid integrator, not merely a displayed angle.
    // This clone never becomes the flown trajectory or changes its commands.
    if (!compared && phase === 'entry' && previous.forces.dynamicPressure > 1
      && previous.damage!.revision === 0 && state.damage!.revision === 0) {
      const cold = cloneState(previous);
      indices.forEach((index, i) => { cold.damage!.components[index]!.root = { ...coldRoots[i]! }; });
      const coldNext = step(cold, dt, input, vehicle);
      expect(coldNext.damage!.revision).toBe(0);
      for (const index of indices) {
        expect(state.damage!.components[index]!.loadedAngle).toBeLessThan(coldNext.damage!.components[index]!.loadedAngle);
      }
      appliedWarmDifference = Math.hypot(state.kinematics.speedX - coldNext.kinematics.speedX,
        state.kinematics.speedY - coldNext.kinematics.speedY);
      compared = true;
    }
    const time = (tick + 1) * dt;
    if (state.damage!.revision > 0 || state.damage!.terminal.active || state.status.onTheGround) break;
    if (phase === 'coast' && Math.min(...indices.map(i => state.damage!.components[i]!.root.temperature)) >= 1073.15) {
      togglePitchHold(state); recordHoldingPitchResumeAuto(state);
      for (let i = 0; i < vehicle.engines.length; i++) toggleRaptor(state, i);
      phase = 'burn'; phaseStart = time;
    } else if (phase === 'burn' && relativeAirspeed(state.kinematics.speedX, state.kinematics.speedY,
      airVelocityX(state.world, state.kinematics.altitude), state.world.gustVertical) <= 4000) {
      togglePitchHold(state); setManualControl(state, true);
      if (!state.status.finActive) toggleFin(state);
      for (let i = 0; i < vehicle.engines.length; i++) shutdownEngine(state, i);
      phase = 'entry'; phaseStart = time;
    } else if ((phase === 'coast' && time > coastCap) || (phase === 'burn' && time - phaseStart > burnCap)
      || (phase === 'entry' && time - phaseStart > entryCap)) break;
  }
  expect(phase).toBe('entry');
  expect(compared).toBe(true);
  // Far above double-precision cancellation at the ~4000m/s entry velocity.
  expect(appliedWarmDifference).toBeGreaterThan(1e-10);
  expect(minimumReserve).toBeGreaterThanOrEqual(0);
  expect(state.damage!.terminal.active).toBe(false);
  expect(state.forces.dynamicPressure).toBeLessThan(C.dynamicPressureLimit);
  expect(state.forces.surfaceTemperature).toBeLessThan(C.TILE_LIMIT_KELVIN);
  expect(state.forces.perceivedG).toBeLessThan(C.gLimit);
  for (const index of indices) {
    const component = state.damage!.components[index]!;
    expect(component.attached).toBe(false);
    expect(component.permanentFailure).toBe(ComponentFailure.ProofExceeded);
    expect(component.root.temperature).toBeLessThanOrEqual(1173.15);
    expect(state.damage!.debris[index]!.active).toBe(true);
  }
  // Unload through real commands. Loss is irreversible even if later motion
  // invokes another global guard; detached cooling is deliberately unmodeled.
  for (let i = 0; i < 120; i++) state = step(state, dt, { pitchControl: 0, throttle: 0 }, vehicle);
  for (const index of indices) {
    expect(state.damage!.components[index]!.attached).toBe(false);
    expect(state.damage!.components[index]!.permanentFailure).toBe(ComponentFailure.ProofExceeded);
  }
});
