/** Read-only retained mass inputs for direct guidance and mission queries.
 * The caller owns scratch; no vehicle fields, damage, commands or RNG change.
 */
import type { SimState } from '../state';
import type { VehicleDefinition } from '../vehicle';
import { damageModelFor } from './damage-model';
import { writeDamageMass, type DamageMassProperties } from './damage-mass';
import { centreOfMass, momentOfInertia, writeMassProperties, rCubedIntegral, type MassProperties } from './mass';

export function writeFlightMassQuery(state: SimState, model: VehicleDefinition,
  out: DamageMassProperties, arms?: MassProperties): void {
  if (state.damage) {
    writeDamageMass(state.damage, damageModelFor(model).partition, state.vehicle.propellantMass, model, out);
  } else {
    out.hasMass = true;
    out.retainedDryMass = model.dryMass;
    out.propellantMass = Math.max(0, state.vehicle.propellantMass);
    out.totalMass = model.dryMass + out.propellantMass;
    out.dryCentreOfMassX = out.centreOfMassX = 0;
    out.dryCentreOfMass = model.dryCentreOfMass;
    out.dryMomentOfInertia = model.dryMass * ((model.diameter / 2) ** 2 / 4 + model.height ** 2 / 12);
    out.centreOfMass = centreOfMass(out.propellantMass, model);
    out.momentOfInertia = momentOfInertia(out.propellantMass, model);
    out.frontFinCount = model.frontFinArea > 0 ? 2 : 0;
    out.aftFinCount = model.aftFinArea > 0 ? 2 : 0;
    out.gridFinCount = model.gridFins?.count ?? 0;
    out.frontFinArea = model.frontFinArea;
    out.aftFinArea = model.aftFinArea;
    out.gridFinArea = model.gridFins?.area ?? 0;
    out.engineSupportAvailable = true;
  }
  if (!arms) return;
  if (!state.damage) { writeMassProperties(state.vehicle.propellantMass, arms, model); return; }
  arms.centreOfMassX = out.centreOfMassX;
  arms.centreOfMass = out.centreOfMass;
  arms.momentOfInertia = out.momentOfInertia;
  arms.engineArm = out.centreOfMass;
  arms.aftFinArm = out.centreOfMass - model.aftFinStation;
  arms.frontFinArm = model.frontFinStation - out.centreOfMass;
  arms.rcsArm = model.rcsStation - out.centreOfMass;
  arms.rCubedIntegral = rCubedIntegral(out.centreOfMass, model.height);
}
