/** Numeric root proposals are not flight commands. Only a source-matched,
 * physically validated, still-future paid candidate can become a command. */
import type { Rad } from '../units';
import type { SimState, AutopilotState } from '../state';
import type { BoosterForecast } from './booster-forecast';

export interface BoosterBurnCandidate {
  /** Absent only for the historical no-damage model. */
  damageRevision?:number;
  /** Continuing live-source provenance; absent on calculator/historical candidates. */
  sourceLineage?:number;
  originTime:number;
  burnDuration:number;
  shutdownAt:number;
  coastPitch:Rad;
  forecast:BoosterForecast;
}
export interface BoosterReturnPlan {
  damageRevision?:number;
  /** Continuing live-source provenance; absent on calculator/historical candidates. */
  sourceLineage?:number;
  originTime:number;
  shutdownAt:number;
  coastPitch:Rad;
  handoff:NonNullable<BoosterForecast['handoff']>;
}
/** A manual command no longer follows the source's forecast control history.
 * Pending work and accepted cutoff authority must both be invalidated. */
export function invalidateBoosterReturn(autopilot:AutopilotState):void {
  delete autopilot.boosterPrediction;
  delete autopilot.boosterReturnPlan;
}
/** Topology is a source epoch, not a continuously changing temperature stamp.
 * Check before policy so an old accepted shutdown cannot execute this interval. */
export function invalidateStaleBoosterReturn(state:SimState):boolean {
  const a=state.autopilot, revision=state.damage?.revision;
  const staleJob=a.boosterPrediction && a.boosterPrediction.origin.damage?.revision!==revision;
  const stalePlan=a.boosterReturnPlan && a.boosterReturnPlan.damageRevision!==revision;
  if(!staleJob && !stalePlan)return false;
  invalidateBoosterReturn(a);
  delete a.boosterCoastPitch;
  delete a.boosterForecastReached;
  delete a.boosterRangeError;
  delete a.boosterFallTime;
  return true;
}
function valid(candidate:BoosterBurnCandidate):boolean {
  const f=candidate.forecast;
  return f.reached && !f.failed && f.fuel>0 && f.handoff!==undefined
    && Number.isFinite(f.rangeError) && Number.isFinite(candidate.shutdownAt)
    && Number.isFinite(candidate.burnDuration) && candidate.burnDuration>=0;
}
export function proposeBoosterBurn(low:BoosterBurnCandidate,high:BoosterBurnCandidate):number|undefined {
  if(!valid(low) || !valid(high) || low.originTime!==high.originTime || low.damageRevision!==high.damageRevision || low.sourceLineage!==high.sourceLineage
    || low.coastPitch!==high.coastPitch || high.burnDuration<=low.burnDuration
    || low.forecast.rangeError*high.forecast.rangeError>=0)return undefined;
  const weight=low.forecast.rangeError/(low.forecast.rangeError-high.forecast.rangeError);
  return low.burnDuration+(high.burnDuration-low.burnDuration)*weight;
}
/** A same-source response may propose a further paid interior before a bracket
 * exists. It is never a bracket endpoint, transported slope or cutoff command. */
export function proposeBoosterProbe(first:BoosterBurnCandidate,second:BoosterBurnCandidate,upperDuration:number,lowerDuration=0):number|undefined {
  if(!valid(first) || !valid(second) || first.originTime!==second.originTime || first.damageRevision!==second.damageRevision || first.sourceLineage!==second.sourceLineage
    || first.coastPitch!==second.coastPitch || first.burnDuration===second.burnDuration
    || first.forecast.rangeError*second.forecast.rangeError<=0)return undefined;
  const change=second.forecast.rangeError-first.forecast.rangeError;
  const proposed=second.burnDuration-second.forecast.rangeError*(second.burnDuration-first.burnDuration)/change;
  // Continue only in the measured sampling direction, strictly inside the
  // retained available interval. Both signs share the same source/validity law.
  const continues=second.burnDuration>first.burnDuration
    ?proposed>second.burnDuration:proposed<second.burnDuration;
  return Number.isFinite(proposed) && continues && proposed>lowerDuration && proposed<upperDuration?proposed:undefined;
}
export function acceptBoosterReturnPlan(candidate:BoosterBurnCandidate,terminalValidated:boolean,now:number):BoosterReturnPlan|undefined {
  if(!valid(candidate) || !terminalValidated || !candidate.forecast.handoff!.lateralFeasible
    || candidate.shutdownAt<=now)return undefined;
  return {originTime:candidate.originTime,shutdownAt:candidate.shutdownAt,
    ...(candidate.damageRevision===undefined?{}:{damageRevision:candidate.damageRevision}),
    ...(candidate.sourceLineage===undefined?{}:{sourceLineage:candidate.sourceLineage}),
    coastPitch:candidate.coastPitch,handoff:{...candidate.forecast.handoff!}};
}

/** A local measured response proposes work only; the valid sign bracket remains
 * the authority and bounds. */
export function proposeBoosterRefinement(previous:BoosterBurnCandidate,current:BoosterBurnCandidate,low:BoosterBurnCandidate,high:BoosterBurnCandidate):number|undefined {
  if(proposeBoosterBurn(low,high)===undefined || !valid(previous) || !valid(current)
    || previous.originTime!==current.originTime || previous.damageRevision!==current.damageRevision || previous.sourceLineage!==current.sourceLineage
    || current.damageRevision!==low.damageRevision || current.sourceLineage!==low.sourceLineage || current.originTime!==low.originTime
    || previous.coastPitch!==current.coastPitch || current.coastPitch!==low.coastPitch
    || previous.burnDuration===current.burnDuration)return undefined;
  const change=current.forecast.rangeError-previous.forecast.rangeError;
  const proposed=current.burnDuration-current.forecast.rangeError
    *(current.burnDuration-previous.burnDuration)/change;
  return Number.isFinite(proposed) && proposed>low.burnDuration && proposed<high.burnDuration
    ?proposed:undefined;
}
