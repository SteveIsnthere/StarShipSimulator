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

/** The 2021 sky colour. The anchor for the whole palette. */
export const SKY_COLOR = { r: 0xa7, g: 0xbd, b: 0xd9 } as const;

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
  update(camera: CameraState, viewport: Viewport, altitude: number): void;
  resize(viewport: Viewport): void;
  destroy(): void;
}

/**
 * A vertical gradient texture, one pixel wide and stretched.
 *
 * Built once. The colours are white-to-transparent so the whole thing can be
 * tinted per frame, which costs nothing, rather than rebuilt.
 */
function createGradientTexture(height = 256): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable for sky gradient');

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  // Zenith is darker, horizon lighter. Values are multipliers on the tint.
  gradient.addColorStop(0, 'rgb(150,150,150)');
  gradient.addColorStop(0.55, 'rgb(215,215,215)');
  gradient.addColorStop(1, 'rgb(255,255,255)');
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

    update(camera, viewport, altitude) {
      if (drawnFor !== viewport.width) {
        gradient.width = viewport.width;
        gradient.height = viewport.height;
        redrawStars(viewport);
        drawnFor = viewport.width;
      }

      gradient.tint = skyTint(altitude);
      stars.alpha = starVisibility(altitude);

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
