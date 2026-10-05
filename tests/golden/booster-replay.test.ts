/** Additional actual Super Heavy regressions; all eight Ship tests stay intact. */
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import { step } from '$core/step';
import { CATCH } from '$core/vehicles/super-heavy';
import * as C from '$core/constants';
import { boosterSpecs,boosterSample } from './booster-record';
import { deserialise,samplesOf,GOLDEN_DT,SAMPLE_EVERY,type Sample } from './record';
import { matches } from './compare';

const DIR=fileURLToPath(new URL('./fixtures/booster/',import.meta.url));
// P8.R1/R2 Fidelity: both actual V3 booster captures recorded with all eight
// Ship fixtures on Linux x86-64 / Node22. Whole-file digests, not rows hashes.
// Recording success is separate from the unchanged full replay assertions below.
const DIGESTS:Readonly<Record<string,string>>={
  'booster-sep-catch':'845da274d0e59758fabebf57e734c28ce1f8276ccc33fa33452f59bc3e912e33',
  'rtls-catch':'a20123bb78d3fdf77affd26e2140e142247d07d13319786f2673e1a5a62d9bb9',
};
function compare(actual:Sample,expected:Sample,label:string):void {
  // Absent optional phase/decision leaves are explicitly undefined in the
  // union columns. Any newly introduced live field must still fail the shape.
  expect(Object.keys(actual).filter(key=>!(key in expected)),label).toEqual([]);
  for(const [key,value] of Object.entries(expected))
    assert.strictEqual(matches(actual[key],value),true,`${label}: ${key}=${String(actual[key])}, expected ${String(value)}`);
}
describe('actual booster capture golden regressions',()=>{
  it('has exactly the two declared recordings and discriminating immutable digests',()=>{
    expect(readdirSync(DIR).sort()).toEqual(boosterSpecs.map(s=>`${s.id}.json`).sort());
    expect(Object.keys(DIGESTS).sort()).toEqual(boosterSpecs.map(s=>s.id).sort());
    for(const spec of boosterSpecs) {
      const raw=readFileSync(`${DIR}${spec.id}.json`,'utf8');
      expect(createHash('sha256').update(raw).digest('hex')).toBe(DIGESTS[spec.id]);
      expect(createHash('sha256').update(raw+' ').digest('hex')).not.toBe(DIGESTS[spec.id]);
    }
  });
  it.each(boosterSpecs)('$id replays all physical state/control leaves through an airborne catch',spec=>{
    const golden=deserialise(readFileSync(`${DIR}${spec.id}.json`,'utf8')),samples=samplesOf(golden);
    expect(golden.scenario).toBe(spec.id);expect(golden.steps).toBe(spec.steps);
    expect(golden.dt).toBe(GOLDEN_DT);expect(golden.sampleEvery).toBe(SAMPLE_EVERY);
    expect(samples).toHaveLength(spec.steps/SAMPLE_EVERY+1);
    const flight=spec.build(),vehicle=flight.vehicle;
    let state=flight.state,index=0;
    compare(boosterSample(state),samples[index++]!,`${spec.id} initial`);
    for(let i=1;i<=spec.steps;i++) {
      state=step(state,GOLDEN_DT,{},vehicle);
      if(i%SAMPLE_EVERY===0)compare(boosterSample(state),samples[index++]!,`${spec.id} step${i}`);
    }
    expect(index).toBe(samples.length);
    expect(state.status.landed).toBe(true);expect(state.status.onTheGround).toBe(false);
    expect(state.vehicle.propellantMass).toBeGreaterThan(0);
    expect(Object.values(state.failures).some(Boolean)).toBe(false);
    expect(Math.abs(state.kinematics.pitch)).toBeLessThanOrEqual(CATCH.maxPitch);
    expect(Math.abs(state.kinematics.downRangeDistance+(CATCH.lugStation-vehicle.height/2)*Math.sin(state.kinematics.pitch)-C.starBaseXPos)).toBeLessThanOrEqual(CATCH.halfWidth);
    expect(state.kinematics.altitude+(CATCH.lugStation-vehicle.height/2)*Math.cos(state.kinematics.pitch)).toBe(CATCH.planeAltitude);
  });
});
