/**
 * The sky: an altitude-graded gradient into a starfield, with parallax.
 *
 * The 2021 version darkened the renderer's flat background colour by squaring a
 * lightness factor between 20 km and 80 km, and that is the feel to keep — the
 * moment the blue drains out on a hard ascent is one of the better things about
 * the game. What it did not have was a gradient, stars, or any sense of depth.
 *
 * Three additions, in order of how much they matter:
 *
 *   GRADIENT. A flat fill reads as a wall. Grading from a lighter horizon to a
 *   deeper zenith gives the sky a direction, and the effect strengthens with
 *   altitude, so climbing feels like leaving something.
 *
 *   STARS. They appear as the sky darkens, which is the payoff for the climb.
 *   Positions are seeded, so the same sky comes back on every run.
 *
 *   PARALLAX. Stars are effectively at infinity and barely move; the haze band
 *   near the horizon moves a little. Without it the sky slides with the ground
 *   and the world feels like a painted backdrop.
 *
 * Everything here is drawn once and then transformed. The gradient is a texture
 * built at startup rather than a per-frame fill, because a full-screen gradient
 * every frame is exactly the kind of cost the budget is for.
 */
import { Container, Graphics, Sprite, Texture, type Renderer } from 'pixi.js';
import type { CameraState, Viewport } from './camera';
import type { SunLight } from './sun';

/**
 * The sky at the HORIZON, at sea level. The anchor for the whole palette.
 *
 * WAS 0xa7bdd9, 2021's flat fill, and it was the wrong thing to anchor to — see
 * `createGradientTexture` for the argument. A tint MULTIPLIES, so the anchor has
 * to be the brightest colour the sky ever shows and every other part of the
 * gradient is a fraction of it. Anchoring on a mid-blue meant the zenith could
 * only ever be a darker, greyer version of the same hue, which is what made
 * every frame read as fog.
 */
export const SKY_COLOR = { r: 0xc3, g: 0xd3, b: 0xe2 } as const;

/** pixi_init.js:10-13 — where the blue starts and finishes draining. */
export const DARKEN_START_ALTITUDE = 20_000;
export const DARKEN_COMPLETE_ALTITUDE = 80_000;
export const DARKEN_FRACTION = 0.6;

/**
 * pixi_init.js:478 — how bright the sky is at a given altitude.
 *
 * Linear between the two heights, then held. The squaring happens per channel
 * in `skyTint`, which is what makes the fade feel like dusk rather than like a
 * dimmer switch.
 */
export function skyLightness(altitude: number): number {
  if (altitude < DARKEN_START_ALTITUDE) return 1;
  if (altitude >= DARKEN_COMPLETE_ALTITUDE) return 1 - DARKEN_FRACTION;
  return (
    1 -
    ((altitude - DARKEN_START_ALTITUDE) / (DARKEN_COMPLETE_ALTITUDE - DARKEN_START_ALTITUDE)) *
      DARKEN_FRACTION
  );
}

/** The tint applied to the sky at a given altitude, as 0xRRGGBB. */
export function skyTint(altitude: number): number {
  const lightness = skyLightness(altitude);
  // Squared, exactly as 2021 did: `skyColorR * skyLighteness ** 2`.
  const factor = lightness * lightness;
  const r = Math.round(SKY_COLOR.r * factor);
  const g = Math.round(SKY_COLOR.g * factor);
  const b = Math.round(SKY_COLOR.b * factor);
  return (r << 16) | (g << 8) | b;
}

/**
 * The sky's tint at an altitude under a sun — M11.4.
 *
 * The altitude tint, scaled per channel by the sun's factor. In full daylight
 * the factor is exactly (1, 1, 1) and this returns `skyTint(altitude)` to the
 * bit, which is the identity every existing screenshot was taken under; toward
 * the horizon it warms, and below it the whole palette goes to a deep blue a
 * tenth as bright. Rounded once, after both multiplies, so the two never
 * disagree by a rounding step.
 */
export function skyTintLit(altitude: number, r: number, g: number, b: number): number {
  if (r === 1 && g === 1 && b === 1) return skyTint(altitude);
  const lightness = skyLightness(altitude);
  const factor = lightness * lightness;
  const rr = Math.round(SKY_COLOR.r * factor * r);
  const gg = Math.round(SKY_COLOR.g * factor * g);
  const bb = Math.round(SKY_COLOR.b * factor * b);
  return (rr << 16) | (gg << 8) | bb;
}

/** How visible the stars are: none below the darkening, full once complete. */
export function starVisibility(altitude: number): number {
  if (altitude <= DARKEN_START_ALTITUDE) return 0;
  if (altitude >= DARKEN_COMPLETE_ALTITUDE) return 1;
  return (
    (altitude - DARKEN_START_ALTITUDE) / (DARKEN_COMPLETE_ALTITUDE - DARKEN_START_ALTITUDE)
  );
}

export interface Sky {
  readonly container: Container;
  update(camera: CameraState, viewport: Viewport, altitude: number, sun?: SunLight): void;
  resize(viewport: Viewport): void;
  destroy(): void;
}

/**
 * The gradient's stops, zenith first, as multipliers on `SKY_COLOR`.
 *
 * Exported so `tests/view/sky.test.ts` can assert the thing that matters about
 * them — that they carry HUE and not only value — without needing a canvas.
 */
export const SKY_GRADIENT_STOPS = [
  { at: 0, r: 103, g: 152, b: 219 },
  { at: 0.35, r: 150, g: 186, b: 231 },
  { at: 0.7, r: 210, g: 228, b: 247 },
  { at: 1, r: 255, g: 255, b: 255 },
] as const;

/**
 * A vertical gradient texture, one pixel wide and stretched.
 *
 * THE STOPS CARRY HUE, NOT JUST VALUE, and that is the whole of this function.
 *
 * They were greyscale — 150, 215, 255 — which means the gradient could only ever
 * make the sky DARKER toward the zenith, never bluer. Multiply one colour by a
 * scalar and you get the same hue at a different brightness, so the sky ran from
 * a grey-blue horizon to a greyer, darker grey-blue overhead, and read as fog in
 * every screenshot this project has ever taken. A real sky changes hue as well:
 * deep saturated blue overhead, pale and almost white where the air is thickest.
 *
 * Per-channel stops make that possible under the same single tint. Against
 * `SKY_COLOR` at sea level they produce:
 *
 *   zenith   #4f7ec2   a blue that is actually blue
 *   mid      #739acd
 *   upper    #a1bddb
 *   horizon  #c3d3e2   pale, where the line of sight is longest
 *
 * And the altitude fade still works exactly as it did, because it is still one
 * multiply: `skyTint` darkens the anchor and every stop follows it down.
 */
function createGradientTexture(height = 256): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable for sky gradient');

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  for (let i = 0; i < SKY_GRADIENT_STOPS.length; i++) {
    const stop = SKY_GRADIENT_STOPS[i]!;
    gradient.addColorStop(stop.at, `rgb(${stop.r},${stop.g},${stop.b})`);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, height);

  return Texture.from(canvas);
}

/** Deterministic star positions, so the same sky returns every run. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

export function createSky(renderer: Renderer, starCount = 220, seed = 0x5741_4c4b): Sky {
  void renderer;
  const container = new Container({ label: 'skyContents' });

  const gradient = new Sprite(createGradientTexture());
  gradient.anchor.set(0, 0);
  container.addChild(gradient);

  // Stars: one Graphics for all of them, since they never move relative to each
  // other. Parallax is applied to the container, not per star.
  const stars = new Graphics();
  const random = makeRandom(seed);
  /** Unit-square positions, scaled to the viewport on resize. */
  const starPositions: Array<{ u: number; v: number; r: number; a: number }> = [];
  for (let i = 0; i < starCount; i++) {
    starPositions.push({
      u: random(),
      // Biased upward: more stars toward the zenith, which reads as a dome.
      v: random() * random(),
      r: 0.6 + random() * 1.4,
      a: 0.35 + random() * 0.65,
    });
  }
  container.addChild(stars);

  let drawnFor = -1;

  const redrawStars = (viewport: Viewport): void => {
    stars.clear();
    for (const s of starPositions) {
      stars.circle(s.u * viewport.width, s.v * viewport.height, s.r);
      stars.fill({ color: 0xffffff, alpha: s.a });
    }
  };

  return {
    container,

    resize(viewport) {
      gradient.width = viewport.width;
      gradient.height = viewport.height;
      redrawStars(viewport);
      drawnFor = viewport.width;
    },

    update(camera, viewport, altitude, sun) {
      if (drawnFor !== viewport.width) {
        gradient.width = viewport.width;
        gradient.height = viewport.height;
        redrawStars(viewport);
        drawnFor = viewport.width;
      }

      // M11.4: the hour has a say. By day this is `skyTint(altitude)` exactly.
      gradient.tint = sun ? skyTintLit(altitude, sun.skyR, sun.skyG, sun.skyB) : skyTint(altitude);
      // Stars by altitude or by night, whichever shows more of them.
      stars.alpha = Math.max(starVisibility(altitude), sun ? sun.stars : 0);

      // Parallax. Stars sit effectively at infinity, so they shift by a
      // thousandth of the camera's motion - enough to feel like depth, little
      // enough that they never visibly slide.
      stars.x = -(camera.posX % (viewport.physicalWidth * 1000)) * viewport.scale * 0.001;
      stars.y = (camera.posY * viewport.scale) * 0.0006;
    },

    destroy() {
      container.destroy({ children: true });
    },
  };
}
