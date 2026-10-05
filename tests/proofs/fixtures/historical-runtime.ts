/** Test-harness adapters for preserved R2 arithmetic. Model arguments are
 * explicit; the only constructor schema adaptation is damage:null. This is
 * not a production historical mode and never substitutes for active V3 tests. */
import { createInitialState as currentInitial, type SimState } from '$core/state';
import { runAutopilot as currentAutopilot } from '$core/autopilot';
import { controlTranslation as currentTranslation } from '$core/control/actuation';
import { HISTORICAL_SHIP } from '../../reference/historical-vehicles';
export * from '$core/control/actuation';
export function createInitialState(seed?:number):SimState {
  const state=currentInitial(seed,HISTORICAL_SHIP);
  state.damage=null;
  return state;
}
export function runAutopilot(state:SimState,dt:number):void {
  currentAutopilot(state,dt,HISTORICAL_SHIP);
}
export function controlTranslation(state:SimState,pitch:number,dt:number):void {
  currentTranslation(state,pitch,dt,HISTORICAL_SHIP);
}
