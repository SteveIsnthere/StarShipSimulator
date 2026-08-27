/**
 * M9.8: the ground and the far earth, generated rather than filled.
 *
 * WHAT WAS WRONG. `world.ts` filled one `Graphics` with `GROUND_COLOR` and
 * `distant-earth.ts` filled another with white, so at any altitude where the
 * ground is in frame the lower part of the screen was ONE VALUE. Measured by the
 * harness at six kilometres: luma spread 0.47, a single tone bucket, and one
 * 4-bit colour bin holding 100% of the band. That is not a stylistic choice, it
 * is an absence — and it is the thing no screenshot ever said out loud, because
 * a flat brown band at the bottom of a picture reads as ground.
 *
 * WHAT REPLACES IT. Two generated textures, both greyscale and both TINTED
 * THROUGH THE EXISTING `groundTint` PATH rather than coloured here — which is
 * the constraint that matters. M6.7 made the ground dim with the sky because
 * 2021 darkened one and not the other and the world came apart at the horizon;
 * a terrain fill that picked its own colours would reintroduce exactly that, one
 * milestone later and harder to see.
 *
 *   MOTTLE  a tileable low-frequency noise, drawn as a TilingSprite. Its values
 *           run from about three quarters to full, so tinting multiplies it into
 *           a mottled version of whatever colour the atmosphere says the ground
 *           is, and can never be brighter than that colour.
 *   RAMP    a vertical gradient, stretched over the band. Flatness is as much a
 *           lighting problem as a texture one: real ground is lighter toward the
 *           horizon, where more air is between it and the eye, and darker
 *           underfoot.
 *
 * Generated at runtime from `textureRandom`, like the particle atlas and the
 * cloud deck's jitter — so no art file ships, the asset budget does not move,
 * and two players see the same terrain.
 */
import { Texture, TextureSource } from 'pixi.js';
import { textureRandom } from './particles';

/** px — the mottle tile. Power of two, and big enough that the repeat is not a pattern. */
export const MOTTLE_TILE = 256;

/** The darkest the mottle goes, as a fraction of the tint colour. */
export const MOTTLE_FLOOR = 0.5;

/** How far the summed octaves are pushed away from their mean. See the use. */
export const MOTTLE_CONTRAST = 2.3;

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * Tileable value noise: the lattice wraps, so the tile joins itself seamlessly.
 *
 * The wrap is the whole reason this is not `particles.ts`'s copy — that one
 * wraps too, but it is private to that module and a shared one would be a
 * dependency between two things that only happen to want the same three lines.
 */
/**
 * Lattice wrap, hoisted out of `tileNoise`.
 *
 * It was a closure built per call, and `tileNoise` is called once per octave
 * per texel: at a 256 px tile and four octaves that is 262,144 closures for one
 * texture. Same arithmetic, same bits out — this is a refactor of where the
 * function lives, not of what it computes.
 */
function wrapLattice(n: number, lattice: number): number {
  return ((n % lattice) + lattice) % lattice;
}

/**
 * One octave's lattice, hashed once instead of sixteen times per texel.
 *
 * `tileNoise` needs four corner values per sample and `writeMottleTile` samples
 * four octaves per texel, so a 256 px tile was doing 1,048,576 hash evaluations
 * for one image — and a lattice only HAS `lattice * lattice` distinct values,
 * at most 841 of them for the finest octave here. Every one was being recomputed
 * hundreds of times.
 *
 * This is why it matters: the generation is a one-off at mount, but
 * `tests/view/perf.test.ts` caps the whole set at 120 ms because a page that
 * hitches before its first frame is worse than one that fetches an image. The
 * 256 px four-octave tile landed that at 268 ms under load. Same arithmetic,
 * same bits out — only the number of times each value is computed changes.
 */
function latticeTable(lattice: number, salt: number): Float64Array {
  const table = new Float64Array(lattice * lattice);
  for (let y = 0; y < lattice; y++) {
    for (let x = 0; x < lattice; x++) {
      table[y * lattice + x] = textureRandom(x, y, salt);
    }
  }
  return table;
}

/** `tileNoise`, reading a precomputed lattice. Identical arithmetic. */
function tiledFromTable(u: number, v: number, lattice: number, table: Float64Array): number {
  const x = u * lattice;
  const y = v * lattice;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);
  const wx0 = wrapLattice(x0, lattice);
  const wy0 = wrapLattice(y0, lattice);
  const wx1 = wrapLattice(x0 + 1, lattice);
  const wy1 = wrapLattice(y0 + 1, lattice);
  const c00 = table[wy0 * lattice + wx0]!;
  const c10 = table[wy0 * lattice + wx1]!;
  const c01 = table[wy1 * lattice + wx0]!;
  const c11 = table[wy1 * lattice + wx1]!;
  const top = c00 + (c10 - c00) * fx;
  const bottom = c01 + (c11 - c01) * fx;
  return top + (bottom - top) * fy;
}


/**
 * Write the mottle tile into an RGBA buffer.
 *
 * PURE, and separate from anything that touches a GPU, so
 * `tests/view/terrain.test.ts` can measure the tone spread it produces in Node —
 * which is the number M9.8 exists to move, and it would be absurd to have to
 * open a browser to read it.
 *
 * Three octaves, each half the amplitude of the last: one that gives the band
 * broad regions, one that breaks those up, one that keeps it from looking
 * airbrushed at close range.
 */
export function writeMottleTile(size: number, out: Uint8ClampedArray): void {
  // Each octave's lattice, hashed once — see `latticeTable`.
  const coarse = latticeTable(2, 0x7e44);
  const mid = latticeTable(5, 0x1c05);
  const fine = latticeTable(13, 0x3b91);
  const finest = latticeTable(29, 0x6d17);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      /*
        FOUR OCTAVES, COARSE-LED, ON A TILE TWICE AS BIG.

        The first half of the look pass weighted three octaves hard toward the
        coarse one — 0.74/0.18/0.08 — because the fine detail was invisible from
        a kilometre up and the broad regions were not. That was half right and it
        made the other half worse: from low down the ground became a smooth
        beige blur with nothing in it at all, which is what the world-only
        screenshots showed the moment the HUD came off them.
        Both readings are true at once and neither weighting can serve both,
        because the problem was never the weights — it was that a 128 px tile
        magnified to 300 px on screen has no fine detail LEFT to weight. At 256
        it does, and a fourth octave at 29 periods gives the foreground
        something to be made of while the 2-period octave still carries the
        view from altitude.

        And the doubled tile halves how often the pattern repeats across a
        screen, which is the other thing the 4 km frame showed: at six repeats
        the eye finds the grid and the ground reads as wallpaper.
      */
      const noise =
        0.56 * tiledFromTable(u, v, 2, coarse) +
        0.22 * tiledFromTable(u, v, 5, mid) +
        0.14 * tiledFromTable(u, v, 13, fine) +
        0.08 * tiledFromTable(u, v, 29, finest);
      /*
        CONTRAST-STRETCHED, because summed octaves are not uniform. Three noises
        added tend to their mean, so the raw sum sat between 0.36 and 0.66 and
        the tile came out with a standard deviation of 9 of 255 — visible only
        to an instrument. Pushing it out from the midpoint restores the range
        that having three octaves was supposed to buy.
      */
      const stretched = Math.max(0, Math.min(1, (noise - 0.5) * MOTTLE_CONTRAST + 0.5));
      const value = MOTTLE_FLOOR + (1 - MOTTLE_FLOOR) * stretched;
      const level = Math.round(Math.max(0, Math.min(1, value)) * 255);
      const i = (y * size + x) * 4;
      out[i] = level;
      out[i + 1] = level;
      out[i + 2] = level;
      out[i + 3] = 255;
    }
  }
}

/** How dark the foreground goes relative to the horizon, at the bottom of the ramp. */
export const RAMP_FOREGROUND = 0.72;
/** px — the ramp's height. Stretched to the band; only its shape matters. */
export const RAMP_HEIGHT = 64;

/**
 * Write the vertical value ramp: bright at the top, `RAMP_FOREGROUND` at the
 * bottom, with a curve rather than a straight line.
 *
 * Squared, so most of the change happens in the first third below the horizon —
 * which is where the air actually thins out along the line of sight. A linear
 * ramp puts the change in the middle of the band, where it reads as a band of
 * its own rather than as distance.
 */
export function writeGroundRamp(height: number, out: Uint8ClampedArray): void {
  for (let y = 0; y < height; y++) {
    const t = height <= 1 ? 0 : y / (height - 1);
    const value = 1 - (1 - RAMP_FOREGROUND) * (t * t);
    const level = Math.round(Math.max(0, Math.min(1, value)) * 255);
    const i = y * 4;
    out[i] = level;
    out[i + 1] = level;
    out[i + 2] = level;
    out[i + 3] = 255;
  }
}

/** px — the haze ramp's height. Stretched; only its shape matters. */
export const HAZE_RAMP_HEIGHT = 64;

/**
 * Write the aerial-perspective ramp: OPAQUE at the horizon, transparent below.
 *
 * THE HARD LINE THIS EXISTS TO REMOVE. The ground's top edge met the sky at a
 * one-pixel step, so every frame with ground in it had a dead-straight seam
 * across the middle — the single most artificial thing left in the picture, and
 * the reason a 1 km shot read as a brown rectangle under a grey one rather than
 * as distance. Real ground does not stop at the horizon, it dissolves into the
 * air in front of it, and the amount it dissolves by is how far away it is.
 *
 * Alpha rather than value, because this is drawn OVER the terrain in the sky's
 * own colour: it is the air between the eye and the ground, not a change to the
 * ground. Cubed, so the wash is dense in the first few percent below the horizon
 * and effectively gone by a third of the way down — which is where the line of
 * sight stops being nearly tangential.
 */
export function writeHazeRamp(height: number, out: Uint8ClampedArray): void {
  for (let y = 0; y < height; y++) {
    const t = height <= 1 ? 0 : y / (height - 1);
    // Squared rather than cubed: the cube was gone within forty pixels and left
    // a second, softer step where it ended. This carries further down.
    const fade = (1 - t) ** 2;
    const i = y * 4;
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = Math.round(Math.max(0, Math.min(1, fade)) * 255);
  }
}

/**
 * Write the limb ramp: transparent at the top, OPAQUE at the bottom.
 *
 * The horizon haze's mirror, and a separate texture rather than the same one
 * flipped because the curves are not the same. The haze is a wash laid over
 * ground and wants to be dense at the join and gone quickly; the limb is a
 * glow sitting ON the horizon line and seen from outside the air, so it wants
 * to be brightest in the last few percent above the line and fall away as a
 * tail. Cubed, which is what makes it a thin bright arc rather than a
 * gradient — the atmosphere is a hundred kilometres thick against a horizon
 * eleven hundred kilometres away.
 */
export function writeLimbRamp(height: number, out: Uint8ClampedArray): void {
  for (let y = 0; y < height; y++) {
    const t = height <= 1 ? 1 : y / (height - 1);
    const glow = t * t * t;
    const i = y * 4;
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = Math.round(Math.max(0, Math.min(1, glow)) * 255);
  }
}

/** Both generated terrain textures, and the haze wash that joins them to the sky. */
export interface TerrainTextures {
  /** Tileable mottle, `MOTTLE_TILE` square. */
  readonly mottle: Texture;
  /** A one-pixel-wide vertical ramp, stretched to whatever band needs it. */
  readonly ramp: Texture;
  /** A one-pixel-wide alpha ramp, opaque at the top. See `writeHazeRamp`. */
  readonly haze: Texture;
  /** A one-pixel-wide alpha ramp, opaque at the BOTTOM. See `writeLimbRamp`. */
  readonly limb: Texture;
}

/** Build them. Called once, at mount. */
export function createTerrainTextures(): TerrainTextures {
  const mottleBuffer = new Uint8ClampedArray(MOTTLE_TILE * MOTTLE_TILE * 4);
  writeMottleTile(MOTTLE_TILE, mottleBuffer);
  const mottleCanvas = document.createElement('canvas');
  mottleCanvas.width = MOTTLE_TILE;
  mottleCanvas.height = MOTTLE_TILE;
  const mottleCtx = mottleCanvas.getContext('2d');
  if (!mottleCtx) throw new Error('2d context unavailable for the terrain mottle');
  const mottleImage = mottleCtx.createImageData(MOTTLE_TILE, MOTTLE_TILE);
  mottleImage.data.set(mottleBuffer);
  mottleCtx.putImageData(mottleImage, 0, 0);
  const mottle = Texture.from(mottleCanvas);
  // Repeat, or a TilingSprite of it shows one tile and a smear.
  (mottle.source as TextureSource).addressMode = 'repeat';

  const rampBuffer = new Uint8ClampedArray(RAMP_HEIGHT * 4);
  writeGroundRamp(RAMP_HEIGHT, rampBuffer);
  const rampCanvas = document.createElement('canvas');
  rampCanvas.width = 1;
  rampCanvas.height = RAMP_HEIGHT;
  const rampCtx = rampCanvas.getContext('2d');
  if (!rampCtx) throw new Error('2d context unavailable for the terrain ramp');
  const rampImage = rampCtx.createImageData(1, RAMP_HEIGHT);
  rampImage.data.set(rampBuffer);
  rampCtx.putImageData(rampImage, 0, 0);
  const ramp = Texture.from(rampCanvas);

  const hazeBuffer = new Uint8ClampedArray(HAZE_RAMP_HEIGHT * 4);
  writeHazeRamp(HAZE_RAMP_HEIGHT, hazeBuffer);
  const hazeCanvas = document.createElement('canvas');
  hazeCanvas.width = 1;
  hazeCanvas.height = HAZE_RAMP_HEIGHT;
  const hazeCtx = hazeCanvas.getContext('2d');
  if (!hazeCtx) throw new Error('2d context unavailable for the horizon haze');
  const hazeImage = hazeCtx.createImageData(1, HAZE_RAMP_HEIGHT);
  hazeImage.data.set(hazeBuffer);
  hazeCtx.putImageData(hazeImage, 0, 0);
  const haze = Texture.from(hazeCanvas);

  const limbBuffer = new Uint8ClampedArray(HAZE_RAMP_HEIGHT * 4);
  writeLimbRamp(HAZE_RAMP_HEIGHT, limbBuffer);
  const limbCanvas = document.createElement('canvas');
  limbCanvas.width = 1;
  limbCanvas.height = HAZE_RAMP_HEIGHT;
  const limbCtx = limbCanvas.getContext('2d');
  if (!limbCtx) throw new Error('2d context unavailable for the limb');
  const limbImage = limbCtx.createImageData(1, HAZE_RAMP_HEIGHT);
  limbImage.data.set(limbBuffer);
  limbCtx.putImageData(limbImage, 0, 0);
  const limb = Texture.from(limbCanvas);

  return { mottle, ramp, haze, limb };
}
