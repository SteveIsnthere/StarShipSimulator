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
import * as C from '../constants';

/** m — the tank bottom above the gimbal plane: the engine skirt. */
export const TANK_BOTTOM = 5;
/**
 * kg — the editor's cap on propellant, and so the size the tanks are built to
 * hold. `scenarios.ts` clamps to this rather than to a literal of its own:
 * raising one without the other would leave the tanks the wrong size and
 * every arm quietly wrong, with nothing to fail.
 */
export const PROPELLANT_CAPACITY = 1_200_000;
/** Raptor's oxidiser-to-fuel ratio, by mass. */
export const OXIDISER_TO_FUEL = 3.6;
/** Share of the propellant that is oxidiser. */
export const OXIDISER_SHARE = OXIDISER_TO_FUEL / (1 + OXIDISER_TO_FUEL);
/** kg/m^3 — liquid oxygen and liquid methane at their boiling points. */
export const LOX_DENSITY = 1141;
export const CH4_DENSITY = 424;

const TANK_AREA = Math.PI * (C.vehicleDiameter / 2) ** 2;
/** m — the LOX tank's height, full. */
export const LOX_TANK_HEIGHT = (PROPELLANT_CAPACITY * OXIDISER_SHARE) / (LOX_DENSITY * TANK_AREA);
/** m — the CH4 tank's height, full; it sits on top of the LOX tank. */
export const CH4_TANK_HEIGHT =
  (PROPELLANT_CAPACITY * (1 - OXIDISER_SHARE)) / (CH4_DENSITY * TANK_AREA);
export const CH4_TANK_BOTTOM = TANK_BOTTOM + LOX_TANK_HEIGHT;

/** m — where the dry vehicle balances: the 2021 engine arm, read as a station. */
export const DRY_CENTRE_OF_MASS = C.engineDistanceFromCenterOfMass;
/** m — the stations, from the 2021 arms about that centre. */
export const AFT_FIN_STATION = DRY_CENTRE_OF_MASS - C.aftFinDistanceFromCenterOfMass;
export const RCS_STATION = DRY_CENTRE_OF_MASS + C.rcsThrustDistanceFromCenterOfMass;
export const FRONT_FIN_STATION = DRY_CENTRE_OF_MASS + C.frontFinDistanceFromCenterOfMass;

/** 0..1 — how full the tanks are. */
export function fillFraction(propellantMass: number): number {
  return Math.min(1, Math.max(0, propellantMass / PROPELLANT_CAPACITY));
}

/** m — where the propellant balances, above the gimbal plane. */
export function propellantCentreOfMass(propellantMass: number): number {
  const f = fillFraction(propellantMass);
  const lox = TANK_BOTTOM + (f * LOX_TANK_HEIGHT) / 2;
  const ch4 = CH4_TANK_BOTTOM + (f * CH4_TANK_HEIGHT) / 2;
  return OXIDISER_SHARE * lox + (1 - OXIDISER_SHARE) * ch4;
}

/** m — where the whole vehicle balances, above the gimbal plane. */
export function centreOfMass(propellantMass: number): number {
  const propellant = Math.max(0, propellantMass);
  return (
    (C.vehicleDryMass * DRY_CENTRE_OF_MASS + propellant * propellantCentreOfMass(propellant)) /
    (C.vehicleDryMass + propellant)
  );
}

/** kg m^2 — a uniform cylinder of mass m, radius r and length L, about its centre, tumbling. */
function cylinder(mass: number, length: number): number {
  return mass * ((C.vehicleDiameter / 2) ** 2 / 4 + length ** 2 / 12);
}

/** kg m^2 — about the vehicle's centre of mass, tumbling end over end. */
export function momentOfInertia(propellantMass: number): number {
  const propellant = Math.max(0, propellantMass);
  const com = centreOfMass(propellant);
  const f = fillFraction(propellant);
  const dry = cylinder(C.vehicleDryMass, C.vehicleHeight) + C.vehicleDryMass * (DRY_CENTRE_OF_MASS - com) ** 2;
  const loxMass = propellant * OXIDISER_SHARE;
  const loxHeight = f * LOX_TANK_HEIGHT;
  const loxCom = TANK_BOTTOM + loxHeight / 2;
  const lox = cylinder(loxMass, loxHeight) + loxMass * (loxCom - com) ** 2;
  const ch4Mass = propellant * (1 - OXIDISER_SHARE);
  const ch4Height = f * CH4_TANK_HEIGHT;
  const ch4Com = CH4_TANK_BOTTOM + ch4Height / 2;
  const ch4 = cylinder(ch4Mass, ch4Height) + ch4Mass * (ch4Com - com) ** 2;
  return dry + lox + ch4;
}

export interface MassProperties {
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
}

/** Fill `out` for a propellant load. Allocation-free; the step calls it once a step. */
export function writeMassProperties(propellantMass: number, out: MassProperties): void {
  const com = centreOfMass(propellantMass);
  out.centreOfMass = com;
  out.momentOfInertia = momentOfInertia(propellantMass);
  out.engineArm = com;
  out.aftFinArm = com - AFT_FIN_STATION;
  out.frontFinArm = FRONT_FIN_STATION - com;
  out.rcsArm = RCS_STATION - com;
}

export function createMassProperties(propellantMass = 0): MassProperties {
  const out: MassProperties = {
    centreOfMass: 0,
    momentOfInertia: 0,
    engineArm: 0,
    aftFinArm: 0,
    frontFinArm: 0,
    rcsArm: 0,
  };
  writeMassProperties(propellantMass, out);
  return out;
}
