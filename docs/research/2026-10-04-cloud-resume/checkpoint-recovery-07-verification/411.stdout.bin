/** Approved V3 Fidelity: active physics, not a renderer-only generation label. */
import { describe, expect, it } from 'vitest';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { getFuelFlowRate, getTotalMaxThrust } from '$core/physics/engines';
import { thrustFor } from '$core/control/guidance-physics';
import { centreOfMass, momentOfInertia, OXIDISER_SHARE, LOX_DENSITY, CH4_DENSITY } from '$core/physics/mass';
import { createInitialState } from '$core/state';
import { step, NO_INPUT } from '$core/step';
import * as C from '$core/constants';
import { autoLand } from '$core/autopilot';
import { IGNITION_DELAY_MAX_S } from '$core/physics/engines';

const SL = [true, false, false, false, false, false];
const G0 = 9.80665;
describe('active V3 flight model', () => {
  it('selects the published generation for both physical bodies', () => {
    expect(SHIP.height).toBe(52);
    expect(SUPER_HEAVY.height).toBe(72);
    expect(SHIP.propellantCapacity).toBe(1_600_000);
    expect(SUPER_HEAVY.propellantCapacity).toBe(3_650_000);
    expect(SUPER_HEAVY.gridFins!.area).toBe(27);
    expect(createInitialState().kinematics.altitude).toBe(26);
  });
  it.each([SHIP, SUPER_HEAVY])('uses paid Raptor3 propulsion in actual flight and guidance ($id)', model => {
    const thrust = 250_000 * G0;
    expect(getTotalMaxThrust(SL, 101.325, model)).toBeCloseTo(thrust, 6);
    expect(getFuelFlowRate(SL, 100, model)).toBeCloseTo(thrust / (327 * G0), 10);
    expect(thrustFor(1, 101.325, model)).toBeCloseTo(thrust, 6);
    const state = createInitialState(123, model);
    state.kinematics.altitude = 1000;
    state.status.onTheGround = false;
    state.engines.running[0] = true;
    state.vehicle.throttleCurrent = 100;
    const next = step(state, 1 / 120, NO_INPUT, model);
    const paid = state.vehicle.propellantMass - next.vehicle.propellantMass;
    expect(paid).toBeCloseTo(getFuelFlowRate(SL, 100, model) / 120, 8);
    expect(next.forces.thrust).toBeCloseTo(getTotalMaxThrust(SL, next.atmosphere.airPressure, model), 6);
  });
  it.each([SHIP,SUPER_HEAVY])('preserves mass/volume and the parallel-axis theorem for V3 $id', model => {
    const area=Math.PI*(model.diameter/2)**2;
    expect(model.loxTankHeight*area*LOX_DENSITY).toBeCloseTo(model.propellantCapacity*OXIDISER_SHARE,6);
    expect(model.ch4TankHeight*area*CH4_DENSITY).toBeCloseTo(model.propellantCapacity*(1-OXIDISER_SHARE),6);
    expect(model.ch4TankBottom+model.ch4TankHeight).toBeLessThan(model.height);
    for(const fraction of [0,.01,.25,.5,1]) {
      const fuel=model.propellantCapacity*fraction;
      const lox=fuel*OXIDISER_SHARE,ch4=fuel-lox;
      const ly=model.tankBottom+model.loxTankHeight*fraction/2;
      const cy=model.ch4TankBottom+model.ch4TankHeight*fraction/2;
      const centre=(model.dryMass*model.dryCentreOfMass+lox*ly+ch4*cy)/(model.dryMass+fuel);
      expect(centreOfMass(fuel,model)).toBeCloseTo(centre,12);
      const inertia=(mass:number,height:number,y:number)=>mass*((model.diameter/2)**2/4+height**2/12+(y-centre)**2);
      const expected=inertia(model.dryMass,model.height,model.dryCentreOfMass)
        +inertia(lox,model.loxTankHeight*fraction,ly)+inertia(ch4,model.ch4TankHeight*fraction,cy);
      expect(Math.abs(momentOfInertia(fuel,model)-expected)).toBeLessThanOrEqual(8*Number.EPSILON*expected);
    }
  });

  it('pays a real RVac burn at its own vacuum/ambient pressure slope', () => {
    const state=createInitialState(123,SHIP);
    state.kinematics.altitude=1000;state.status.onTheGround=false;
    state.engines.running[3]=true;state.vehicle.throttleCurrent=100;
    const next=step(state,1/120,NO_INPUT,SHIP);
    expect(state.vehicle.propellantMass-next.vehicle.propellantMass).toBeCloseTo(275000/380/120,8);
    const expected=275000*G0-next.atmosphere.airPressure*1000*Math.PI*(2.3/2)**2;
    expect(next.forces.thrust).toBeCloseTo(expected,6);
  });
  it('sizes the flip using the active V3 minimum-throttle thrust', () => {
    const state=createInitialState(123,SHIP);
    state.vehicle.propellantMass=18000;
    state.vehicle.vehicleMass=SHIP.dryMass+18000;
    state.vehicle.vehicleMomentOfInertia=momentOfInertia(18000,SHIP);
    state.kinematics.altitude=2400;state.kinematics.speedY=-100;
    state.autopilot.autoLandOn=true;
    const force=250000*G0*C.flipStageEngineCount*C.throttleLowerLimit*.01;
    const alpha=force*centreOfMass(18000,SHIP)/state.vehicle.vehicleMomentOfInertia;
    const duration=2*Math.sqrt((Math.PI/2+C.flipGoalAngle)/alpha);
    autoLand(state,1/120);
    expect(state.autopilot.finalStagePessimisticAltitude).toBeDefined();
    const expected=state.autopilot.finalStagePessimisticAltitude!+100*(duration+IGNITION_DELAY_MAX_S)
      -C.horizontalAdjustmentVerticalSpeedLimit*C.horizontalAdjustmentDurationEstimateSingleEngine+SHIP.height/2;
    expect(state.autopilot.bellyFlopTriggerAltitude).toBeCloseTo(expected,8);
  });

});
