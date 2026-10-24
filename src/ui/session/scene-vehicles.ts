/** Full standalone entry retains original synchronous witness contract. */
import { createSceneVehiclesRuntime } from './scene-vehicles-runtime';
import { attachSceneVehiclesWitness } from './scene-vehicles-witness';
export function createSceneVehicles(...args: Parameters<typeof createSceneVehiclesRuntime>) {
  return attachSceneVehiclesWitness(createSceneVehiclesRuntime(...args));
}
