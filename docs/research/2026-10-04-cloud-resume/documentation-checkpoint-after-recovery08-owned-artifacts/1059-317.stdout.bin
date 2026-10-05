/** Immutable derived geometry shared by construction, mechanics and forecasts.
 * Cache keys are immutable vehicle definitions; cache presence cannot change a
 * computed value. Mutable thermal/ownership state never enters this catalogue.
 */
import type { VehicleDefinition } from '../vehicle';
import { createVehicleComponents } from './vehicle-components';
import { createDamageThermalModel } from './damage-thermal';
import { createDamageControlModel } from './damage-controls';
import { createDamageDebrisModel } from './damage-debris';

export interface DamageModel {
  readonly partition: ReturnType<typeof createVehicleComponents>;
  readonly thermal: ReturnType<typeof createDamageThermalModel>;
  readonly controls: ReturnType<typeof createDamageControlModel>;
  readonly debris: ReturnType<typeof createDamageDebrisModel>;
}
const models = new WeakMap<VehicleDefinition, DamageModel>();

/** First called during vehicle construction, never rebuilt during a rollout. */
export function damageModelFor(vehicle: VehicleDefinition): DamageModel {
  const known = models.get(vehicle);
  if (known) return known;
  const partition = createVehicleComponents(vehicle);
  const model = Object.freeze({ partition, thermal: createDamageThermalModel(partition),
    controls: createDamageControlModel(partition, vehicle), debris: createDamageDebrisModel(partition, vehicle) });
  models.set(vehicle, model);
  return model;
}
