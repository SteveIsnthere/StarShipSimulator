/** Historical Raptor2 / four-fin booster cohort, matching the retained Ship.
 * FAA https://www.faa.gov/media/94371 PDF108:71m x9m;PDF230:3400t.
 * SpaceX https://www.spacex.com/updates/reusability:33 engines,13 return,3 terminal.
 * Dry mass, stations, ring projections and catch layout are declared TierB
 * engineering approximations, never manufacturer limits. See Phase7 plan. */
import type { RaptorMount } from '../constants';
import { LOX_DENSITY, CH4_DENSITY, OXIDISER_SHARE, type VehicleDefinition } from '../vehicle';

export const CENTRE_ENGINES: readonly number[] = Object.freeze([0,1,2]);
export const RETURN_ENGINES: readonly number[] = Object.freeze(Array.from({length:13},(_,i)=>i));
const HEIGHT=71, DIAMETER=9, CAPACITY=3_400_000, TANK_BOTTOM=3;
const area=Math.PI*(DIAMETER/2)**2;
const loxHeight=CAPACITY*OXIDISER_SHARE/(LOX_DENSITY*area);
const ch4Height=CAPACITY*(1-OXIDISER_SHARE)/(CH4_DENSITY*area);
const mount=(offAxis:number,gimballed:boolean):RaptorMount=>Object.freeze({
  kind:'sea-level', offAxis, gimballed,
  // Booster torque is evaluated from physical axial thrust and this offset.
  offAxisForceFraction:0,
});
const ring=(count:number,radius:number,gimballed:boolean)=>Array.from({length:count},(_,i)=>
  mount(radius*Math.cos(2*Math.PI*i/count),gimballed));
export const SUPER_HEAVY: VehicleDefinition=Object.freeze({
  id:'super-heavy',height:HEIGHT,diameter:DIAMETER,dryMass:200_000,
  propellantCapacity:CAPACITY,initialPropellant:500_000,dryCentreOfMass:HEIGHT/2,
  tankBottom:TANK_BOTTOM,loxTankHeight:loxHeight,ch4TankHeight:ch4Height,
  ch4TankBottom:TANK_BOTTOM+loxHeight,
  aftFinStation:66,frontFinStation:66,rcsStation:66,
  minArea:area,maxArea:HEIGHT*DIAMETER,frontFinArea:0,aftFinArea:0,
  engines:Object.freeze([mount(0,true),mount(-.65,true),mount(.65,true),...ring(10,2,true),...ring(20,3.8,false)]),
  ignitionGroup:RETURN_ENGINES,
  gridFins:Object.freeze({area:24,station:66,maxAngle:Math.PI/4}),
});

/** Frozen before any booster flight acceptance. Footage:SpaceX Flight5,
 * https://www.youtube.com/watch?v=hI9HQfCAw64, external airborne catch.
 * Layout/bounds are the approved conservative2D approximation, not telemetry. */
export const CATCH=Object.freeze({
  lugStation:65,planeAltitude:120,bodyCentreAltitude:90.5,
  halfWidth:2.25,maxDownSpeed:4.5,maxLateralSpeed:1,maxPitch:5*Math.PI/180,
});
