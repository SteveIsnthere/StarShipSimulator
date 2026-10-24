/** Source-local force-only sensitivity is a proposal, never a paid handoff. */
import type {SimState} from '../state';
import type {VehicleDefinition} from '../vehicle';
import type {BoosterBurnCandidate} from './booster-return-plan';
import {executableBoosterBurnDuration} from './booster-forecast';
export interface BoosterCutoffScore {duration:number;range:number;origin:SimState;model:VehicleDefinition}
export function proposeBoosterCutoffHint(c:BoosterBurnCandidate,low:BoosterCutoffScore,high:BoosterCutoffScore,lower:number,upper:number):number|undefined {
  if(!c.forecast.reached || c.forecast.failed || c.forecast.fuel<=0 || !c.forecast.handoff
    || low.origin!==high.origin || low.model!==high.model || low.origin.world.environmentTime!==c.originTime
    || low.origin.damage?.revision!==c.damageRevision || !Number.isFinite(low.range) || !Number.isFinite(high.range)
    || !(low.duration<c.burnDuration && high.duration>c.burnDuration))return undefined;
  const derivative=(high.range-low.range)/(high.duration-low.duration);
  const proposed=c.burnDuration-c.forecast.rangeError/derivative;
  if(!Number.isFinite(derivative) || derivative===0 || !Number.isFinite(proposed))return undefined;
  const duration=executableBoosterBurnDuration(proposed);
  return duration>lower && duration<upper && duration!==c.burnDuration?duration:undefined;
}
