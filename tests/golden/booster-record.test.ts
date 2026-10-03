import { describe,expect,it } from 'vitest';
import { createScenarioVehicle,PRESETS } from '$core/scenarios';
import { boosterSample,boosterSpecs } from './booster-record';
import { flattenState } from './record';

describe('actual booster golden contract',()=>{
  it('records the actual selected-model starts and preserves all live physical leaves',()=>{
    expect(boosterSpecs.map(s=>s.id)).toEqual(['booster-sep-catch','rtls-catch']);
    for(const spec of boosterSpecs) {
      const flight=spec.build();expect(flight.vehicle.id).toBe('super-heavy');
      expect(flight.state.engines.running).toHaveLength(33);
      expect(flight.state.autopilot.autoLandOn).toBe(true);expect(spec.steps).toBe(900*120);
      const sample=boosterSample(flight.state);
      expect(sample).toEqual(flattenState(flight.state));
      expect(sample['engines.running[32]']).toBe(false);
      expect(sample['vehicle.rcsRunTimeRemaining']).toBe(25);
    }
  });
  it('excludes only owned future work, retaining physical controls and optional selected decisions',()=>{
    const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!).state;
    s.autopilot.boosterPhase='terminal';s.autopilot.boosterArrivalTime=2;
    s.autopilot.boosterPrediction={origin:s} as never;
    const expected={...s,autopilot:{...s.autopilot}};delete expected.autopilot.boosterPrediction;
    expect(boosterSample(s)).toEqual(flattenState(expected));
    expect(boosterSample(s)['autopilot.boosterPhase']).toBe('terminal');
    expect(boosterSample(s)['autopilot.boosterArrivalTime']).toBe(2);
  });
});
