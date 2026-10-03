/** A control law consumes the returned mechanics before real actuators slew.
 * Forecasts supply their planned law instead of recursively running guidance. */
import type { SimState } from '../state';
import type { VehicleDefinition } from '../vehicle';
export type MechanicalControl=(state:SimState,dt:number,model:VehicleDefinition)=>void;
export type MechanicalAdvance=(previous:SimState,dt:number,control:MechanicalControl,model:VehicleDefinition)=>SimState;
