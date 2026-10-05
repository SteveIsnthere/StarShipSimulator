/** Wrong vehicle selection, omitted engines, fixed-ring gimbal, unpaid fuel or
 * synthetic tank geometry must fail these consumer-level physical witnesses. */
import { describe, expect, it } from 'vitest';
import { SUPER_HEAVY, CENTRE_ENGINES, RETURN_ENGINES, CATCH } from '$core/vehicles/super-heavy';
import { ALL_SCENARIOS, PRESETS, createScenarioState, createScenarioVehicle } from '$core/scenarios';
import { SHIP, LOX_DENSITY, CH4_DENSITY, OXIDISER_SHARE } from '$core/vehicle';
import { createInitialState, cloneState } from '$core/state';
import { commandIgnition, tickIgnition, shutdownEngine, getTotalMaxThrust, getFuelFlowRate, gimballedShare, getOffAxisThrustTorque } from '$core/physics/engines';
import { centreOfMass, momentOfInertia } from '$core/physics/mass';
import { step } from '$core/step';
import { rad } from '$core/units';
import * as C from '$core/constants';

// Approved V3 anchors, evaluated independently of production propulsion helpers.
const V3_FLOW = (250000 * C.standardGravity) / (327 * C.standardGravity);
const V3_SL_THRUST = (pressure: number) => V3_FLOW * C.standardGravity * 350
  - Math.max(0, pressure) / 101.325 * (V3_FLOW * C.standardGravity * 350 - 250000 * C.standardGravity);
const V3_RVAC_THRUST = (pressure: number) => 275000 * C.standardGravity
  - Math.max(0, pressure) * 1000 * Math.PI * (2.3 / 2) ** 2;
function independentBoosterInertia(load: number): number {
  const radius = 4.5, dryMass = 200000, dryStation = 36, bottom = 3, capacity = 3650000;
  const area = Math.PI * radius ** 2, fill = load / capacity;
  const loxFull = capacity * OXIDISER_SHARE / (LOX_DENSITY * area);
  const methaneFull = capacity * (1 - OXIDISER_SHARE) / (CH4_DENSITY * area);
  const masses = [dryMass, load * OXIDISER_SHARE, load * (1 - OXIDISER_SHARE)];
  const heights = [72, loxFull * fill, methaneFull * fill];
  const stations = [dryStation, bottom + heights[1]! / 2, bottom + loxFull + heights[2]! / 2];
  const com = masses.reduce((sum, mass, i) => sum + mass * stations[i]!, 0) / (dryMass + load);
  return masses.reduce((sum, mass, i) => sum + mass * (radius ** 2 / 4 + heights[i]! ** 2 / 12
    + (stations[i]! - com) ** 2), 0);
}

const flags = (indices: readonly number[]) => Array.from({length:33}, (_,i) => indices.includes(i));

describe('actual booster preset identity', () => {
  it('uses the booster model without changing any of the six historical start values', () => {
    for (const [id, values] of [
      ['booster-sep', [70000,45000,1130,1130,45,500]],
      ['rtls', [15000,5000,330,430,30,200]],
    ] as const) {
      const preset=PRESETS.find(p=>p.id===id)!;
      expect([preset.altitude,preset.xPosition,preset.speedX,preset.speedY,preset.pitch,preset.propellant]).toEqual(values);
      const flight=createScenarioVehicle(preset,123);
      expect(flight.vehicle).toBe(SUPER_HEAVY);
      expect(flight.state.engines.running).toHaveLength(33);
      expect(flight.state.vehicle.propellantMass).toBe(values[5]*1000);
      expect(flight.state.vehicle.vehicleMass).toBe(200000+values[5]*1000);
      expect(flight.state.kinematics.pitch).toBe(values[4]*Math.PI/180);
      expect(createScenarioState(preset,123).engines.running).toHaveLength(6);
    }
  });
  it('retains the basedOn model and clamps to its own fuel capacity and pad height', () => {
    const preset=PRESETS[0]!;
    const flight=createScenarioVehicle({...preset,id:'custom',basedOn:'booster-sep',altitude:0,propellant:4000},123);
    expect(flight.vehicle).toBe(SUPER_HEAVY);
    expect(flight.state.vehicle.propellantMass).toBe(3650000);
    expect(flight.state.kinematics.altitude).toBe(72 / 2);
    expect(createScenarioVehicle({...preset,id:'custom',basedOn:'rtls',propellant:-1},123).state.vehicle.propellantMass).toBe(0);
    for(const ship of ALL_SCENARIOS.filter(p=>!['booster-sep','rtls'].includes(p.id))) {
      expect(createScenarioVehicle(ship,123).vehicle).toBe(SHIP);
      expect(createScenarioVehicle(ship,123).state).toEqual(createScenarioState(ship,123));
    }
  });
});

describe('booster paid propulsion and moving mass', () => {
  it.each([0, 101.325])('keeps a fixed RVac mount torque independent of gimbal at %s kPa', pressure => {
    const running = [false, false, false, true, false, false];
    // Ship RVac3 is physically at -3m; its fixed axis must never follow a
    // commanded gimbal. This general mount helper accepts either vehicle.
    const expected = 3 * V3_RVAC_THRUST(pressure) * 40 * .01;
    for (const gimbal of [-15, 0, 15])
      expect(getOffAxisThrustTorque(running, 40, pressure, rad(gimbal * Math.PI / 180), SHIP)).toBe(expected);
    running[3] = false;
    expect(getOffAxisThrustTorque(running, 40, pressure, rad(.1), SHIP)).toBe(0);
  });
  it('sums all33 engines and only the13 steerable engines supply gimbal authority', () => {
    const all=flags(Array.from({length:33},(_,i)=>i));
    expect(getTotalMaxThrust(all,101.325,SUPER_HEAVY)).toBe(33 * 250000 * C.standardGravity);
    expect(getFuelFlowRate(all,100,SUPER_HEAVY)).toBe(33 * V3_FLOW);
    expect(gimballedShare(all,0,SUPER_HEAVY)).toBe(13/33);
    expect(gimballedShare(flags([13]),0,SUPER_HEAVY)).toBe(0);
    expect(gimballedShare(flags(CENTRE_ENGINES),0,SUPER_HEAVY)).toBe(1);
    expect(CENTRE_ENGINES).toHaveLength(3);
    expect(RETURN_ENGINES).toHaveLength(13);
  });
  it('starts at the selected load COM/inertia rather than uniform-cylinder inertia', () => {
    // Independently hand-computed two filled columns, shared COM and parallel axes.
    expect(createInitialState(123,SUPER_HEAVY).vehicle.vehicleMomentOfInertia)
      .toBeCloseTo(independentBoosterInertia(500000),2);
    const flight=createScenarioVehicle({...PRESETS[0]!,propellant:0},123);
    expect(flight.state.vehicle.vehicleMomentOfInertia).toBe(200000*(4.5**2/4+72**2/12));
  });
  it('produces the physical torque of an independently lit fixed outer engine', () => {
    const s=createInitialState(123,SUPER_HEAVY);
    s.kinematics.altitude=1000;s.kinematics.distanceToPlanetCenter=C.planetRadius+1000;
    s.status.onTheGround=false;s.vehicle.propellantMass=0;
    // Fuel sufficient for one step, then evaluate the torque at the resulting dry COM.
    s.vehicle.propellantMass=V3_FLOW/120;
    s.engines.running[13]=true;
    const next=step(s,1/120,{},SUPER_HEAVY);
    expect(next.forces.offAxisThrustDifferenceAcceleration)
      .toBeCloseTo(-3.8*next.forces.thrust/next.vehicle.vehicleMomentOfInertia,12);
  });
  it('lights and shuts down each engine independently and replays its own seeded delays', () => {
    const a=createInitialState(123,SUPER_HEAVY), b=createInitialState(123,SUPER_HEAVY);
    a.engines.failed[32]=b.engines.failed[32]=true;
    for(let i=0;i<33;i++) {commandIgnition(a,i);commandIgnition(b,i);}
    expect(a).toEqual(b);
    tickIgnition(a,1.2); tickIgnition(b,1.2);
    expect(a.engines.running.filter(Boolean)).toHaveLength(32);
    expect(a.engines.running[32]).toBe(false);
    shutdownEngine(a,17);
    expect(a.engines.running[16]).toBe(true);
    expect(a.engines.running[17]).toBe(false);
    expect(a.engines.running[18]).toBe(true);
    expect(b.engines.running[17]).toBe(true);
  });
  it('pays for the last impulse and never lets an outer ring steer as a gimballed engine', () => {
    const s=createInitialState(123,SUPER_HEAVY);
    s.kinematics.altitude=1000; s.kinematics.distanceToPlanetCenter=C.planetRadius+1000;
    s.status.onTheGround=false;
    s.vehicle.propellantMass=1;
    s.vehicle.gimbalPosition=100;
    s.vehicle.gimbalPointingDirection=rad(-C.gimbalAngleLimit);
    s.engines.running[13]=true;
    const next=step(s,1/120,{},SUPER_HEAVY);
    expect(next.vehicle.propellantMass).toBe(0);
    expect(next.forces.thrust).toBeCloseTo(V3_SL_THRUST(next.atmosphere.airPressure)/(V3_FLOW/120),7);
    expect(next.forces.thrustVectorForce).toBe(0);
    expect(next.kinematics.speedX).toBe(0);
    expect(next.vehicle.vehicleMass).toBe(200000);
    expect(step(cloneState(s),1/120,{},SUPER_HEAVY)).toEqual(next);
  });
  it('fits both tanks and retains positive inertia and physical thrust authority across the stated dry-mass uncertainty', () => {
    expect(SUPER_HEAVY.ch4TankBottom+SUPER_HEAVY.ch4TankHeight).toBeLessThan(72);
    expect(CATCH.bodyCentreAltitude).toBe(120 - (65 / 71 * 72 - 36));
    for(const dryMass of [160000,200000,240000]) {
      const model={...SUPER_HEAVY,dryMass};
      for(const load of [0,200000,500000,3400000,3650000]) {
        const com=centreOfMass(load,model), inertia=momentOfInertia(load,model);
        expect(com).toBeGreaterThan(0);expect(com).toBeLessThan(72);
        expect(inertia).toBeGreaterThan(0);expect(Number.isFinite(inertia)).toBe(true);
        if(load===0) expect(inertia).toBe(dryMass*(4.5**2/4+72**2/12));
      }
      expect(getTotalMaxThrust(flags(RETURN_ENGINES),101.325,model)/(dryMass+500000)).toBeGreaterThan(9.80665);
    }
  });
});
