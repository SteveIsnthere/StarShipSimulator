/** Declared hollow-beam attachment surrogate. Geometry is authored, not V3
 * metrology; source mechanical capacity is in damage-material.ts. An end
 * moment rotates a cantilever by M L/(E I). No accumulated fatigue/plasticity.
 */
import { STEEL_DENSITY, steelElasticModulus, steelProofStrength } from './damage-material';

export interface RootSection {
  /** m² — material cross section. */
  readonly area: number;
  /** m⁴ — bending second moment of area. */
  readonly inertia: number;
  /** m³ — elastic section modulus. */
  readonly modulus: number;
  /** m — load-bearing cantilever length. */
  readonly length: number;
  /** m² — receiving surface B×L. */
  readonly heatArea: number;
  /** kg — partition of existing dry mass, never additional mass. */
  readonly mass: number;
}

/** Construct once per model, never on the per-step path. */
export function createRootSection(diameter: number): RootSection {
  const width = .10 * diameter;
  const depth = .15 * diameter;
  const length = .05 * diameter;
  const wall = .004;
  if (!(width > 2 * wall && depth > 2 * wall)) throw new RangeError('Invalid attachment section');
  const area = width * depth - (width - 2 * wall) * (depth - 2 * wall);
  const inertia = (width * depth ** 3 - (width - 2 * wall) * (depth - 2 * wall) ** 3) / 12;
  return Object.freeze({ area, inertia, modulus: 2 * inertia / depth, length,
    heatArea: width * length, mass: STEEL_DENSITY * area * length });
}

export type RootLoadLaw = 'plate' | 'grid';

/** Dimensionless resultant load; input is the absolute loaded angle in rad. */
export function rootLoadCoefficient(angle: number, law: RootLoadLaw): number {
  return law === 'plate' ? Math.sin(angle)
    : Math.hypot(Math.sin(2 * angle), 1.2 * Math.sin(angle) ** 2);
}

/**
 * Passive deflection subtracts from commanded magnitude. Solve a + F(a)Ll/EI
 * = |command| by forty fixed bisections, rather than a potentially divergent
 * fixed-point iteration. Plate range ≤pi/2; grid range ≤pi/4 gives monotone
 * resultant force and a unique bracketed root. forceScale is q×area×Cd for
 * the plate, q×area for grid; loadLever is component span centroid, in metres.
 */
export function loadedRootAngle(
  command: number, forceScale: number, loadLever: number, temperature: number,
  section: RootSection, law: RootLoadLaw,
): number {
  const magnitude = Math.abs(command);
  const limit = law === 'plate' ? Math.PI / 2 : Math.PI / 4;
  if (!Number.isFinite(command) || magnitude > limit || forceScale < 0 || loadLever < 0
    || !Number.isFinite(forceScale) || !Number.isFinite(loadLever)) {
    throw new RangeError('Attachment load outside the monotone force domain');
  }
  const modulus = steelElasticModulus(temperature);
  if (modulus === 0) return 0;
  if (magnitude === 0 || forceScale === 0 || loadLever === 0) return command;
  const compliance = forceScale * loadLever * section.length / (modulus * section.inertia);
  // Newton only predicts which old bisection cell contains the root. It never
  // determines the returned angle: certify the original cell with the same
  // residual comparisons, then return its bit-identical midpoint. If the guess
  // is poor (extreme loads, singular rounding), retain all forty original steps.
  let estimate = magnitude;
  for (let i = 0; i < 2; i++) {
    const coefficient = rootLoadCoefficient(estimate, law);
    const sine = Math.sin(estimate), cosine = Math.cos(estimate);
    const derivative = law === 'plate' ? cosine : coefficient === 0 ? 2
      : (2 * Math.sin(2 * estimate) * Math.cos(2 * estimate)
        + 2.88 * sine ** 3 * cosine) / coefficient;
    estimate -= (estimate + compliance * coefficient - magnitude) / (1 + compliance * derivative);
    if (!(estimate > 0 && estimate <= magnitude)) break;
  }
  if (estimate > 0 && estimate <= magnitude) {
    let candidateLower = 0, candidateUpper = magnitude;
    for (let i = 0; i < 40; i++) {
      const middle = (candidateLower + candidateUpper) / 2;
      if (middle < estimate) candidateLower = middle;
      else candidateUpper = middle;
    }
    if (candidateLower + compliance * rootLoadCoefficient(candidateLower, law) < magnitude
      && candidateUpper + compliance * rootLoadCoefficient(candidateUpper, law) >= magnitude)
      return Math.sign(command) * (candidateLower + candidateUpper) / 2;
  }
  let lower = 0;
  let upper = magnitude;
  for (let iteration = 0; iteration < 40; iteration++) {
    const middle = (lower + upper) / 2;
    if (middle + compliance * rootLoadCoefficient(middle, law) < magnitude) lower = middle;
    else upper = middle;
  }
  return Math.sign(command) * (lower + upper) / 2;
}

/** Dimensionless demand/proof ratio. Above the source domain capability is
 * unavailable even unloaded; the caller records that distinct failure cause.
 */
export function rootUtilization(moment: number, temperature: number, section: RootSection): number {
  const capacity = steelProofStrength(temperature) * section.modulus;
  return capacity === 0 ? Infinity : Math.abs(moment) / capacity;
}
