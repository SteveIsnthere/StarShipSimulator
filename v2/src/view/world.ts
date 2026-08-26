/**
 * The world layer: ground, StarBase, scenery, and the pig.
 *
 * Sprites are created once and repositioned each frame. Nothing here allocates
 * on the per-frame path, which CLAUDE.md requires and which the 2021 renderer
 * did not manage — it built a new PIXI.Container per engine shutdown and never
 * removed it.
 */
import { Container, Graphics, Sprite, TilingSprite, type Texture } from 'pixi.js';
import { GROUND_OBJECTS, type GroundObject } from './assets';
import { worldToScreen, type CameraState, type Viewport } from './camera';
import {
  groundTint,
  hazeIntensity,
  horizonSagittaFraction,
  padLightIntensity,
} from './atmosphere-look';
import { skyLightness } from './sky';
import { MOTTLE_TILE, type TerrainTextures } from './terrain';

/** Ground colour, sampled from the 2021 StarBase art. */
export const GROUND_COLOR = 0x9a8c78;

interface Placed {
  readonly object: GroundObject;
  readonly sprite: Sprite;
  /** Current world x — roaming objects move. */
  x: number;
}

export interface World {
  readonly container: Container;
  /** Reposition everything for this frame. */
  update(camera: CameraState, viewport: Viewport, speedX: number, altitude: number): void;
}

/**
 * How many segments the curved horizon is drawn with.
 *
 * Sixteen is enough that the bow reads as a curve rather than a fan at every
 * altitude the game reaches, and few enough that redrawing it costs nothing —
 * which matters, because unlike the flat rectangle it replaced this has to be
 * redrawn whenever the curvature changes rather than only on resize.
 */
const HORIZON_SEGMENTS = 16;

/**
 * @param terrain the generated mottle and ramp (M9.8). Optional, because the
 *   world can be built without a GPU in tests; without it the ground is the flat
 *   fill it was before, which is exactly what those tests were written against.
 */
export function createWorld(textures: Map<string, Texture>, terrain?: TerrainTextures): World {
  const container = new Container({ label: 'worldContents' });

  // The ground is a single rectangle redrawn on resize rather than a sprite:
  // it has to cover any viewport at any zoom.
  const ground = new Graphics();
  container.addChild(ground);

  /*
    THE GROUND STOPS BEING ONE VALUE (M9.8).

    The `Graphics` above still carries the SHAPE — the curved top edge, whose
    sagitta comes from real geometry — and these two carry the surface. The
    mottle is a tiled greyscale noise tinted through `groundTint`, so it can
    never be brighter than the colour the atmosphere says the ground is and can
    never drift from it; the ramp multiplies a vertical gradient over it,
    because flatness is as much a lighting problem as a texture one.

    Both start BELOW the horizon's lowest point rather than at it: the top edge
    is a bow, so a rectangle drawn from the middle of it would hang over the sky
    at the frame's edges. The sliver between the bow and the rectangle keeps the
    flat fill, which at every altitude below about 40 km is a handful of pixels.
  */
  const mottle = terrain
    ? new TilingSprite({ texture: terrain.mottle, width: 1, height: 1 })
    : undefined;
  const ramp = terrain ? new Sprite(terrain.ramp) : undefined;
  if (mottle) container.addChild(mottle);
  if (ramp) {
    // Multiplied, so it darkens the mottle rather than replacing it.
    ramp.blendMode = 'multiply';
    container.addChild(ramp);
  }

  const placed: Placed[] = GROUND_OBJECTS.map((object) => {
    const texture = textures.get(object.src);
    const sprite = new Sprite(texture);
    // Anchored bottom-centre, so an object sits ON the ground at its world x
    // regardless of its height.
    sprite.anchor.set(0.5, 1);
    sprite.label = object.id;
    container.addChild(sprite);
    return { object, sprite, x: object.x };
  });

  /*
    The haze band and the pad glow sit above the ground and below everything
    else, so they are added after it and before the scenery. Both are drawn
    once per size change and then transformed — never per frame.
  */
  const hazeBand = new Graphics();
  hazeBand.blendMode = 'add';
  container.addChild(hazeBand);

  const padGlow = new Graphics();
  padGlow.blendMode = 'add';
  container.addChild(padGlow);

  let groundWidth = 0;
  let groundSagitta = -1;
  let hazeHeight = -1;
  let hazeWidth = -1;
  let padGlowRadius = -1;

  return {
    container,

    update(camera: CameraState, viewport: Viewport, speedX: number, altitude: number): void {
      // Ground: a band from y = 0 downward, wide enough to always cover.
      const horizon = worldToScreen(camera, viewport, camera.posX, 0);
      const lightness = skyLightness(altitude);

      /*
        THE HORIZON BENDS (M6.7).

        It was a rectangle, which is right at sea level and increasingly a lie
        above it: at 100 km the visible ground spans nearly a fifth of a radian
        of the planet and quite obviously curves. The sagitta comes from real
        geometry (view/atmosphere-look.ts) rather than a fudge factor, which is
        why it is imperceptible at 1 km and pronounced at 100 — the same place
        it arrives on an onboard camera.

        Quantised to whole pixels before the redraw check. The curvature changes
        by a fraction of a pixel on most frames of a climb, and rebuilding the
        geometry for a change nobody can see would put a `Graphics` rebuild on
        the per-frame path for nothing.
      */
      const sagitta = Math.round(horizonSagittaFraction(altitude) * viewport.width);
      if (groundWidth !== viewport.width || groundSagitta !== sagitta) {
        groundWidth = viewport.width;
        groundSagitta = sagitta;
        ground.clear();
        if (sagitta <= 0) {
          ground.rect(-viewport.width, 0, viewport.width * 3, viewport.height * 2);
        } else {
          // A bow across three screen widths, so a pan never runs off its end.
          const left = -viewport.width;
          const span = viewport.width * 3;
          ground.moveTo(left, viewport.height * 2);
          for (let i = 0; i <= HORIZON_SEGMENTS; i++) {
            const u = i / HORIZON_SEGMENTS;
            const px = left + span * u;
            // A parabola through (0,0) at the middle and (±1, sagitta) at the
            // edges — indistinguishable from the circle at these angles and far
            // cheaper to evaluate.
            const offset = ((2 * u - 1) * (2 * u - 1)) * sagitta * 3;
            ground.lineTo(px, offset);
          }
          ground.lineTo(left + span, viewport.height * 2);
        }
        ground.fill(GROUND_COLOR);
      }
      ground.x = 0;
      ground.y = horizon.y;
      // The ground dims with the sky. 2021 darkened one and not the other, so
      // the world came apart at the horizon on any hard ascent.
      ground.tint = groundTint(GROUND_COLOR, lightness);
      // Hidden when the camera is high enough that the ground is off screen,
      // which saves a full-screen fill on every frame of an ascent.
      ground.visible = horizon.y < viewport.height;

      if (mottle && ramp) {
        mottle.visible = ground.visible;
        ramp.visible = ground.visible;
        if (ground.visible) {
          // Below the bow's lowest point; see the note where these are built.
          const top = horizon.y + sagitta * 3;
          const height = Math.max(1, viewport.height * 2 - top);
          mottle.x = -viewport.width;
          mottle.y = top;
          mottle.width = viewport.width * 3;
          mottle.height = height;
          /*
            The tile scrolls with the camera so the ground is attached to the
            world rather than to the screen — a stationary texture under a
            moving vehicle is worse than no texture, because it says the ground
            is not moving. Wrapped into one tile so the number stays small.
          */
          const scale = Math.max(0.5, viewport.scale * 0.35);
          mottle.tileScale.set(scale, scale);
          mottle.tilePosition.x = -(camera.posX * viewport.scale) % (MOTTLE_TILE * scale);
          mottle.tint = ground.tint;

          ramp.x = -viewport.width;
          ramp.y = top;
          ramp.width = viewport.width * 3;
          // Over the near half of the visible band, so the change lands where
          // the eye reads distance rather than off the bottom of the screen.
          ramp.height = Math.max(1, (viewport.height - top) * 1.6);
        }
      }

      /*
        The haze band: the visible atmosphere, sitting on the horizon.

        Thin, because the aerosol that scatters light has a scale height around
        1.2 km rather than the 8.5 km of the air itself — which is why it
        vanishes so much sooner than drag does.
      */
      const haze = hazeIntensity(altitude);
      hazeBand.visible = haze > 0.01 && ground.visible;
      if (hazeBand.visible) {
        const bandHeight = Math.max(6, viewport.height * 0.06);
        if (hazeHeight !== bandHeight || groundWidth !== hazeWidth) {
          hazeHeight = bandHeight;
          hazeWidth = groundWidth;
          hazeBand.clear();
          hazeBand.rect(-viewport.width, -bandHeight, viewport.width * 3, bandHeight);
          hazeBand.fill(0xffffff);
        }
        hazeBand.y = horizon.y;
        hazeBand.alpha = haze * 0.35;
        hazeBand.tint = 0xcfe0f2;
      }

      // The pad's own lights, which come up as the sky goes down.
      padGlow.visible = ground.visible && padLightIntensity(lightness) > 0.02;
      if (padGlow.visible) {
        const pad = worldToScreen(camera, viewport, 0, 0);
        padGlow.x = pad.x;
        padGlow.y = pad.y;
        const radius = Math.max(24, 90 * viewport.scale);
        if (padGlowRadius !== Math.round(radius)) {
          padGlowRadius = Math.round(radius);
          padGlow.clear();
          padGlow.circle(0, 0, padGlowRadius);
          padGlow.fill({ color: 0xffc36b, alpha: 0.5 });
        }
        padGlow.alpha = padLightIntensity(lightness) * 0.55;
      }

      const halfWidth = viewport.physicalWidth * 0.5;

      for (const item of placed) {
        if (item.object.roams) {
          // drawMethods.js:155 — when scenery leaves the frame it is moved to
          // the far edge, ahead of travel, so the world is never empty.
          const offScreen = Math.abs(item.x - camera.posX) > halfWidth + item.object.width * 0.5;
          if (offScreen) {
            item.x =
              speedX > 0
                ? camera.posX + halfWidth + item.object.width * 0.5
                : camera.posX - halfWidth - item.object.width * 0.5;
          }
        }

        const screen = worldToScreen(camera, viewport, item.x, 0);
        item.sprite.x = screen.x;
        item.sprite.y = screen.y;
        item.sprite.width = item.object.width * viewport.scale;
        item.sprite.height = item.object.height * viewport.scale;
        // Scenery dims with the ground it stands on, for the same reason.
        item.sprite.tint = groundTint(0xffffff, lightness);

        // Cull off-screen sprites rather than asking the GPU to reject them.
        const halfPx = item.sprite.width * 0.5;
        item.sprite.visible =
          screen.x + halfPx > 0 &&
          screen.x - halfPx < viewport.width &&
          screen.y > 0 &&
          screen.y - item.sprite.height < viewport.height;
      }
    },
  };
}
