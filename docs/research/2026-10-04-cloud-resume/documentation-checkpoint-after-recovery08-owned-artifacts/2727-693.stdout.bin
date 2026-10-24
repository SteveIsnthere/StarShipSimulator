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
  it('retains provenance authority while omitting owned observer futures and paid queues',()=>{
    const s=boosterSpecs[0]!.build().state;
    s.autopilot.boosterSource={lineageId:7,revision:0,originTime:1,valid:false,checked:true,
      expectedDt:1/120,returned:s,expected:s,receipts:{chunks:[[{input:s,returned:s}]]},
      event:{phase:'post-step',time:2,sequence:3,rangeError:4,fallTime:5}} as unknown as NonNullable<typeof s.autopilot.boosterSource>;
    const sample=boosterSample(s);
    expect(sample['autopilot.boosterSource.lineageId']).toBe(7);
    expect(sample['autopilot.boosterSource.valid']).toBe(false);
    expect(sample['autopilot.boosterSource.checked']).toBe(true);
    expect(sample['autopilot.boosterSource.event.rangeError']).toBe(4);
    expect(Object.keys(sample).some(key=>key.startsWith('autopilot.boosterSource.returned')
      ||key.startsWith('autopilot.boosterSource.expected.')
      ||key.startsWith('autopilot.boosterSource.receipts.'))).toBe(false);
    expect(sample['damage.components[0].attached']).toBe(true);
    expect(s.autopilot.boosterSource!.returned).toBe(s);
  });

});
