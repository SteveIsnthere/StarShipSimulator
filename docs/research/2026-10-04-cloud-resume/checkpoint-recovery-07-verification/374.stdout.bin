/** Numerical optimization witness. The original48-step inverse is preserved
 * here before production changes; its exact output is the acceptance contract. */
import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { MATERIAL_MIN_K, MATERIAL_REFERENCE_K, MATERIAL_MAX_K,
  steelSpecificEnthalpy as enthalpy, steelTemperatureFromEnthalpy as inverse } from '$core/physics/damage-material';

const minimum = enthalpy(MATERIAL_MIN_K), maximum = enthalpy(MATERIAL_MAX_K);
function originalInverse(energy:number):number {
  if (!Number.isFinite(energy) || energy < minimum || energy > maximum) throw new RangeError('Outside source domain');
  if (energy === 0) return MATERIAL_REFERENCE_K;
  if (energy === minimum) return MATERIAL_MIN_K;
  if (energy === maximum) return MATERIAL_MAX_K;
  let lower = MATERIAL_MIN_K, upper = MATERIAL_MAX_K;
  for (let iteration=0;iteration<48;iteration++) {
    const middle=(lower+upper)/2;
    if (enthalpy(middle)<energy) lower=middle; else upper=middle;
  }
  return (lower+upper)/2;
}
const bits=new DataView(new ArrayBuffer(8));
function next(value:number,up:boolean):number {
  if(value===0)return up?Number.MIN_VALUE:-Number.MIN_VALUE;
  bits.setFloat64(0,value);
  bits.setBigUint64(0,bits.getBigUint64(0)+(up===(value>0)?1n:-1n));
  return bits.getFloat64(0);
}
const energies:number[]=[];
for(let index=0;index<=30000;index++) {
  const temperature=4+(1473.15-4)*index/30000;
  energies.push(enthalpy(temperature));
  energies.push(minimum+(maximum-minimum)*index/30000);
}
for(let index=0;index<=4307;index++) {
  const temperature=Math.min(273.15,4+index*.0625), energy=enthalpy(temperature);
  energies.push(energy);
  for(const t of [next(temperature,false),next(temperature,true)]) {
    if(t>=4 && t<=1473.15)energies.push(enthalpy(t));
  }
  for(const direction of [false,true]) {
    const adjacent=next(energy,direction);
    if(adjacent>=minimum && adjacent<=maximum)energies.push(adjacent);
  }
}
for(const temperature of [4,273.15,293.15,373.15,1073.15,1173.15,1473.15]) {
  for(const t of [next(temperature,false),temperature,next(temperature,true)]) {
    if(t>=4 && t<=1473.15)energies.push(enthalpy(t));
  }
}
// Original-tree branch boundaries exercise certificates, not just the real
// material curve. Neighbouring representable energies expose plateaus and
// cancellation around the cold table, bridge and zero-energy reference.
for (const temperature of [4.001, 4.0625, 4.137, 186, 273.125, 273.15, 283.15,
  293.149999, 293.15, 293.150001, 373.15, 1073.15, 1473.149]) {
  let lower = MATERIAL_MIN_K, upper = MATERIAL_MAX_K;
  for (let depth = 1; depth <= 48; depth++) {
    const middle = (lower + upper) / 2;
    if ([39, 40, 41, 47, 48].includes(depth)) {
      const energy = enthalpy(middle);
      energies.push(next(energy, false), energy, next(energy, true));
    }
    if (middle < temperature) lower = middle; else upper = middle;
  }
}
for (let exponent = -50; exponent <= 12; exponent++) {
  for (const sign of [-1, 1]) energies.push(sign * 2 ** exponent);
}
energies.sort((a,b)=>a-b);

describe('certified steel enthalpy inversion',()=>{
  it('reproduces the original48 bisection bits over dense full-domain and cell boundaries',()=>{
    let previous=4;
    for(const energy of energies) {
      const actual=inverse(energy);
      expect(actual).toBe(originalInverse(energy));
      expect(actual).toBeGreaterThanOrEqual(previous);
      previous=actual;
    }
    expect(energies.length).toBeGreaterThan(72000);
  });

  it('retains the original roundtrip uncertainty and all domain endpoints',()=>{
    const originalWidth=(1473.15-4)/2**48;
    for(let index=0;index<=10000;index++) {
      const temperature=293.15+(1473.15-293.15)*index/10000;
      const actual=inverse(enthalpy(temperature));
      // Original rounding: each halving adds <=one temperature ULP; its
      // geometric sum adds <=twoULPs plus final-midpoint halfULP.
      const rounding=3*2**(Math.floor(Math.log2(temperature))-52);
      expect(Math.abs(actual-temperature)).toBeLessThanOrEqual(originalWidth+rounding);
    }
    for(const energy of [next(minimum,false),next(maximum,true),NaN,Infinity,-Infinity])
      expect(()=>inverse(energy)).toThrow(RangeError);
    expect(inverse(minimum)).toBe(4);
    expect(inverse(0)).toBe(293.15);
    expect(inverse(maximum)).toBe(1473.15);
  });

  it.skipIf(process.env['MATERIAL_INVERSE_BENCH']!=='1')('reports warmed cost without a wall-time assertion',()=>{
    const inputs=Array.from({length:20000},(_,i)=>enthalpy(4+(1473.15-4)*(i+.5)/20000));
    for(const run of [originalInverse,inverse])for(const input of inputs)run(input);
    const measure=(run:(energy:number)=>number)=>{
      let checksum=0;const start=performance.now();
      for(let repeat=0;repeat<10;repeat++)for(const input of inputs)checksum+=run(input);
      return {milliseconds:performance.now()-start,calls:inputs.length*10,checksum};
    };
    process.stdout.write(JSON.stringify({original48:measure(originalInverse),production:measure(inverse)})+'\n');
  });
});
