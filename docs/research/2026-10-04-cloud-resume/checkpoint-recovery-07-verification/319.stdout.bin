/** V3 booster. Published envelope/propulsion live in v3.ts; mass, projected
 * mount radii and scaled inherited stations remain declared approximations. */
import { V3_SUPER_HEAVY } from './v3';
import type { RaptorMount } from '../constants';
import { LOX_DENSITY, CH4_DENSITY, OXIDISER_SHARE, type VehicleDefinition } from '../vehicle';

export const CENTRE_ENGINES: readonly number[] = Object.freeze([0,1,2]);
export const RETURN_ENGINES: readonly number[] = Object.freeze(Array.from({length:13},(_,i)=>i));
/** Operator groups follow the physical centre and the two engine rings. */
export const BOOSTER_ENGINE_GROUPS = Object.freeze({
  centre: CENTRE_ENGINES,
  inner: Object.freeze(Array.from({ length: 10 }, (_, i) => i + 3)),
  outer: Object.freeze(Array.from({ length: 20 }, (_, i) => i + 13)),
});
const HEIGHT=V3_SUPER_HEAVY.height, DIAMETER=V3_SUPER_HEAVY.diameter, CAPACITY=V3_SUPER_HEAVY.propellantCapacity, TANK_BOTTOM=3;
// Authored V3 photo estimate: .4D below the crown; frozen before flight checks.
// Provenance/uncertainty: v3-source-audit.md, shared grid-hinge station correction.
const GRID_STATION=.90*HEIGHT;
const RCS_STATION=66/71*HEIGHT;
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
  id:'super-heavy',propulsion:V3_SUPER_HEAVY.propulsion,height:HEIGHT,diameter:DIAMETER,dryMass:V3_SUPER_HEAVY.dryMass,
  propellantCapacity:CAPACITY,initialPropellant:500_000,dryCentreOfMass:HEIGHT/2,
  tankBottom:TANK_BOTTOM,loxTankHeight:loxHeight,ch4TankHeight:ch4Height,
  ch4TankBottom:TANK_BOTTOM+loxHeight,
  aftFinStation:GRID_STATION,frontFinStation:GRID_STATION,rcsStation:RCS_STATION,
  minArea:area,maxArea:HEIGHT*DIAMETER,frontFinArea:0,aftFinArea:0,
  engines:Object.freeze([mount(0,true),mount(-.65,true),mount(.65,true),...ring(10,2,true),...ring(20,3.8,false)]),
  ignitionGroup:RETURN_ENGINES,
  gridFins:Object.freeze({count:3,area:V3_SUPER_HEAVY.gridFins.area,station:GRID_STATION,maxAngle:Math.PI/4}),
});

/** Frozen before any booster flight acceptance. Footage:SpaceX Flight5,
 * https://www.youtube.com/watch?v=hI9HQfCAw64, external airborne catch.
 * Layout/bounds are the approved conservative2D approximation, not telemetry. */
const LUG_STATION=65/71*HEIGHT;
export const CATCH=Object.freeze({
  lugStation:LUG_STATION,planeAltitude:120,bodyCentreAltitude:120-(LUG_STATION-HEIGHT/2),
  halfWidth:2.25,maxDownSpeed:4.5,maxLateralSpeed:1,maxPitch:5*Math.PI/180,
});
