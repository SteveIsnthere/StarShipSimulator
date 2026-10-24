import { describe, expect, it } from 'vitest';
import { cloneState, createInitialState, type SimState } from '$core/state';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { ensureBoosterSource, advanceBoosterSource, verifyBoosterSource, cloneBoosterMechanics } from '$core/control/booster-source';
import { damageModelFor } from '$core/physics/damage-model';
import { steelSpecificEnthalpy } from '$core/physics/damage-material';
import type { MechanicalAdvance, MechanicalControl } from '$core/control/mechanical';
import { rad } from '$core/units';
import { step, advanceMechanics } from '$core/step';
import { runBoosterAutopilot, runBoosterPostStep } from '$core/autopilot/booster';
import { advanceBoosterPrediction } from '$core/control/booster-prediction';
import { PRESETS, createScenarioVehicle } from '$core/scenarios';

const dt = 1/120;
const partition = damageModelFor(SUPER_HEAVY).partition;
const rootIndex = partition.components.findIndex(c => c.kind === 'grid-fin');
function live(): SimState {
  const s = createInitialState(89, SUPER_HEAVY);
  s.autopilot.autoBoostBackOn = true;
  s.autopilot.manualControlOn = false;
  s.autopilot.boosterPhase = 'boostback';
  s.autopilot.boosterFallTime = 100;
  return s;
}
function warm(s: SimState, delta: number): void {
  const root = s.damage!.components[rootIndex]!.root;
  root.temperature += delta;
  root.energy = partition.components[rootIndex]!.rootMass * steelSpecificEnthalpy(root.temperature);
}
// Tiny deterministic mechanics witness: control runs before final clock update,
// exactly as production, and warming remains enthalpy-consistent.
const advance: MechanicalAdvance = (previous, interval, control, model) => {
  const s = cloneBoosterMechanics(previous);
  warm(s, .01);
  s.world.updatedFrameCount++;
  control(s, interval, model);
  s.world.environmentTime += interval;
  return s;
};
const policy: MechanicalControl = s => { s.vehicle.throttle = s.autopilot.boosterFallTime! / 2; };
function returned(s: SimState): SimState {
  const next = advance(s, dt, (endpoint, interval, model) => {
    const metadata = cloneState(s).autopilot;
    if(metadata.boosterPrediction)endpoint.autopilot.boosterPrediction = metadata.boosterPrediction;
    const source = metadata.boosterSource;
    if(source)endpoint.autopilot.boosterSource = source;
    verifyBoosterSource(endpoint, interval);
    policy(endpoint, interval, model);
  }, SUPER_HEAVY);
  return next;
}
function seed(s: SimState): void {
  ensureBoosterSource(s);
  expect(advanceBoosterSource(s, dt, advance, policy, SUPER_HEAVY)).toBe(1);
}

describe('continuing booster source provenance (not candidate accuracy)', () => {
  it('allows modeled continuous warming and checks the pre-policy phase', () => {
    let s = live(); seed(s);
    const id = s.autopilot.boosterSource!.lineageId;
    for (let i=0;i<8;i++) {
      s = returned(s);
      expect(s.autopilot.boosterSource!.valid).toBe(true);
      expect(s.autopilot.boosterSource!.lineageId).toBe(id);
      advanceBoosterSource(s, dt, advance, policy, SUPER_HEAVY);
    }
    expect(s.damage!.components[rootIndex]!.root.temperature).toBeGreaterThan(live().damage!.components[rootIndex]!.root.temperature);
  });

  it('revokes equal-epoch consistent thermal tampering before cutoff', () => {
    let s = live(); seed(s); s = returned(s);
    s.autopilot.boosterReturnPlan = { originTime:0, shutdownAt:dt, coastPitch:rad(0),
      damageRevision:s.damage!.revision, sourceLineage:s.autopilot.boosterSource!.lineageId,
      handoff:{x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true} };
    // Issue plan metadata at its actual poststep phase, then perturb physical heat.
    advanceBoosterSource(s, dt, advance, policy, SUPER_HEAVY);
    warm(s, 1);
    const next = returned(s);
    expect(next.damage!.revision).toBe(s.damage!.revision);
    expect(next.autopilot.boosterSource!.valid).toBe(false);
    expect(next.autopilot.boosterReturnPlan).toBeUndefined();
    expect(next.autopilot.boosterPhase).toBe('boostback');
  });

  it('replays explicit poststep metadata events without copying mechanics', () => {
    let s = live(); seed(s);
    s = returned(s);
    const source = s.autopilot.boosterSource!;
    const physical = cloneBoosterMechanics(source.returned);
    s.autopilot.boosterFallTime = 60;
    advanceBoosterSource(s, dt, advance, policy, SUPER_HEAVY);
    expect(s.autopilot.boosterSource!.event.phase).toBe('post-step');
    expect(s.autopilot.boosterSource!.event.time).toBe(s.world.environmentTime);
    expect(s.autopilot.boosterSource!.event.sequence).toBeGreaterThan(source.event.sequence);
    expect(physical.damage).toEqual(source.returned.damage);
    s = returned(s);
    expect(s.autopilot.boosterSource!.valid).toBe(true);
    expect(s.vehicle.throttle).toBe(30);
  });

  it('keeps the same lineage after accepted plan and job completion', () => {
    let s = live(); seed(s); s = returned(s);
    const id = s.autopilot.boosterSource!.lineageId;
    s.autopilot.boosterReturnPlan = { originTime:0, shutdownAt:10, coastPitch:rad(0),
      damageRevision:s.damage!.revision, sourceLineage:id,
      handoff:{x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true} };
    advanceBoosterSource(s, dt, advance, policy, SUPER_HEAVY);
    s = returned(s); ensureBoosterSource(s);
    expect(s.autopilot.boosterSource!.lineageId).toBe(id);
    expect(s.autopilot.boosterReturnPlan!.sourceLineage).toBe(id);
  });

  it('deep-clones finite observer children without nested jobs or observers', () => {
    const s = live(); seed(s); const copy = cloneState(s);
    expect(copy.autopilot.boosterSource).not.toBe(s.autopilot.boosterSource);
    expect(copy.autopilot.boosterSource!.expected!.damage).not.toBe(s.autopilot.boosterSource!.expected!.damage);
    expect(copy.autopilot.boosterSource!.returned.damage).not.toBe(s.autopilot.boosterSource!.returned.damage);
    expect(copy.autopilot.boosterSource!.returned.autopilot.boosterSource).toBeUndefined();
    expect(copy.autopilot.boosterSource!.expected!.autopilot.boosterPrediction).toBeUndefined();
    warm(copy.autopilot.boosterSource!.expected!, 1);
    expect(copy.autopilot.boosterSource!.expected!.damage).not.toEqual(s.autopilot.boosterSource!.expected!.damage);
  });

  it('detects physical RNG divergence at equal topology', () => {
    const s = live(); seed(s); s.rng.counters.ignitionDelay++;
    const next = returned(s);
    expect(next.autopilot.boosterSource!.valid).toBe(false);
  });

  it('rejects an unverified calculator plan in actual policy', () => {
    const s = live();
    s.autopilot.boosterReturnPlan = { originTime:0,shutdownAt:dt,coastPitch:rad(0),damageRevision:0,
      handoff:{x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true} };
    expect(verifyBoosterSource(s,dt)).toBe(false);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });

  it('keeps a rejected pending lineage sticky until bounded work finishes, then starts a distinct source', () => {
    let s = live(); ensureBoosterSource(s);
    advanceBoosterPrediction(s,dt,advance,policy,SUPER_HEAVY);
    advanceBoosterSource(s,dt,advance,policy,SUPER_HEAVY);
    const oldSource=s.autopilot.boosterSource!,id=oldSource.lineageId;
    warm(s,1); s=returned(s);
    expect(s.autopilot.boosterSource!.valid).toBe(false);
    ensureBoosterSource(s);
    expect(s.autopilot.boosterSource!.lineageId).toBe(id);
    expect(s.autopilot.boosterPrediction!.sourceLineage).toBe(id);
    s.autopilot.boosterPrediction={...s.autopilot.boosterPrediction!,done:true};
    const rejected=s.autopilot.boosterSource!;
    ensureBoosterSource(s);
    expect(s.autopilot.boosterSource!.lineageId).toBe(id+1);
    expect(s.autopilot.boosterSource!.valid).toBe(true);
    expect(rejected.valid).toBe(false);
    expect(oldSource.returned.damage).not.toEqual(s.damage);
  });

  it('rejects duplicate or wrong-phase poststep advancement', () => {
    const s=live();seed(s);
    expect(advanceBoosterSource(s,dt,advance,policy,SUPER_HEAVY)).toBe(0);
    expect(s.autopilot.boosterSource!.valid).toBe(false);
  });

  it('deep owns every observer object and freezes issued event/plan metadata', () => {
    const s=live();seed(s);const next=returned(s);
    next.autopilot.boosterReturnPlan={originTime:0,shutdownAt:10,coastPitch:rad(0),damageRevision:0,
      sourceLineage:next.autopilot.boosterSource!.lineageId,
      handoff:{x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true}};
    advanceBoosterSource(next,dt,advance,policy,SUPER_HEAVY);
    const copy=cloneState(next);
    function owned(a:unknown,b:unknown):void {
      if(a===null || typeof a!=='object')return;
      expect(b).not.toBe(a);
      for(const key in a)owned((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key]);
    }
    owned(next.autopilot.boosterSource,copy.autopilot.boosterSource);
    expect(Object.isFrozen(copy.autopilot.boosterSource!.event)).toBe(true);
    expect(Object.isFrozen(copy.autopilot.boosterSource!.event.plan!.handoff)).toBe(true);
    expect(()=>JSON.stringify(copy.autopilot.boosterSource)).not.toThrow();
  });

  it('retains at most four total actual observer plus search advances', () => {
    let s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
    s.autopilot.autoLandOn=true;
    let work=0;
    const counted:MechanicalAdvance=(...args)=>{work++;return advanceMechanics(...args);};
    for(let tick=0;tick<6;tick++) {
      s=advanceMechanics(s,dt,(endpoint,interval,model)=>runBoosterAutopilot(endpoint,interval,model,counted),SUPER_HEAVY);
      const before=work;
      runBoosterPostStep(s,dt,SUPER_HEAVY,counted);
      expect(work-before).toBeLessThanOrEqual(4);
      expect(s.autopilot.boosterSource!.valid).toBe(true);
    }
  });

  it('actual flight rejects a calculator cutoff before the policy can coast', () => {
    const s=live();s.autopilot.boosterRangeError=1000;
    s.autopilot.boosterReturnPlan={originTime:0,shutdownAt:dt,coastPitch:rad(0),damageRevision:0,
      handoff:{x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true}};
    const next=step(s,dt,{},SUPER_HEAVY);
    expect(next.autopilot.boosterReturnPlan).toBeUndefined();
    expect(next.autopilot.boosterPhase).toBe('boostback');
  });

  it('does not attach an observer to historical null-damage states', () => {
    const s = live(); s.damage = null;
    ensureBoosterSource(s);
    expect(advanceBoosterSource(s,dt,advance,policy,SUPER_HEAVY)).toBe(0);
    expect(s.autopilot.boosterSource).toBeUndefined();
  });
});


describe('source provenance on actual evolving mechanics', () => {
  it.each(['booster-sep','rtls'])('keeps expected warming and publishes a future cutoff for %s', id => {
    let state = createScenarioVehicle(PRESETS.find(p=>p.id===id)!,123).state;
    state.autopilot.autoLandOn = true;
    let plan: typeof state.autopilot.boosterReturnPlan;
    let calls=0;
    for (let i=0;i<10000 && !plan && !state.status.landed && !state.failures.inFlightBreakUp && !state.failures.crashed;i++) {
      state=step(state,dt,{},SUPER_HEAVY); calls++;
      const source=state.autopilot.boosterSource;
      // A correctly predicted next-step terminal event has no policy callback.
      // It revokes provenance; the required future-plan acceptance still fails.
      if(source && !source.valid && source.returned.damage?.terminal.active) {
        expect(source.expected).toBeUndefined();
        break;
      }
      expect(source?.valid, `source ${id} tick${i}`).toBe(true);
      plan=state.autopilot.boosterReturnPlan;
    }
    expect(plan,JSON.stringify({id,calls,receipt:state.world.environmentTime,
      predictedTerminal:state.autopilot.boosterSource?.returned.damage?.terminal,
      stage:state.autopilot.boosterPrediction?.stage,iterations:state.autopilot.boosterPrediction?.iterations})).toBeDefined();
    expect(plan!.shutdownAt).toBeGreaterThan(state.world.environmentTime);
    expect(plan!.sourceLineage).toBe(state.autopilot.boosterSource!.lineageId);
    expect(state.autopilot.boosterPrediction!.rollout.state.status.landed).toBe(true);
    expect(state.autopilot.boosterPrediction!.rollout.state.status.onTheGround).toBe(false);
    console.log(JSON.stringify({id,calls,receipt:state.world.environmentTime,shutdown:plan!.shutdownAt}));
  });
});
