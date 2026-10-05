/** First-job calculator witnesses, not additional complete preset flights.
 * Actual kinematics/fuel freeze after one frame; receipt time/work follow the
 * production scheduler, so a valid past cutoff cannot masquerade as a plan. */
import { describe,expect,it } from 'vitest';
import { createScenarioVehicle,PRESETS } from '$core/scenarios';
import { step,advanceMechanics } from '$core/step';
import { runBoosterPolicy } from '$core/autopilot/booster';
import { advanceBoosterPrediction } from '$core/control/booster-prediction';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';

describe('paid return planning at production receipt/work timing',()=>{
  it.each(['booster-sep','rtls'])('publishes a source-matched physically caught future cutoff for %s',id=>{
    const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);
    initial.state.autopilot.autoLandOn=true;
    const s=step(initial.state,1/120,{},SUPER_HEAVY);
    // Explicit calculator-only witness: receipt time moves while physical state
    // is frozen, so it cannot carry the production observer's live provenance.
    // A calculator plan remains ineligible for actual cutoff without a verified
    // lineage (booster-source.test.ts); original work/deadline checks stay below.
    delete s.autopilot.boosterSource;
    delete s.autopilot.boosterPrediction!.sourceLineage;
    const kinematics={...s.kinematics},fuel=s.vehicle.propellantMass,rng={...s.rng.counters};
    let calls=0;
    const advance:typeof advanceMechanics=(...args)=>{calls++;return advanceMechanics(...args);};
    for(let i=0;i<10000 && !s.autopilot.boosterPrediction!.done;i++){
      s.world.environmentTime+=1/120;
      const before=calls;
      advanceBoosterPrediction(s,1/120,advance,runBoosterPolicy,SUPER_HEAVY);
      expect(calls-before).toBeLessThanOrEqual(4);
    }
    const j=s.autopilot.boosterPrediction!,plan=s.autopilot.boosterReturnPlan;
    expect(s.kinematics).toEqual(kinematics);expect(s.vehicle.propellantMass).toBe(fuel);
    expect(s.rng.counters).toEqual(rng);
    expect(j.done).toBe(true);expect(plan).toBeDefined();
    expect(plan!.originTime).toBe(j.origin.world.environmentTime);
    expect(plan!.shutdownAt).toBeGreaterThan(s.world.environmentTime);
    expect(j.rollout.state.status.landed).toBe(true);
    expect(j.rollout.state.status.onTheGround).toBe(false);
    expect(j.rollout.state.vehicle.propellantMass).toBeGreaterThan(0);
    expect(Object.values(j.rollout.state.failures).some(Boolean)).toBe(false);
    console.log(JSON.stringify({id,receipt:s.world.environmentTime,shutdown:plan!.shutdownAt,
      iterations:j.iterations,paidFutureSteps:calls,remainingFuel:j.rollout.state.vehicle.propellantMass}));
  });
});
