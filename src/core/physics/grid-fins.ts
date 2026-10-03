/** Bounded flat-plate engineering approximation for four coupled grid fins.
 * Cl=sin(2delta),Cd=1.2sin²delta; no invented aerodynamic work. */
import type { VehicleDefinition } from '../vehicle';
import type { Rad } from '../units';
export interface GridFinForces { forceX:number;forceY:number;torque:number;drag:number;lift:number }
export function createGridFinForces():GridFinForces {return {forceX:0,forceY:0,torque:0,drag:0,lift:0};}
export function writeGridFinForces(rho:number,vx:number,vy:number,deflection:Rad,pitch:Rad,com:number,model:VehicleDefinition,out:GridFinForces):void {
  out.forceX=out.forceY=out.torque=out.drag=out.lift=0;
  const fins=model.gridFins;
  const speed=Math.hypot(vx,vy);
  if(!fins || rho<=0 || speed===0 || deflection===0) return;
  const delta=Math.max(-fins.maxAngle,Math.min(fins.maxAngle,deflection));
  const qArea=.5*rho*speed*speed*fins.area;
  out.lift=qArea*Math.sin(2*delta);
  out.drag=qArea*1.2*Math.sin(delta)**2;
  out.forceX=(-vy*out.lift-vx*out.drag)/speed;
  out.forceY=(vx*out.lift-vy*out.drag)/speed;
  const arm=fins.station-com;
  out.torque=arm*(Math.cos(pitch)*out.forceX-Math.sin(pitch)*out.forceY);
}
