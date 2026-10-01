/**
 * Packed 0xRRGGBB arithmetic, in one place.
 *
 * WHY THIS FILE EXISTS. There were three implementations of the same channel
 * unpacking by M9.14: `groundTint` scaled a colour in `atmosphere-look.ts`,
 * `lerpColor` interpolated one inside `particles.ts`, and `mixColour` appeared
 * in `distant-earth.ts` for the ridgelines. Same shifts, same masks, three
 * copies, and one of them rounded while another truncated — so "mix half way
 * between these two colours" had two different answers in the same renderer
 * depending on which layer asked.
 *
 * Pure and allocation-free, because one of the callers is the particle system
 * and runs per particle per frame. Nothing here allocates, and each function is
 * a module-level declaration rather than a closure so that the shape stays
 * monomorphic for the JIT.
 */

/** One channel of a packed colour. */
function channel(colour: number, shift: number): number {
  return (colour >> shift) & 0xff;
}

/**
 * Clamp to a channel's range.
 *
 * Module level, not a closure inside `pack`. It was written as one, which built
 * a function object on every call to `mixColour` and `scaleColour` — both of
 * which run per frame, one of them once per ridgeline — in a file whose own
 * header says nothing here allocates. Exactly the defect `latticeTable` was
 * written to remove from the mottle generator, reintroduced two files away in
 * the same milestone.
 */
function clampChannel(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** Pack three 0..255 channels back into 0xRRGGBB, clamped. */
function pack(r: number, g: number, b: number): number {
  return (clampChannel(r) << 16) | (clampChannel(g) << 8) | clampChannel(b);
}

/**
 * Mix `share` of `b` over `a`, per channel, rounding.
 *
 * The share is clamped rather than wrapped: out-of-range asks for one end or
 * the other, which is what every caller means and what a channel wrapping
 * around to the far end of its range never is.
 */
export function mixColour(a: number, b: number, share: number): number {
  const t = share < 0 ? 0 : share > 1 ? 1 : share;
  return pack(
    Math.round(channel(a, 16) + (channel(b, 16) - channel(a, 16)) * t),
    Math.round(channel(a, 8) + (channel(b, 8) - channel(a, 8)) * t),
    Math.round(channel(a, 0) + (channel(b, 0) - channel(a, 0)) * t),
  );
}

/**
 * Mix without clamping the share, truncating rather than rounding.
 *
 * THE PARTICLE SYSTEM'S VERSION, kept distinct on purpose. It runs per particle
 * per frame with a `t` the emitter guarantees is in range, so the clamp is dead
 * work there; and it has always truncated, so switching it to rounding would
 * shift every particle tint by up to one level. That is invisible, but it is
 * still a change to what the renderer draws, and this file exists to remove
 * duplication rather than to quietly retune the plume.
 */
export function lerpColourFast(a: number, b: number, t: number): number {
  const ar = channel(a, 16);
  const ag = channel(a, 8);
  const ab = channel(a, 0);
  return (
    (((ar + (channel(b, 16) - ar) * t) | 0) << 16) |
    (((ag + (channel(b, 8) - ag) * t) | 0) << 8) |
    ((ab + (channel(b, 0) - ab) * t) | 0)
  );
}

/** Scale every channel by `factor`, rounding and clamping. */
export function scaleColour(colour: number, factor: number): number {
  return pack(
    Math.round(channel(colour, 16) * factor),
    Math.round(channel(colour, 8) * factor),
    Math.round(channel(colour, 0) * factor),
  );
}
