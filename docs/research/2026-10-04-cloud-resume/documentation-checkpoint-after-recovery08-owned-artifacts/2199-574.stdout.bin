/** Pure per-engine propulsion. Profiles supply generation-specific anchors;
 * pressure changes thrust, while full-throttle mass flow remains constant. */
import type { RaptorKind } from '../constants';

export interface PropulsionProfile {
  /** m/s² — standard gravity used to convert specific impulse to exhaust speed. */
  readonly standardGravity: number;
  /** Pa — ambient pressure of the sea-level thrust/Isp anchor. */
  readonly referencePressurePa: number;
  readonly seaLevel: {
    /** N — full throttle at reference pressure. */
    readonly thrustSeaLevel: number;
    /** s — at reference pressure. */
    readonly ispSeaLevel: number;
    /** s — same sea-level nozzle in vacuum. */
    readonly ispVacuum: number;
  };
  readonly vacuum: {
    /** N — full throttle in vacuum. */
    readonly thrustVacuum: number;
    /** s — in vacuum. */
    readonly ispVacuum: number;
    /** m² — effective pressure-loss area; may be an explicit geometric approximation. */
    readonly effectiveExitArea: number;
  };
}

/** kg/s per engine at full throttle, independent of ambient pressure. */
export function engineMassFlow(profile: PropulsionProfile, kind: RaptorKind): number {
  return kind === 'sea-level'
    ? profile.seaLevel.thrustSeaLevel / (profile.seaLevel.ispSeaLevel * profile.standardGravity)
    : profile.vacuum.thrustVacuum / (profile.vacuum.ispVacuum * profile.standardGravity);
}

/** N per engine at full throttle. Ambient pressure enters in kPa, as in ISA.
 * Negative pressure is vacuum; NaN propagates rather than concealing bad input. */
export function engineThrust(profile: PropulsionProfile, kind: RaptorKind, pressureKPa: number): number {
  const pressurePa = Math.max(0, pressureKPa) * 1000;
  const vacuumThrust = kind === 'sea-level'
    ? engineMassFlow(profile, kind) * profile.standardGravity * profile.seaLevel.ispVacuum
    : profile.vacuum.thrustVacuum;
  const exitArea = kind === 'sea-level'
    ? (vacuumThrust - profile.seaLevel.thrustSeaLevel) / profile.referencePressurePa
    : profile.vacuum.effectiveExitArea;
  return Math.max(0, vacuumThrust - pressurePa * exitArea);
}

/** Certify this predicate itself and the original module-local helper bindings.
 * No captured mock, registry, prepared state or shared mutable context. */
export function isCanonicalBurnPropulsion(certificate: unknown, massFlow: unknown, thrust: unknown): boolean {
  return certificate === isCanonicalBurnPropulsion && massFlow === engineMassFlow && thrust === engineThrust;
}
