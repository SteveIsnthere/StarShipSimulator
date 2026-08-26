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
export const MOTTLE_TILE = 128;

/** The darkest the mottle goes, as a fraction of the tint colour. */
export const MOTTLE_FLOOR = 0.58;

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
function tileNoise(u: number, v: number, lattice: number, salt: number): number {
  const x = u * lattice;
  const y = v * lattice;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);
  const wrap = (n: number) => ((n % lattice) + lattice) % lattice;
  const c00 = textureRandom(wrap(x0), wrap(y0), salt);
  const c10 = textureRandom(wrap(x0 + 1), wrap(y0), salt);
  const c01 = textureRandom(wrap(x0), wrap(y0 + 1), salt);
  const c11 = textureRandom(wrap(x0 + 1), wrap(y0 + 1), salt);
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
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const noise =
        0.62 * tileNoise(u, v, 2, 0x7e44) +
        0.26 * tileNoise(u, v, 5, 0x1c05) +
        0.12 * tileNoise(u, v, 13, 0x3b91);
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

/** Both generated terrain textures. */
export interface TerrainTextures {
  /** Tileable mottle, `MOTTLE_TILE` square. */
  readonly mottle: Texture;
  /** A one-pixel-wide vertical ramp, stretched to whatever band needs it. */
  readonly ramp: Texture;
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

  return { mottle, ramp };
}
