/** The cheap bound may skip only an exact stopping-distance calculation that
 * provably cannot trigger a burn. No substitute physical model. */
import { describe,expect,it } from 'vitest';
import { conservativeBurnStartAltitude,landingBurnStartAltitude,createBurnScratch } from '$core/control/guidance-physics';
import { SUPER_HEAVY,CATCH } from '$core/vehicles/super-heavy';

describe('conservative booster burn trigger bound',()=>{
  it('contains the full physical burn predictor across descent and mass boundaries',()=>{
    const scratch=createBurnScratch();let finite=0,tooHeavy=0;
    for(const mass of [200000,250000,276000,300000,400000,450000,500000,700000]) {
      for(const speed of [2,20,40,100,200,500,700,1000]) {
        const bound=conservativeBurnStartAltitude(3,mass,speed,CATCH.bodyCentreAltitude);
        const exact=landingBurnStartAltitude(3,mass,speed,CATCH.bodyCentreAltitude,scratch,SUPER_HEAVY);
        if(exact!==null){expect(bound,JSON.stringify({mass,speed,exact})).toBeGreaterThanOrEqual(exact);finite++;}
        if(bound===Infinity)tooHeavy++;
      }
    }
    expect(finite).toBeGreaterThan(20);expect(tooHeavy).toBeGreaterThan(0);
  });
  it('allows skipping far above a feasible burn but keeps the exact calculation near the trigger',()=>{
    const bound=conservativeBurnStartAltitude(3,300000,100,CATCH.bodyCentreAltitude);
    expect(bound).toBeGreaterThan(450);expect(bound).toBeLessThan(500);
    expect(10000>bound).toBe(true);expect(400>bound).toBe(false);
    expect(conservativeBurnStartAltitude(0,300000,100,CATCH.bodyCentreAltitude)).toBe(Infinity);
  });
});
