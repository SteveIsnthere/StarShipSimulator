/**
 * Tier 2 of the truth hierarchy: published reference values the simulation is
 * judged against, each with its source and the conditions it holds under.
 *
 * Tier A is a manufacturer statement or a physical constant; only A rows gate
 * (tests/reference/ratchet.test.ts). Tier B is a credible public estimate,
 * reported and never gated. Bands are wide on purpose — they catch an error of
 * a factor, not a percent. Never move a tuning constant to bring a row in band
 * (`physics-change-policy`): fix the physics, or leave it out of band.
 */
export type Tier = 'A' | 'B';

export interface Band {
  /** Stable id, e.g. 'raptor2.sl.thrust'. */
  readonly id: string;
  /** What is measured, in words. */
  readonly quantity: string;
  readonly min: number;
  readonly max: number;
  /** SI unit of value, min and max. */
  readonly unit: string;
  readonly tier: Tier;
  /** Publisher, document or URL, and date. */
  readonly source: string;
  /** When the value holds. */
  readonly conditions: string;
  /** Measures the value from the simulation as it is. */
  readonly probe: () => number;
}

export interface Verdict {
  readonly id: string;
  readonly value: number;
  readonly status: 'IN' | 'OUT';
  /** 1 in band; value/max above it; min/value below it; Infinity if not finite. */
  readonly factor: number;
}

export function judge(band: Band): Verdict {
  const value = band.probe();
  if (!Number.isFinite(value)) return { id: band.id, value, status: 'OUT', factor: Infinity };
  if (value > band.max) return { id: band.id, value, status: 'OUT', factor: value / band.max };
  if (value < band.min) return { id: band.id, value, status: 'OUT', factor: band.min / value };
  return { id: band.id, value, status: 'IN', factor: 1 };
}

/** A band of ±fraction around a stated value. */
export function around(value: number, fraction: number): { min: number; max: number } {
  return { min: value * (1 - fraction), max: value * (1 + fraction) };
}
