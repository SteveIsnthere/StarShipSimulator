/** Additional actual-booster recordings; the eight Ship baselines remain intact.
 * Sparse phase/decision fields form a union of live keys. Future work snapshots
 * are covered by exact planner tests rather than duplicated in every sample. */
import { PRESETS,createScenarioVehicle } from '$core/scenarios';
import type { SimState } from '$core/state';
import { flattenState,record,type Sample,type Golden } from './record';

export const boosterSpecs=['booster-sep','rtls'].map(id=>({
  id:`${id}-catch`,steps:900*120,setup:'actual Super Heavy autoLand through tower capture',
  build:()=>{const flight=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);flight.state.autopilot.autoLandOn=true;return flight;},
}));
export function boosterSample(state:SimState):Sample {
  const autopilot={...state.autopilot};delete autopilot.boosterPrediction;
  if (autopilot.boosterSource) {
    // Keep lineage, validity and issued policy events. Owned future snapshots
    // and paid receipt queues are checked by exact source-provenance tests; like
    // the search job, they are not another live trajectory to record here.
    const source:Record<string,unknown>={...autopilot.boosterSource};
    delete source.returned;delete source.expected;delete source.receipts;
    return flattenState({...state,autopilot:{...autopilot,boosterSource:source}});
  }
  return flattenState({...state,autopilot});
}
export function recordBooster(spec:typeof boosterSpecs[number]):Golden {
  const flight=spec.build();
  return record(spec.id,flight.state,spec.steps,spec.setup,{model:flight.vehicle,sample:boosterSample,unionKeys:true});
}
