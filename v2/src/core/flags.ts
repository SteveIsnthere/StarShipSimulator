/**
 * Fidelity flags.
 *
 * CLAUDE.md's Fidelity tier covers changes that are more accurate AND change
 * how the game feels. Those may not simply land: they go behind a flag, off by
 * default, with both paths golden-tested, and the defaults flip only on the
 * owner's explicit say-so.
 *
 * This is that mechanism. Three rules make it trustworthy rather than
 * decorative:
 *
 *   1. FLAGS LIVE IN SimState, not in a module-level variable. A flag read from
 *      module scope would make `step()` impure and every fixture ambiguous —
 *      you could not tell from a state which physics produced it. Here the
 *      state carries its own configuration, so a golden fixture records the
 *      flags it was recorded under and a replay cannot silently use different
 *      ones.
 *
 *   2. EVERY COMBINATION THAT SHIPS IS GOLDEN-TESTED. `FLAG_COMBINATIONS`
 *      enumerates them, and tests/golden records a fixture per combination.
 *      "Off by default" is worth nothing if the on path is untested.
 *
 *   3. DEFAULTS ARE DATA, AND CHANGING ONE IS A VISIBLE DIFF. `DEFAULT_FLAGS`
 *      is a plain object; flipping a default moves fixtures, which is the point.
 */

/**
 * The fidelity flags.
 *
 * Each names a specific replacement of a 2021 approximation, and each is
 * independent: any combination must produce a valid simulation.
 */
export interface Flags {
  /**
   * M2.6 — planet-centered gravity.
   *
   * OFF: gravity is a constant 9.807 m/s^2 straight down, and orbital motion is
   * approximated by the `orbitGravityAccCompensation` relief term — which is
   * linear in speedX where the truth is quadratic, uses a denominator fixed at
   * spawn, and is clamped at exactly g, making a stable orbit structurally
   * impossible.
   *
   * ON: gravity is -GM*r_hat/|r|^2 in a planet-centered frame. Orbits emerge
   * rather than being approximated, and the relief hack is gone.
   */
  planetCenteredGravity: boolean;

  /**
   * M2.7 — speed of sound from local temperature.
   *
   * OFF: a constant 343 m/s at every altitude. The real value at 11 km is about
   * 295, so Mach number runs roughly 14% low through the whole upper
   * atmosphere — and Mach drives the body drag coefficient.
   *
   * ON: a = sqrt(gamma * R * T) from the local air temperature.
   */
  realSpeedOfSound: boolean;

  /**
   * M2.8 — the full ISA lapse-rate table to 86 km.
   *
   * OFF: the three-layer NASA model (as repaired in M2.1), which stops being
   * meaningful above the stratopause and is extrapolated beyond 86 km.
   *
   * ON: the standard atmosphere's seven layers, valid to 86 km.
   */
  fullISA: boolean;
}

/**
 * The shipped defaults. All off: v2 flies the 2021 reference configuration.
 *
 * CLAUDE.md lists "the tuned feel of the 2021 flight model as the reference
 * configuration" under what must never change. Flipping any of these is the
 * owner's call (M2.10), not a maintainer's.
 */
export const DEFAULT_FLAGS: Readonly<Flags> = {
  planetCenteredGravity: false,
  realSpeedOfSound: false,
  fullISA: false,
};

/** All flag names, for tests that must cover every one. */
export const FLAG_NAMES = Object.keys(DEFAULT_FLAGS) as ReadonlyArray<keyof Flags>;

/** A fresh flag set, optionally with overrides. */
export function createFlags(overrides: Partial<Flags> = {}): Flags {
  return { ...DEFAULT_FLAGS, ...overrides };
}

/** Structural copy, for cloneState. */
export function cloneFlags(flags: Flags): Flags {
  return { ...flags };
}

/** True when every flag is at its default. */
export function isDefault(flags: Flags): boolean {
  return FLAG_NAMES.every((name) => flags[name] === DEFAULT_FLAGS[name]);
}

/**
 * A short, stable identifier for a flag set — used to name golden fixtures.
 *
 * `default` when nothing is on, otherwise the enabled flags joined by `+`, in
 * declaration order so the name does not depend on object key ordering.
 */
export function flagsId(flags: Flags): string {
  const on = FLAG_NAMES.filter((name) => flags[name]);
  return on.length === 0 ? 'default' : on.join('+');
}

/**
 * The flag combinations that ship, and therefore must be golden-tested.
 *
 * Not the full 2^3 power set: eight fixtures per scenario would be mostly
 * noise, and combinations nobody will fly are not worth freezing. These are the
 * ones a player can actually select — each flag alone, and everything on, which
 * is what M2.10's feel review flies.
 */
export const FLAG_COMBINATIONS: ReadonlyArray<Partial<Flags>> = [
  {},
  { planetCenteredGravity: true },
  { realSpeedOfSound: true },
  { fullISA: true },
  { planetCenteredGravity: true, realSpeedOfSound: true, fullISA: true },
];
