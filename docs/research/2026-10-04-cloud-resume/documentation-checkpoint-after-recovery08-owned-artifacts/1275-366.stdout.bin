/** Short mechanical forecast witnesses; no prescribed preset-to-catch run. */
import { describe,expect,it } from 'vitest';
import { createScenarioVehicle,PRESETS } from '$core/scenarios';
import { cloneState } from '$core/state';
import { advanceMechanics,step } from '$core/step';
import { createBoosterForecast,forecastBoosterReturn,createBoosterForecastWork,advanceBoosterForecast,createBoosterHandoffWork,createBoosterReadyWork,executableBoosterBurnDuration } from '$core/control/booster-forecast';
import { runBoosterPolicy } from '$core/autopilot/booster';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { rad } from '$core/units';
import * as C from '$core/constants';

describe('planned booster forecast',()=>{
  it('keeps every canonical live-tick duration idempotent at floating-point boundaries',()=>{
    for(let ticks=1;ticks<=10000;ticks++) {
      const duration=ticks/120;
      expect(executableBoosterBurnDuration(duration),String(ticks)).toBe(duration);
    }
    expect(executableBoosterBurnDuration(.013)).toBe(2/120);
  });

  function localReady() {
    const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
    s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='terminal';s.autopilot.boosterFallTime=15;
    s.autopilot.boosterCoastPitch=rad(0);
    s.kinematics.altitude=500;s.kinematics.downRangeDistance=C.starBaseXPos+10;
    s.kinematics.speedX=-1;s.kinematics.speedY=-50;s.kinematics.pitch=rad(.01);
    s.kinematics.angularVelocity=0;s.engines.running.fill(false);
    for(let i=0;i<3;i++){s.engines.running[i]=i<2;s.engines.ignitionCountdown[i]=i===2?1/240:null;}
    s.vehicle.throttle=s.vehicle.throttleCurrent=100;return s;
  }
  it('waits for the actual terminal command after a running-centre entry handoff',()=>{
    const s=localReady();s.autopilot.boosterPhase='entry';s.autopilot.boosterEntryCentreOnly=true;
    s.kinematics.altitude=3000;s.kinematics.speedY=-270;
    s.engines.running.fill(false);for(let i=0;i<3;i++)s.engines.running[i]=true;
    s.engines.ignitionCountdown.fill(null);
    const w=createBoosterReadyWork(s,rad(0),0,1/120);
    advanceBoosterForecast(w,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(w.state.autopilot.boosterPhase).toBe('terminal');expect(w.done).toBe(false);
    expect(w.state.autopilot.boosterArrivalTime).toBeUndefined();
    advanceBoosterForecast(w,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    let live=advanceMechanics(s,1/120,runBoosterPolicy,SUPER_HEAVY);
    live=advanceMechanics(live,1/120,runBoosterPolicy,SUPER_HEAVY);
    expect(w.done).toBe(true);expect(w.state.autopilot.boosterArrivalTime).toBeDefined();
    expect(w.state.vehicle).toEqual(live.vehicle);expect(w.state.engines).toEqual(live.engines);
    expect(w.state.forces).toEqual(live.forces);expect(w.state.kinematics).toEqual(live.kinematics);
    expect(w.state.autopilot.boosterArrivalTime).toBe(live.autopilot.boosterArrivalTime);
  });
  it('targets zero final horizontal acceleration for the commanded upright cubic',()=>{
    const s=localReady(),w=createBoosterReadyWork(s,rad(0),0,1/120);
    advanceBoosterForecast(w,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const t=w.result.handoff!.time,k=w.state.kinematics,x=k.downRangeDistance-C.starBaseXPos;
    // Cubic position/velocity endpoint constraints give x''(T)=6x/T²+2vx/T.
    // Root telemetry must optimize that actual upright-centre boundary.
    const endpointAcceleration=6*x/t**2+2*k.speedX/t;
    expect(6*w.result.rangeError/t**2).toBeCloseTo(endpointAcceleration,12);
  });
  it('observes the complete returned readiness command, paid slew and deadline',()=>{
    const s=localReady(),original=cloneState(s),work=createBoosterReadyWork(s,rad(0),0,1/120);
    advanceBoosterForecast(work,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const live=advanceMechanics(s,1/120,runBoosterPolicy,SUPER_HEAVY);
    expect(work.result.reached).toBe(true);
    expect(work.state.kinematics).toEqual(live.kinematics);
    expect(work.state.vehicle).toEqual(live.vehicle);
    expect(work.state.forces).toEqual(live.forces);
    expect(work.state.engines).toEqual(live.engines);
    expect(work.state.status).toEqual(live.status);
    expect(work.state.autopilot.boosterArrivalTime).toBe(live.autopilot.boosterArrivalTime);
    expect(work.state.autopilot.pitchControl).toBe(live.autopilot.pitchControl);
    expect(work.state.autopilot.boosterTerminalMissed).toBe(live.autopilot.boosterTerminalMissed);
    expect(work.state.rng).toEqual(live.rng);expect(s).toEqual(original);
  });
  it('pays discrete terminal ignition at live cadence for arbitrary countdown phases',()=>{
    const s=localReady();s.kinematics.altitude=3040;s.kinematics.downRangeDistance=C.starBaseXPos-8;
    s.kinematics.speedX=-.53;s.kinematics.speedY=-278;s.kinematics.pitch=rad(.00057);
    s.kinematics.angularVelocity=-.00075;s.engines.running.fill(false);
    [.011,.06,.091].forEach((d,i)=>s.engines.ignitionCountdown[i]=d);
    const defaultWork=createBoosterReadyWork(s,rad(0),0),fine=createBoosterReadyWork(s,rad(0),0,1/120);
    for(const w of [defaultWork,fine])advanceBoosterForecast(w,16,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(defaultWork.result.reached).toBe(true);expect(fine.result.reached).toBe(true);
    expect(defaultWork.result.time).toBe(fine.result.time);
    expect(defaultWork.state).toEqual(fine.state);expect(defaultWork.result).toEqual(fine.result);
    expect(defaultWork.result.ignitionDraws).toBe(0);
  });
  it.each([.013,.25,.250001])('pays the executable live cutoff for fractional proposal %s',duration=>{
    const s=localReady();s.autopilot.boosterPhase='boostback';
    s.autopilot.boostBackInitCompleted=true;s.autopilot.boostBackDirection=-1;
    s.kinematics.altitude=100000;s.kinematics.pitch=rad(-Math.PI/2);
    s.engines.ignitionCountdown.fill(null);s.engines.running.fill(false);
    for(let i=0;i<13;i++)s.engines.running[i]=true;
    const work=createBoosterReadyWork(s,rad(0),duration,1/120);
    for(let i=0;i<100 && work.state.autopilot.boosterPhase==='boostback';i++)
      advanceBoosterForecast(work,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    let live=cloneState(s);live.autopilot.boosterReturnPlan={...(s.damage?{damageRevision:s.damage.revision}:{}),originTime:s.world.environmentTime,
      shutdownAt:work.shutdownAt!,coastPitch:rad(0),handoff:{x:0,height:1,vx:0,vy:-1,time:1,lateralFeasible:true}};
    for(let i=0;i<100 && live.autopilot.boosterPhase==='boostback';i++)
      live=advanceMechanics(live,1/120,runBoosterPolicy,SUPER_HEAVY);
    expect(live.autopilot.boosterPhase).toBe('coast');
    expect(work.state.world.environmentTime).toBe(live.world.environmentTime);
    expect(work.state.vehicle.propellantMass).toBe(live.vehicle.propellantMass);
    expect(work.state.kinematics).toEqual(live.kinematics);
    expect(work.state.engines).toEqual(live.engines);expect(work.state.rng).toEqual(live.rng);
  });

  it('replays the selected coast plan through live mechanics to paid terminal readiness bit-exactly',()=>{
    const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
    s.kinematics.altitude=500;s.kinematics.downRangeDistance=C.starBaseXPos;
    s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
    s.kinematics.speedX=0;s.kinematics.speedY=-50;
    s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='coast';
    s.autopilot.boosterCoastPitch=rad(0);
    s.autopilot.boosterReturnPlan={...(s.damage?{damageRevision:s.damage.revision}:{}),originTime:-1,shutdownAt:-.5,coastPitch:rad(0),
      handoff:{x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true}};
    const original=cloneState(s);
    const future=createBoosterReadyWork(s,rad(0),0,1/120);
    advanceBoosterForecast(future,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    let live=s;
    for(let i=0;i<4000 && !(live.autopilot.boosterPhase==='terminal' && live.engines.running.slice(0,3).every(Boolean));i++)
      live=step(live,1/120,{},SUPER_HEAVY);
    expect(future.result.reached).toBe(true);
    expect(future.result.handoff).toBeDefined();
    expect(future.state.kinematics).toEqual(live.kinematics);
    expect(future.state.world).toEqual(live.world);
    expect(future.state.vehicle.propellantMass).toBe(live.vehicle.propellantMass);
    expect(future.state.rng).toEqual(live.rng);
    expect(s).toEqual(original);
  });
  it.each(['booster-sep','rtls'])('uses the live mechanical cadence for the paid alignment endpoint of %s',id=>{
    const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);
    initial.state.autopilot.autoLandOn=true;
    const origin=step(initial.state,1/120,{},SUPER_HEAVY).autopilot.boosterPrediction!.origin;
    const scheduled=createBoosterReadyWork(origin,rad(0),.25);
    const liveCadence=createBoosterReadyWork(origin,rad(0),.25,1/120);
    for(const work of [scheduled,liveCadence]) {
      for(let i=0;i<2000 && work.state.autopilot.boosterPhase==='align-boost';i++)
        advanceBoosterForecast(work,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
      expect(work.state.autopilot.boosterPhase).toBe('boostback');
    }
    expect(scheduled.result.time).toBe(liveCadence.result.time);
    expect(scheduled.state).toEqual(liveCadence.state);
    expect(scheduled.result.steps).toBe(liveCadence.result.steps);
  });
  it.each(['booster-sep','rtls'])('matches the live paid thirteen-engine ignition endpoint of %s',id=>{
    const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);
    initial.state.autopilot.autoLandOn=true;
    const origin=step(initial.state,1/120,{},SUPER_HEAVY).autopilot.boosterPrediction!.origin;
    const scheduled=createBoosterReadyWork(origin,rad(0),2);
    const liveCadence=createBoosterReadyWork(origin,rad(0),2,1/120);
    for(const work of [scheduled,liveCadence]) {
      for(let i=0;i<2000 && !work.state.engines.running.slice(0,13).every(Boolean);i++)
        advanceBoosterForecast(work,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
      expect(work.state.engines.running.slice(0,13).every(Boolean)).toBe(true);
      expect(work.state.vehicle.propellantMass).toBeLessThan(origin.vehicle.propellantMass);
      expect(work.state.rng.counters.ignitionFailure-origin.rng.counters.ignitionFailure).toBe(13);
    }
    expect(scheduled.result.time).toBe(liveCadence.result.time);
    expect(scheduled.state).toEqual(liveCadence.state);
    expect(scheduled.result.steps).toBe(liveCadence.result.steps);
  });
  it.each(['booster-sep','rtls'])('reuses only the identical alignment prefix for %s, with bit-exact paid forecasts',id=>{
    const origin=createScenarioVehicle(PRESETS.find(p=>p.id===id)!,123).state;
    origin.autopilot.autoLandOn=true;origin.autopilot.boosterPhase='align-boost';
    const before=cloneState(origin),zero=createBoosterReadyWork(origin,rad(0),0);
    advanceBoosterForecast(zero,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const prefix=zero.prefix!;
    expect(prefix).toBeDefined();expect(prefix.steps).toBeGreaterThan(0);
    const preserved=JSON.stringify(prefix);
    for(const duration of [.25,2.37,7.2]) {
      const plain=createBoosterReadyWork(origin,rad(0),duration);
      const reused=createBoosterReadyWork(origin,rad(0),duration,undefined,prefix);
      const plainCalls=advanceBoosterForecast(plain,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
      const reusedCalls=advanceBoosterForecast(reused,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
      expect(reused.state).toEqual(plain.state);expect(reused.result).toEqual(plain.result);
      expect(reused.shutdownAt).toBe(plain.shutdownAt);expect(reused.done).toBe(plain.done);
      expect(plainCalls-reusedCalls).toBe(prefix.steps);
      expect(reused.result.steps).toBe(plain.result.steps);
      expect(JSON.stringify(prefix)).toBe(preserved);expect(origin).toEqual(before);
    }
  });
  it.each(['booster-sep','rtls'])('reuses exact paid startup for %s without lending its impulse to shorter burns',id=>{
    const origin=createScenarioVehicle(PRESETS.find(p=>p.id===id)!,123).state;
    origin.autopilot.autoLandOn=true;origin.autopilot.boosterPhase='align-boost';
    const original=cloneState(origin),seed=createBoosterReadyWork(origin,rad(0),2);
    advanceBoosterForecast(seed,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const prefix=seed.prefix!;expect(prefix.boostSteps).toBeGreaterThan(0);
    expect(prefix.steadySteps).toBeGreaterThan(0);
    expect(prefix.state.engines.running.slice(0,13).every(Boolean)).toBe(true);
    const saved=JSON.stringify(prefix);
    for(const duration of [.25,2.37,7.2]) {
      const plain=createBoosterReadyWork(origin,rad(0),duration);
      const cached=createBoosterReadyWork(origin,rad(0),duration,undefined,prefix);
      const plainCalls=advanceBoosterForecast(plain,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
      const cachedCalls=advanceBoosterForecast(cached,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
      expect(cached.state).toEqual(plain.state);expect(cached.result).toEqual(plain.result);
      expect(cached.shutdownAt).toBe(plain.shutdownAt);expect(cached.done).toBe(plain.done);
      expect(cached.burnRemaining).toBe(plain.burnRemaining);
      expect(plainCalls-cachedCalls).toBe(duration>.25?prefix.steps:0);
      expect(origin).toEqual(original);expect(JSON.stringify(prefix)).toBe(saved);
    }
  });
  it.each(['booster-sep','rtls'])('pays the same final boost impulse when its forecast cutoff commands live mechanics for %s',id=>{
    const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);initial.state.autopilot.autoLandOn=true;
    const origin=step(initial.state,1/120,{},SUPER_HEAVY).autopilot.boosterPrediction!.origin;
    const seed=createBoosterReadyWork(origin,rad(0),2);
    for(let i=0;i<2000 && !seed.state.engines.running.slice(0,13).every(Boolean);i++)
      advanceBoosterForecast(seed,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(seed.state.engines.running.slice(0,13).every(Boolean)).toBe(true);
    const paid=cloneState(seed.state);delete paid.autopilot.boosterForecastBurn;
    const forecast=createBoosterReadyWork(paid,rad(0),.25,1/120);
    for(let i=0;i<100 && forecast.state.autopilot.boosterPhase==='boostback';i++)
      advanceBoosterForecast(forecast,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(forecast.shutdownAt).toBeDefined();
    let live=cloneState(paid);
    live.autopilot.boosterReturnPlan={...(paid.damage?{damageRevision:paid.damage.revision}:{}),originTime:paid.world.environmentTime,shutdownAt:forecast.shutdownAt!,coastPitch:rad(0),
      handoff:{x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true}};
    for(let i=0;i<100 && live.autopilot.boosterPhase==='boostback';i++)
      live=advanceMechanics(live,1/120,runBoosterPolicy,SUPER_HEAVY);
    expect(live.autopilot.boosterPhase).toBe('coast');
    expect(live.world.environmentTime).toBeCloseTo(forecast.state.world.environmentTime,10);
    expect(live.vehicle.propellantMass).toBeCloseTo(forecast.state.vehicle.propellantMass,8);
    expect(live.kinematics.speedX).toBeCloseTo(forecast.state.kinematics.speedX,8);
    expect(live.rng).toEqual(forecast.state.rng);expect(live.engines).toEqual(forecast.state.engines);
  });
  it('rejects alignment reuse after changing source, mechanics, policy, model, coast or timestep',()=>{
    const origin=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
    origin.autopilot.autoLandOn=true;origin.autopilot.boosterPhase='align-boost';
    const zero=createBoosterReadyWork(origin,rad(0),0);
    advanceBoosterForecast(zero,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const prefix=zero.prefix!;
    const changedAdvance:typeof advanceMechanics=(...args)=>advanceMechanics(...args);
    const changedPolicy:typeof runBoosterPolicy=(...args)=>runBoosterPolicy(...args);
    const cases=[
      {source:cloneState(origin),advance:advanceMechanics,policy:runBoosterPolicy,model:SUPER_HEAVY,pitch:rad(0)},
      {source:origin,advance:changedAdvance,policy:runBoosterPolicy,model:SUPER_HEAVY,pitch:rad(0)},
      {source:origin,advance:advanceMechanics,policy:changedPolicy,model:SUPER_HEAVY,pitch:rad(0)},
      {source:origin,advance:advanceMechanics,policy:runBoosterPolicy,model:{...SUPER_HEAVY},pitch:rad(0)},
      {source:origin,advance:advanceMechanics,policy:runBoosterPolicy,model:SUPER_HEAVY,pitch:rad(.1)},
      {source:origin,advance:advanceMechanics,policy:runBoosterPolicy,model:SUPER_HEAVY,pitch:rad(0),step:.05},
    ];
    for(const c of cases) {
      const plain=createBoosterReadyWork(c.source,c.pitch,2,c.step);
      const reused=createBoosterReadyWork(c.source,c.pitch,2,c.step,prefix);
      advanceBoosterForecast(plain,4,c.advance,c.policy,c.model);
      const calls=advanceBoosterForecast(reused,4,c.advance,c.policy,c.model);
      expect(calls).toBe(4);expect(reused.result.steps).toBe(4);
      expect(reused.state).toEqual(plain.state);expect(reused.result).toEqual(plain.result);
    }
  });
  it('bounds local predictor timestep disagreement by first-order drag convergence, separately from catch validity',()=>{
    const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
    s.kinematics.altitude=2000;s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
    s.kinematics.speedX=100;s.kinematics.speedY=-50;
    s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='coast';
    const heights=[.25,.125,.0625].map(dt=>{
      const w=createBoosterHandoffWork(s,rad(0),0,dt);
      advanceBoosterForecast(w,Math.round(1/dt),advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
      expect(w.result.time).toBeCloseTo(1,12);expect(w.done).toBe(false);
      return w.state.kinematics.altitude;
    });
    const coarse=Math.abs(heights[0]!-heights[1]!),fine=Math.abs(heights[1]!-heights[2]!);
    expect(coarse).toBeGreaterThan(1e-8);
    // Held incoming aerodynamic force is first-order: halving dt must shrink
    // its local disagreement. No global/catch accuracy is inferred here.
    expect(coarse/fine).toBeGreaterThan(1.5);
    expect(coarse/fine).toBeLessThan(3);
  });
  it('stops at the physical terminal handoff before spending terminal fuel',()=>{
    const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
    s.kinematics.altitude=500;s.kinematics.downRangeDistance=C.starBaseXPos;
    s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
    s.kinematics.speedX=0;s.kinematics.speedY=-50;
    s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='coast';
    const original=cloneState(s);
    const work=createBoosterHandoffWork(s,rad(0),0,1/120);
    advanceBoosterForecast(work,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(work.done).toBe(true);expect(work.result.reached).toBe(true);
    expect(work.state.autopilot.boosterPhase).toBe('terminal');
    expect(work.result.handoff).toBeDefined();
    expect(work.result.handoff!.lateralFeasible).toBe(true);
    expect(work.state.engines.running.some(Boolean)).toBe(false);
    expect(work.state.rng.counters.ignitionFailure).toBe(original.rng.counters.ignitionFailure);
    expect(work.result.fuel).toBe(original.vehicle.propellantMass);
    expect(s).toEqual(original);
  });
  it('pays actual13-engine fuel during a hypothetical boost continuation before coasting',()=>{
    const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
    s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='boostback';
    s.kinematics.altitude=500;s.kinematics.pitch=rad(0);s.kinematics.speedX=0;s.kinematics.speedY=-50;
    s.engines.running.fill(false);for(let i=0;i<13;i++)s.engines.running[i]=true;
    s.vehicle.throttle=s.vehicle.throttleCurrent=100;
    const initialFuel=s.vehicle.propellantMass;
    const work=createBoosterForecastWork(s,rad(0),.25);
    advanceBoosterForecast(work,4,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const p=SUPER_HEAVY.propulsion;
    const fullEngineFlow=p.seaLevel.thrustSeaLevel/(p.standardGravity*p.seaLevel.ispSeaLevel);
    expect(work.state.vehicle.propellantMass).toBeCloseTo(initialFuel-13*fullEngineFlow*.2,8);
    expect(s.vehicle.propellantMass).toBe(initialFuel);
    expect(work.state.autopilot.boosterPhase).toBe('boostback');
  });
  it('advances real slew, ignition and paid fuel without changing flight state or RNG',()=>{
    const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
    s.kinematics.altitude=500;s.kinematics.downRangeDistance=C.starBaseXPos;
    s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
    s.kinematics.speedX=0;s.kinematics.speedY=-50;
    s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='terminal';
    s.autopilot.boosterFallTime=12;
    const before=cloneState(s),out=createBoosterForecast();
    forecastBoosterReturn(s,rad(0),advanceMechanics,runBoosterPolicy,SUPER_HEAVY,out);
    expect(s).toEqual(before);
    expect(out.steps).toBeGreaterThan(1);expect(out.steps).toBeLessThanOrEqual(4000);
    expect(out.ignitionDraws).toBe(3);
    expect(out.fuel).toBeLessThan(s.vehicle.propellantMass);
    expect(Number.isFinite(out.rangeError)).toBe(true);
    const first={...out};forecastBoosterReturn(s,rad(0),advanceMechanics,runBoosterPolicy,SUPER_HEAVY,out);
    expect(out).toEqual(first);
  });
  it('does not invent engine fuel use when every engine is failed',()=>{
    const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
    s.kinematics.altitude=500;s.kinematics.downRangeDistance=C.starBaseXPos;
    s.kinematics.pitch=rad(0);s.kinematics.speedX=0;s.kinematics.speedY=-50;
    s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='terminal';s.engines.failed.fill(true);
    const out=createBoosterForecast();forecastBoosterReturn(s,rad(0),advanceMechanics,runBoosterPolicy,SUPER_HEAVY,out);
    expect(out.fuel).toBe(s.vehicle.propellantMass);expect(out.ignitionDraws).toBe(0);
    expect(out.reached).toBe(true);expect(out.speedY).toBeLessThan(-4.5);
  });
});
