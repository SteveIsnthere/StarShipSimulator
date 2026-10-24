/** Independent ownership witnesses: retained hardware/fuel, never cache-only mass. */
import { describe, expect, it } from 'vitest';
import { autoLand, finalDescentStageController } from '$core/autopilot';
import { plannedEngineCount, triggerBurnAltitude, finalDescentStartAltitude } from '$core/autopilot/landing-burn';
import { createBurnScratch, landingBurnStartAltitude } from '$core/control/guidance-physics';
import { raptorAutoShutDown_KeepMinTWRBelow1 } from '$core/control/primitives';
import { createInitialState, cloneState } from '$core/state';
import { damageModelFor } from '$core/physics/damage-model';
import { verticalWeight } from '$core/physics/gravity';
import { SHIP, OXIDISER_SHARE } from '$core/vehicle';
import * as C from '$core/constants';
import { rad } from '$core/units';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createBoosterThrustRequest, writeBoosterThrustRequest, createBoosterArrival, writeBoosterArrival } from '$core/control/booster-arrival';

function lostAft(fuel = 18_000) {
  const s = createInitialState(123), p = damageModelFor(SHIP).partition;
  const i = p.components.findIndex(c => c.id === 'ship-aft-flap-left');
  s.damage!.components[i]!.attached = false;
  s.vehicle.propellantMass = fuel;
  s.kinematics.altitude = 2490;
  s.kinematics.distanceToPlanetCenter = C.planetRadius + 2490;
  s.kinematics.speedY = -20;
  return { s, p, removed: p.components[i]! };
}

// Catalogue centroid and parallel-axis theorem, no production mass writer.
function moments(s: ReturnType<typeof createInitialState>) {
  const p = damageModelFor(SHIP).partition, fuel = s.vehicle.propellantMass;
  const bodies = p.components.filter((_, i) => s.damage!.components[i]!.attached)
    .map(c => ({ mass: c.mass, x: c.x, z: c.station, inertia: c.inertia }));
  const fill = fuel / SHIP.propellantCapacity;
  for (const [mass, bottom, height] of [
    [fuel * OXIDISER_SHARE, SHIP.tankBottom, fill * SHIP.loxTankHeight],
    [fuel * (1 - OXIDISER_SHARE), SHIP.ch4TankBottom, fill * SHIP.ch4TankHeight],
  ]) bodies.push({ mass: mass!, x: 0, z: bottom! + height! / 2,
    inertia: mass! * ((SHIP.diameter / 2) ** 2 / 4 + height! ** 2 / 12) });
  const mass = bodies.reduce((sum, b) => sum + b.mass, 0);
  const x = bodies.reduce((sum, b) => sum + b.mass * b.x, 0) / mass;
  const z = bodies.reduce((sum, b) => sum + b.mass * b.z, 0) / mass;
  const inertia = bodies.reduce((sum, b) => sum + b.inertia + b.mass * ((b.x - x) ** 2 + (b.z - z) ** 2), 0);
  return { mass, z, inertia };
}

describe('guidance consumes retained hardware', () => {
  for (const healthy of [2, 0]) it(`sizes the flip from retained COM and ${healthy} available engines`, () => {
    const { s } = lostAft(), m = moments(s);
    s.vehicle.vehicleMass = m.mass;
    s.vehicle.vehicleMomentOfInertia = m.inertia;
    for (let i = 0; i < 3; i++) s.engines.failed[i] = i >= healthy;
    s.autopilot.autoLandOn = true; s.autopilot.initVehicleConfigCompleted = true;
    autoLand(s, 1 / 120);
    if (healthy === 0) {
      expect(s.autopilot.bellyFlopTriggerAltitude).toBe(Infinity);
      return;
    }
    // The shipped pessimistic flip estimator plans one engine, even with two healthy.
    const acc = 250_000 * C.standardGravity * .4 * m.z / m.inertia;
    const duration = Math.sqrt((((Math.PI / 2 + C.flipGoalAngle) / 2 / acc) * 2)) * 2;
    const expected = s.autopilot.finalStagePessimisticAltitude! + 20 * (duration + 1.2)
      - C.horizontalAdjustmentVerticalSpeedLimit * C.horizontalAdjustmentDurationEstimateSingleEngine + 26;
    expect(s.autopilot.bellyFlopTriggerAltitude).toBeCloseTo(expected, 8);
  });

  it('uses retained dry mass as the finite paid-fuel floor', () => {
    const { s, removed } = lostAft();
    const fuel = removed.mass / 4, dry = SHIP.dryMass - removed.mass;
    s.vehicle.propellantMass = fuel;
    s.kinematics.speedY = -1;
    const mass = dry + fuel;
    const minimumAcceleration = 250_000 * C.standardGravity / mass - verticalWeight(C.planetRadius);
    // Analytic upper burn time/fuel establishes feasibility independently.
    expect((250_000 / 327) / minimumAcceleration).toBeLessThan(fuel);
    expect(mass).toBeLessThan(SHIP.dryMass);
    const predicted = landingBurnStartAltitude(1, mass, 1, 0, createBurnScratch(), SHIP, dry);
    expect(predicted).not.toBeNull();
    expect(predicted!).toBeGreaterThan(0);
    expect(predicted!).toBeLessThanOrEqual(1 / (2 * minimumAcceleration) + .001);
    // Exported sizing must derive mass/floor despite an intentionally stale cache.
    expect(triggerBurnAltitude(s)).toBeCloseTo(predicted!, 9);
    expect(landingBurnStartAltitude(1, dry, 1, 0, createBurnScratch(), SHIP, dry)).toBeNull();
  });

  it('does not credit engine capability when its support is absent', () => {
    const s = createInitialState(123), p = damageModelFor(SHIP).partition;
    s.damage!.components[p.components.findIndex(c => c.kind === 'engine-support')]!.attached = false;
    s.engines.running.fill(true);
    s.vehicle.vehicleMass = 1; // Must not manufacture a minimum-TWR shutdown.
    expect(plannedEngineCount(s)).toBe(0);
    expect(triggerBurnAltitude(s)).toBe(s.kinematics.altitude);
    expect(finalDescentStartAltitude(s)).toBe(s.kinematics.altitude);
    let toggles = 0;
    raptorAutoShutDown_KeepMinTWRBelow1(s, () => { toggles++; });
    expect(toggles).toBe(0);
    s.autopilot.autoLandOn = true; s.autopilot.initVehicleConfigCompleted = true;
    s.kinematics.speedY = 0;
    autoLand(s, 1 / 120);
    expect(s.autopilot.bellyFlopTriggerAltitude).toBe(Infinity);
  });

  it('uses canonical mass at minimum-throttle shutdown without changing ownership', () => {
    const s = createInitialState(123);
    s.vehicle.propellantMass = 0;
    s.engines.running = [true,true,true,false,false,false];
    s.vehicle.vehicleMass = 1_000_000;
    const before = cloneState(s), toggled: number[] = [];
    raptorAutoShutDown_KeepMinTWRBelow1(s, (_, i) => { toggled.push(i); });
    expect(toggled).toEqual([0]);
    expect(s).toEqual(before);
  });

  it('keeps final-descent throttle independent of stale cached mass', () => {
    const s = createInitialState(123);
    s.vehicle.propellantMass = 26_000;
    s.engines.running = [true,false,false,false,false,false];
    s.kinematics.altitude = 600;
    s.kinematics.distanceToPlanetCenter = C.planetRadius + 600;
    s.kinematics.speedY = -Math.sqrt(2 * (250_000 * C.standardGravity / 146_000
      - verticalWeight(C.planetRadius + 600)) * (600 - 26));
    s.kinematics.pitch = rad(0);
    s.atmosphere.airPressure = C.SEA_LEVEL_PRESSURE_PA / 1000;
    s.vehicle.vehicleMass = 146_000;
    const stale = cloneState(s); stale.vehicle.vehicleMass = 1_000_000;
    finalDescentStageController(s, 1 / 120);
    finalDescentStageController(stale, 1 / 120);
    expect(s.vehicle.throttle).toBeGreaterThan(95);
    expect(stale.vehicle.throttle).toBe(s.vehicle.throttle);
  });
});

describe('booster exported force and arrival queries', () => {
  it('forwards the selected engine model and only shuts an engine already running', () => {
    const s = createInitialState(123, SUPER_HEAVY);
    s.engines.running.fill(false); s.engines.running[5] = true;
    s.kinematics.altitude = 80_000; s.kinematics.speedX = 8000;
    const toggled: number[] = [];
    raptorAutoShutDown_KeepMinTWRBelow1(s, (_, i) => { toggled.push(i); }, SUPER_HEAVY);
    expect(toggled).toEqual([5]);
  });
  it('uses supported retained fuel mass instead of the cache', () => {
    const s = createInitialState(123, SUPER_HEAVY);
    s.engines.running.fill(false); s.engines.running[0] = true;
    s.vehicle.propellantMass = 40_000;
    s.vehicle.vehicleMass = 240_000;
    s.forces.thrust = 0; s.kinematics.accelerationX = s.kinematics.accelerationY = 0;
    const stale = cloneState(s); stale.vehicle.vehicleMass = 1_000_000;
    const a = createBoosterThrustRequest(), b = createBoosterThrustRequest();
    writeBoosterThrustRequest(s, 0, 10, SUPER_HEAVY, a);
    writeBoosterThrustRequest(stale, 0, 10, SUPER_HEAVY, b);
    expect(b).toEqual(a);
    expect(a.deliveredY).toBeCloseTo(10, 12);
  });
  it('does not deliver hypothetical force through absent engine support', () => {
    const s = createInitialState(123, SUPER_HEAVY), p = damageModelFor(SUPER_HEAVY).partition;
    s.damage!.components[p.components.findIndex(c => c.kind === 'engine-support')]!.attached = false;
    s.engines.running.fill(true);
    s.forces.thrust = 1234; // The preceding interval's paid impulse is preserved.
    const before = cloneState(s), out = createBoosterThrustRequest();
    writeBoosterThrustRequest(s, 1, 10, SUPER_HEAVY, out);
    expect(out.deliveredX).toBe(0); expect(out.deliveredY).toBe(0);
    expect(s).toEqual(before);
  });
  it('reports failed mandatory centres as unavailable rather than substituting engines', () => {
    const s = createInitialState(123, SUPER_HEAVY);
    s.kinematics.altitude = 1000; s.kinematics.speedY = -100;
    s.engines.failed[1] = true;
    const out = createBoosterArrival();
    writeBoosterArrival(s, 1 / 120, SUPER_HEAVY, out);
    expect(out.lateralFeasible).toBe(false);
  });
});
