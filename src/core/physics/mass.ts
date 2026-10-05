/**
 * Mass properties — M11.8, Fidelity: the centre of mass moves.
 *
 * Up to M11.8 every moment arm was a constant and the moment of inertia was a
 * uniform cylinder's at the current mass: a vehicle that was 74% propellant
 * at the pad and 14% at the flip had the same centre of mass throughout. It
 * does not. The tanks are in the lower half of the hull and they drain, so a
 * full ship is bottom-heavy — the engines' gimbal has a short arm and the aft
 * fins almost none — and an empty one is not.
 *
 * THE STATED LAYOUT, in metres above the engines' gimbal plane:
 *
 *     0.0      engines (the gimbal plane)
 *     5.0      tank bottom: the skirt
 *     5.0–     the LOX tank, then the CH4 tank above it, sized to the editor's
 *              1 200 t cap at Raptor's oxidiser-to-fuel ratio of 3.6
 *     9.2      aft fins
 *     21.8     the DRY centre of mass
 *     41.8     RCS thrusters
 *     45.1     front fins
 *     50.0     the nose
 *
 * The four stations are the 2021 constants read the other way round: they
 * were arms from a fixed centre of mass at 21.8 m, and here they are places
 * on the hull. With the tanks EMPTY the arms are exactly those constants, so
 * the flip and the landings — flown on tens of tonnes — are within a metre
 * of the geometry they were tuned on; with the tanks full the centre of mass
 * is at 14.7 m and every arm is different.
 *
 * Both tanks fill from the bottom and drain in ratio, so one fill fraction
 * describes both. The moment of inertia is the dry structure as a uniform
 * cylinder about its own centre, plus each propellant column as a cylinder
 * of its filled height, each carried to the common centre by the parallel
 * axis theorem.
 */
import { SHIP, OXIDISER_SHARE, type VehicleDefinition } from '../vehicle';
export { OXIDISER_TO_FUEL, OXIDISER_SHARE, LOX_DENSITY, CH4_DENSITY } from '../vehicle';

/** Ship aliases retained for the existing public API and truth tests. */
export const TANK_BOTTOM = SHIP.tankBottom;
export const PROPELLANT_CAPACITY = SHIP.propellantCapacity;
export const LOX_TANK_HEIGHT = SHIP.loxTankHeight;
export const CH4_TANK_HEIGHT = SHIP.ch4TankHeight;
export const CH4_TANK_BOTTOM = SHIP.ch4TankBottom;
export const DRY_CENTRE_OF_MASS = SHIP.dryCentreOfMass;
export const AFT_FIN_STATION = SHIP.aftFinStation;
export const RCS_STATION = SHIP.rcsStation;
export const FRONT_FIN_STATION = SHIP.frontFinStation;

/** 0..1 — how full the tanks are. */
export function fillFraction(propellantMass: number, vehicle: VehicleDefinition = SHIP): number {
  return Math.min(1, Math.max(0, propellantMass / vehicle.propellantCapacity));
}

/** m — where the propellant balances, above the gimbal plane. */
export function propellantCentreOfMass(propellantMass: number, vehicle: VehicleDefinition = SHIP): number {
  const f = fillFraction(propellantMass, vehicle);
  const lox = vehicle.tankBottom + (f * vehicle.loxTankHeight) / 2;
  const ch4 = vehicle.ch4TankBottom + (f * vehicle.ch4TankHeight) / 2;
  return OXIDISER_SHARE * lox + (1 - OXIDISER_SHARE) * ch4;
}

/** m — where the whole vehicle balances, above the gimbal plane. */
export function centreOfMass(propellantMass: number, vehicle: VehicleDefinition = SHIP): number {
  const propellant = Math.max(0, propellantMass);
  return (
    (vehicle.dryMass * vehicle.dryCentreOfMass + propellant * propellantCentreOfMass(propellant, vehicle)) /
    (vehicle.dryMass + propellant)
  );
}

/** kg m^2 — a uniform cylinder of mass m, radius r and length L, about its centre, tumbling. */
function cylinder(mass: number, length: number, vehicle: VehicleDefinition): number {
  return mass * ((vehicle.diameter / 2) ** 2 / 4 + length ** 2 / 12);
}

/** kg m^2 — about the vehicle's centre of mass, tumbling end over end. */
export function momentOfInertia(propellantMass: number, vehicle: VehicleDefinition = SHIP): number {
  const propellant = Math.max(0, propellantMass);
  const com = centreOfMass(propellant, vehicle);
  const f = fillFraction(propellant, vehicle);
  const dry = cylinder(vehicle.dryMass, vehicle.height, vehicle) + vehicle.dryMass * (vehicle.dryCentreOfMass - com) ** 2;
  const loxMass = propellant * OXIDISER_SHARE;
  const loxHeight = f * vehicle.loxTankHeight;
  const loxCom = vehicle.tankBottom + loxHeight / 2;
  const lox = cylinder(loxMass, loxHeight, vehicle) + loxMass * (loxCom - com) ** 2;
  const ch4Mass = propellant * (1 - OXIDISER_SHARE);
  const ch4Height = f * vehicle.ch4TankHeight;
  const ch4Com = vehicle.ch4TankBottom + ch4Height / 2;
  const ch4 = cylinder(ch4Mass, ch4Height, vehicle) + ch4Mass * (ch4Com - com) ** 2;
  return dry + lox + ch4;
}

/**
 * m^4 — the integral of |r|^3 along the hull, about a pivot `com` metres up.
 *
 * WHAT THE ANGULAR DRAG TERM ACTUALLY NEEDS. A strip of hull dx at distance r
 * from the rotation axis moves at `omega * r`, so its drag is proportional to
 * `(omega * r)^2 * dx` and its TORQUE to `omega^2 * r^3 * dx`. Both halves push
 * the same way — each end's drag opposes its own motion — so the integral is
 * over |r|, taken from the axis to each end and added:
 *
 *     (a^4 + (L - a)^4) / 4
 *
 * `constants.integralOfRCubedTimesDx` is 97 656, which is `(L/2)^4 / 4` — the
 * integral over ONE HALF of a 50 m rod about its midpoint, so it was short by a
 * factor of two before the axis is even considered, and the axis is not the
 * midpoint: the vehicle rotates about its centre of mass, which M11.8 showed
 * moves from 21.8 m dry to 12.7 m at the shipped 350 t load.
 *
 * Against the constant this is 2.20x at dry and 5.02x wet. The named debt
 * estimated 1.1x and 2.5x; those numbers were wrong, and the measurement is in
 * `tests/core/mass.test.ts` rather than in a comment.
 */
export function rCubedIntegral(com: number, length = SHIP.height): number {
  return (com ** 4 + (length - com) ** 4) / 4;
}

export interface MassProperties {
  /** m — body-right displacement, zero for the intact symmetric model. */
  centreOfMassX: number;
  /** m — above the gimbal plane. */
  centreOfMass: number;
  /** kg m^2 */
  momentOfInertia: number;
  /** m — the gimbal's arm: the centre of mass is above the engines. */
  engineArm: number;
  /** m — the aft fins are below the centre of mass. */
  aftFinArm: number;
  /** m — the front fins are above it. */
  frontFinArm: number;
  /** m — so are the RCS thrusters. */
  rcsArm: number;
  /** m^4 — the angular drag integral about this centre of mass. */
  rCubedIntegral: number;
}

/** Fill `out` for a propellant load. Allocation-free; the step calls it once a step. */
export function writeMassProperties(propellantMass: number, out: MassProperties, vehicle: VehicleDefinition = SHIP): void {
  const com = centreOfMass(propellantMass, vehicle);
  out.centreOfMassX = 0;
  out.centreOfMass = com;
  out.momentOfInertia = momentOfInertia(propellantMass, vehicle);
  out.engineArm = com;
  out.aftFinArm = com - vehicle.aftFinStation;
  out.frontFinArm = vehicle.frontFinStation - com;
  out.rcsArm = vehicle.rcsStation - com;
  out.rCubedIntegral = rCubedIntegral(com, vehicle.height);
}

export function createMassProperties(propellantMass = 0, vehicle: VehicleDefinition = SHIP): MassProperties {
  const out: MassProperties = {
    centreOfMassX: 0,
    centreOfMass: 0,
    momentOfInertia: 0,
    engineArm: 0,
    aftFinArm: 0,
    frontFinArm: 0,
    rcsArm: 0,
    rCubedIntegral: 0,
  };
  writeMassProperties(propellantMass, out, vehicle);
  return out;
}
