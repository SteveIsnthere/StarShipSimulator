/** Historical reference cohorts, exercised through the current shared physics.
 * Not imported by production. Values retain the pre-V3 source conditions;
 * this is not an alternative live simulator or a replacement for V3 probes. */
import * as C from '$core/constants';
import type { VehicleDefinition } from '$core/vehicle';
import type { PropulsionProfile } from '$core/physics/propulsion';
import { LOX_DENSITY, CH4_DENSITY, OXIDISER_SHARE } from '$core/vehicle';

export const RAPTOR2: PropulsionProfile = Object.freeze({
  standardGravity: C.standardGravity,
  referencePressurePa: C.SEA_LEVEL_PRESSURE_PA,
  seaLevel: Object.freeze({thrustSeaLevel:C.RAPTOR_THRUST_SEA_LEVEL,ispSeaLevel:C.RAPTOR_ISP_SEA_LEVEL,ispVacuum:C.RAPTOR_ISP_VACUUM}),
  vacuum: Object.freeze({thrustVacuum:C.RVAC_THRUST_VACUUM,ispVacuum:C.RVAC_ISP_VACUUM,effectiveExitArea:C.RVAC_EXIT_AREA}),
});
function tanks(capacity:number,bottom:number) {
  const area=Math.PI*(9/2)**2;
  const loxTankHeight=capacity*OXIDISER_SHARE/(LOX_DENSITY*area);
  return {tankBottom:bottom,loxTankHeight,ch4TankHeight:capacity*(1-OXIDISER_SHARE)/(CH4_DENSITY*area),ch4TankBottom:bottom+loxTankHeight};
}
export const HISTORICAL_SHIP: VehicleDefinition=Object.freeze({
  id:'ship',propulsion:RAPTOR2,height:50,diameter:9,dryMass:120000,
  propellantCapacity:1200000,initialPropellant:350000,dryCentreOfMass:21.8,
  ...tanks(1200000,5),aftFinStation:21.8-12.6,frontFinStation:21.8+23.3,rcsStation:41.8,
  minArea:C.vehicleMinArea,maxArea:450,frontFinArea:24.2,aftFinArea:45.8,
  engines:C.RAPTORS,ignitionGroup:C.SEA_LEVEL_RAPTORS,
});
const mount=(offAxis:number,gimballed:boolean):C.RaptorMount=>Object.freeze({kind:'sea-level',offAxis,gimballed,offAxisForceFraction:0});
const ring=(count:number,radius:number,gimballed:boolean)=>Array.from({length:count},(_,i)=>mount(radius*Math.cos(2*Math.PI*i/count),gimballed));
export const HISTORICAL_SUPER_HEAVY: VehicleDefinition=Object.freeze({
  id:'super-heavy',propulsion:RAPTOR2,height:71,diameter:9,dryMass:200000,
  propellantCapacity:3400000,initialPropellant:500000,dryCentreOfMass:35.5,
  ...tanks(3400000,3),aftFinStation:66,frontFinStation:66,rcsStation:66,
  minArea:Math.PI*(9/2)**2,maxArea:71*9,frontFinArea:0,aftFinArea:0,
  engines:Object.freeze([mount(0,true),mount(-.65,true),mount(.65,true),...ring(10,2,true),...ring(20,3.8,false)]),
  ignitionGroup:Object.freeze(Array.from({length:13},(_,i)=>i)),
  gridFins:Object.freeze({count:4,area:24,station:66,maxAngle:Math.PI/4}),
});
