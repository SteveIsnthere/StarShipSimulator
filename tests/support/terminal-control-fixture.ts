/** Recorded constraints, not an exact full historical state or flight. */
import fixture from '../../docs/research/2026-10-18-phase8-successor/terminal-coallocation/boundary-fixture.json';
import { createScenarioState, getScenario } from '$core/scenarios';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';

export function terminalControlFixture() {
  const s = fixture.sample;
  const state = createScenarioState({ ...getScenario('before-flip')!, altitude: s.kinematics.altitude }, undefined, SUPER_HEAVY);
  Object.assign(state.kinematics, s.kinematics);
  Object.assign(state.vehicle, { propellantMass: s.vehicle.propellant, vehicleMass: s.vehicle.mass,
    vehicleMomentOfInertia: s.vehicle.inertia, throttle: s.vehicle.throttle,
    throttleCurrent: s.vehicle.actualThrottle, gimbalPosition: s.vehicle.gimbal,
    gimbalPointingDirection: s.vehicle.gimbalDirection, frontFinExtension: s.vehicle.frontFin,
    aftFinExtension: s.vehicle.aftFin, rcsRunTimeRemaining: s.vehicle.rcs });
  Object.assign(state.forces, { thrust: s.forces.thrust, paidThrustAccelerationX: s.forces.paidAX,
    paidThrustAccelerationY: s.forces.paidAY, thrustVectorAcceleration: s.forces.thrustVector,
    frontFinDragAngularAcceleration: s.forces.finTorque, rcsThrustAngularAcceleration: s.forces.rcsTorque,
    angularDragAcceleration: s.forces.angularDrag, offAxisThrustDifferenceAcceleration: s.forces.offAxisTorque });
  state.engines.running = [...s.engines.running];
  state.engines.failed = [...s.engines.failed];
  state.engines.ignitionCountdown = [...s.engines.pending];
  state.autopilot.boosterPhase = 'terminal';
  state.autopilot.autoLandOn = true;
  state.autopilot.boosterArrivalTime = s.control.arrivalTime;
  state.autopilot.boosterTerminalIgnitionTime = s.control.terminalIgnitionTime;
  state.world.environmentTime = s.time;
  state.world.updatedFrameCount = s.tick;
  state.rng = { seed: s.rng.seed, counters: { ...s.rng.counters } };
  Object.assign(state.status, s.status);
  Object.assign(state.warnings, s.warnings);
  Object.assign(state.failures, s.failures);
  if (state.damage) {
    Object.assign(state.damage.hull, s.damage.hull);
    for (let i = 0; i < s.damage.components.length; i++) {
      const recorded = s.damage.components[i]!;
      const current = state.damage.components[i]!;
      Object.assign(current, { attached: recorded.attached, permanentFailure: recorded.permanentFailure,
        loadedAngle: recorded.loadedAngle });
      Object.assign(current.root, recorded.root);
      for (let j = 0; j < 2; j++) Object.assign(current.tps[j]!, recorded.tps[j]);
    }
  }
  return state;
}
