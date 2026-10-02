/** Immutable physical vehicle inputs. Ship retains the shipped expressions and
 * their evaluation order; adding a second vehicle must not change its maths. */
import * as C from './constants';

export interface VehicleDefinition {
  readonly id: 'ship' | 'super-heavy';
  /** m — geometric hull length and diameter. */
  readonly height: number;
  readonly diameter: number;
  /** kg — dry structure, tank capacity and default spawn load. */
  readonly dryMass: number;
  readonly propellantCapacity: number;
  readonly initialPropellant: number;
  /** m — every station is above the engine gimbal plane. */
  readonly dryCentreOfMass: number;
  readonly tankBottom: number;
  readonly loxTankHeight: number;
  readonly ch4TankHeight: number;
  readonly ch4TankBottom: number;
  readonly aftFinStation: number;
  readonly frontFinStation: number;
  readonly rcsStation: number;
  /** m² — nose-on, broadside and fin reference areas. */
  readonly minArea: number;
  readonly maxArea: number;
  readonly frontFinArea: number;
  readonly aftFinArea: number;
  readonly engines: readonly C.RaptorMount[];
  readonly ignitionGroup: readonly number[];
}

/** Shared LOX/methane properties used to size both vehicles' tanks. */
export const OXIDISER_TO_FUEL = 3.6;
export const OXIDISER_SHARE = OXIDISER_TO_FUEL / (1 + OXIDISER_TO_FUEL);
/** kg/m³ — at their boiling points. */
export const LOX_DENSITY = 1141;
export const CH4_DENSITY = 424;

const SHIP_CAPACITY = 1_200_000;
const SHIP_TANK_BOTTOM = 5;
const SHIP_TANK_AREA = Math.PI * (C.vehicleDiameter / 2) ** 2;
const SHIP_LOX_HEIGHT = (SHIP_CAPACITY * OXIDISER_SHARE) / (LOX_DENSITY * SHIP_TANK_AREA);
const SHIP_CH4_HEIGHT =
  (SHIP_CAPACITY * (1 - OXIDISER_SHARE)) / (CH4_DENSITY * SHIP_TANK_AREA);

export const SHIP: VehicleDefinition = Object.freeze({
  id: 'ship',
  height: C.vehicleHeight,
  diameter: C.vehicleDiameter,
  dryMass: C.vehicleDryMass,
  propellantCapacity: SHIP_CAPACITY,
  initialPropellant: C.propellantMass,
  dryCentreOfMass: C.engineDistanceFromCenterOfMass,
  tankBottom: SHIP_TANK_BOTTOM,
  loxTankHeight: SHIP_LOX_HEIGHT,
  ch4TankHeight: SHIP_CH4_HEIGHT,
  ch4TankBottom: SHIP_TANK_BOTTOM + SHIP_LOX_HEIGHT,
  aftFinStation: C.engineDistanceFromCenterOfMass - C.aftFinDistanceFromCenterOfMass,
  frontFinStation: C.engineDistanceFromCenterOfMass + C.frontFinDistanceFromCenterOfMass,
  rcsStation: C.engineDistanceFromCenterOfMass + C.rcsThrustDistanceFromCenterOfMass,
  minArea: C.vehicleMinArea,
  maxArea: C.vehicleMaxArea,
  frontFinArea: C.frontFinSurfaceArea,
  aftFinArea: C.aftFinSurfaceArea,
  engines: C.RAPTORS,
  ignitionGroup: C.SEA_LEVEL_RAPTORS,
});
