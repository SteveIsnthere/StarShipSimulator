/** Coherent Tasks1+1b measurements; deliberately contains no 300 km flight. */
import * as C from '../../../src/core/constants';
import {createScenarioState,getScenario} from '../../../src/core/scenarios';
import {toggleAutoDeorbit,toggleAutoLand} from '../../../src/core/control/commands';
import {step} from '../../../src/core/step';
import {surfaceTemperature} from '../../../src/core/physics/thermal';
for (const id of ['deorbit','reentry'] as const) {
 let s=createScenarioState(getScenario(id)!);
 if(id==='deorbit') toggleAutoDeorbit(s); else toggleAutoLand(s);
 let peakFlux=0,peakSkin=0,peakSkinAltitude=0;
 for(let n=1;n<=120*8000;n++) {
  s=step(s,1/120);
  peakFlux=Math.max(peakFlux,s.forces.thermalPower);
  if(s.forces.surfaceTemperature>peakSkin){peakSkin=s.forces.surfaceTemperature;peakSkinAltitude=s.kinematics.altitude;}
  if(s.status.landed||s.failures.crashed||s.failures.inFlightBreakUp){
   console.log(JSON.stringify({id,rotation:C.frameRotationRate,aim:C.DEORBIT_ENTRY_RANGE,reserve:C.landingReserve,outcome:s.status.landed?'landed':s.failures.crashed?'crashed':'brokeUp',seconds:n/120,miss:s.kinematics.downRangeDistance-C.starBaseXPos,propellant:s.vehicle.propellantMass,peakFlux,peakSkin,peakSkinAltitude,oldPeakTemperatureCharacterization:surfaceTemperature(peakFlux)}));break;
  }
 }
}
