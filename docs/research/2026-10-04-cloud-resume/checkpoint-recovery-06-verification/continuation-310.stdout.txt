/** Flown-V3 catalogue — approved Phase8 R1 Fidelity.
 * Both active vehicle definitions consume these sourced inputs.
 * Sources/uncertainties: docs/research/2026-10-03-vehicle-realism/v3-source-audit.md.
 * https://www.spacex.com/vehicles/starship — rounded hull dimensions/capacities/counts.
 * https://www.spacex.com/updates/reusability — 2026-05-12 Raptor3 nominal250/275tf.
 * https://www.nasa.gov/directorates/esdmd/artemis-campaign-development-division/human-landing-system-program/nasa-spacex-advance-wind-tunnel-tests-for-starship-rocket/
 * corroborates three larger fins and integrated hot stage, not exact fin geometry. */
import type { RaptorKind } from '../constants';
import type { PropulsionProfile } from '../physics/propulsion';

const G0 = 9.80665;
/** m — inherited RVac exit-diameter approximation, not a published V3 measurement. */
const RVAC_EXIT_DIAMETER = 2.3;

/** Published nominal thrust, with inherited uncertain327/350/380s efficiency.
 * No current primary V3 Isp triplet is available; do not claim these as V3 truth. */
export const V3_PROPULSION: PropulsionProfile = Object.freeze({
  standardGravity: G0,
  referencePressurePa: 101_325,
  seaLevel: Object.freeze({
    thrustSeaLevel: 250_000 * G0,
    ispSeaLevel: 327,
    ispVacuum: 350,
  }),
  vacuum: Object.freeze({
    thrustVacuum: 275_000 * G0,
    ispVacuum: 380,
    effectiveExitArea: Math.PI * (RVAC_EXIT_DIAMETER / 2) ** 2,
  }),
});

export interface V3Engine {
  readonly kind: RaptorKind;
  readonly gimballed: boolean;
}

/** Physical inputs with verified envelope and explicit assumed dry mass.
 * Full stations/mount offsets are intentionally absent until authored geometry
 * is frozen; this is not a partially populated live VehicleDefinition. */
export interface V3VehicleCatalog {
  readonly id: 'ship' | 'super-heavy';
  /** m — rounded manufacturer hull length and diameter. */
  readonly height: number;
  readonly diameter: number;
  /** kg — inherited engineering assumption, not published V3 dry mass. */
  readonly dryMass: number;
  /** kg — capacity, not a scenario's starting propellant load. */
  readonly propellantCapacity: number;
  readonly engines: readonly V3Engine[];
  readonly propulsion: PropulsionProfile;
}

function engine(kind: RaptorKind, gimballed: boolean): V3Engine {
  return Object.freeze({ kind, gimballed });
}

export const V3_SHIP: V3VehicleCatalog = Object.freeze({
  id: 'ship', height: 52, diameter: 9,
  dryMass: 120_000, propellantCapacity: 1_600_000,
  engines: Object.freeze([
    engine('sea-level', true), engine('sea-level', true), engine('sea-level', true),
    engine('vacuum', false), engine('vacuum', false), engine('vacuum', false),
  ]),
  propulsion: V3_PROPULSION,
});

export const V3_SUPER_HEAVY: V3VehicleCatalog & {
  readonly gridFins: { readonly count: number; readonly area: number };
} = Object.freeze({
  id: 'super-heavy', height: 72, diameter: 9,
  dryMass: 200_000, propellantCapacity: 3_650_000,
  engines: Object.freeze(Array.from({ length: 33 }, (_, index) => engine('sea-level', index < 13))),
  propulsion: V3_PROPULSION,
  gridFins: Object.freeze({
    count: 3,
    /** m² — aggregate coupled reference area. Relative engineering assumption:
     * inherited24m² ×3/4 fins ×1.5 per-fin area; no published absolute V3 area. */
    area: 24 * 3 / 4 * 1.5,
  }),
});

export const V3_CATALOG = Object.freeze({ ship: V3_SHIP, superHeavy: V3_SUPER_HEAVY });
