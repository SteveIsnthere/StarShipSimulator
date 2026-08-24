/**
 * Counter-based seeded randomness.
 *
 * `Math.random()` is banned in core/ (wall 3) because unseeded draws make golden
 * fixtures impossible: the same state and the same dt would produce different
 * trajectories. But a conventional seeded PRNG carries hidden mutable state,
 * which would break `step()`'s purity just as thoroughly.
 *
 * So this is counter-based: a value is a pure hash of (seed, stream, counter).
 * Three properties follow, and all three matter here.
 *
 *   1. **Purity.** The generator has no hidden state. The counters live in
 *      SimState, so a SimState fully determines every future draw.
 *   2. **Seek and rewind.** The Nth draw can be computed without producing the
 *      first N-1. Rewinding the black box or replaying a golden from the middle
 *      needs no replay of the RNG.
 *   3. **Stream independence.** Each named stream hashes with its own key, so
 *      adding a draw to one stream cannot shift another's sequence. Without
 *      this, adding a single new random effect anywhere would invalidate every
 *      committed fixture.
 *
 * Sim streams and render-effect randomness never share a stream (CLAUDE.md).
 */

/**
 * The named streams. Adding one here cannot disturb the others' sequences.
 *
 * `ignitionDelay` and `ignitionFailure` are the only two draws in the 2021
 * simulation — physics.js:452 and physics.js:457.
 */
export type StreamName = 'ignitionDelay' | 'ignitionFailure';

export const STREAM_NAMES: readonly StreamName[] = ['ignitionDelay', 'ignitionFailure'];

/** RNG state as stored in SimState. Counters advance; the seed does not. */
export interface RngState {
  /** uint32. Same seed + same draws => same trajectory, always. */
  readonly seed: number;
  /** Draws taken from each stream so far. */
  counters: Record<StreamName, number>;
}

/** A fresh RNG state with all counters at zero. */
export function createRng(seed: number): RngState {
  return {
    seed: seed >>> 0,
    counters: { ignitionDelay: 0, ignitionFailure: 0 },
  };
}

/** FNV-1a over the stream name, so each stream hashes with a distinct key. */
function streamKey(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const STREAM_KEYS: Record<StreamName, number> = {
  ignitionDelay: streamKey('ignitionDelay'),
  ignitionFailure: streamKey('ignitionFailure'),
};

/**
 * Murmur3-style 32-bit finaliser. Strong avalanche: flipping one input bit
 * flips about half the output bits, which is what makes consecutive counters
 * produce uncorrelated values rather than a visible ramp.
 */
function mix32(x: number): number {
  let h = x >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0xd35a2d97);
  return (h ^ (h >>> 15)) >>> 0;
}

/** The hash itself: (seed, stream, counter) -> uint32. */
export function hash(seed: number, stream: StreamName, counter: number): number {
  const key = STREAM_KEYS[stream];
  let h = mix32((seed >>> 0) ^ key);
  h = mix32(h ^ (counter >>> 0));
  h = mix32(h ^ Math.imul(counter >>> 0, 0x9e3779b9));
  return h >>> 0;
}

/**
 * The value of a stream's Nth draw, without advancing anything.
 *
 * Pure in every argument. This is the seek primitive: `peek(rng, s, 5000)` costs
 * the same as `peek(rng, s, 0)`.
 *
 * @returns a float in [0, 1).
 */
export function peek(rng: RngState, stream: StreamName, counter: number): number {
  // Divide by 2^32 rather than masking to 53 bits: the extra bits buy nothing
  // here and the simple form is easier to verify against a reimplementation.
  return hash(rng.seed, stream, counter) / 4294967296;
}

/**
 * Take the next value from a stream, advancing that stream's counter.
 *
 * Mutates `rng.counters[stream]`. That is not a purity violation: `step()`
 * works on its own copy of SimState, so the same input state always yields the
 * same output state. It is the copy's counter that moves.
 *
 * @returns a float in [0, 1).
 */
export function draw(rng: RngState, stream: StreamName): number {
  const value = peek(rng, stream, rng.counters[stream]);
  rng.counters[stream] += 1;
  return value;
}

/** Structural copy. Used when forking a state for prediction or replay. */
export function cloneRng(rng: RngState): RngState {
  return { seed: rng.seed, counters: { ...rng.counters } };
}
