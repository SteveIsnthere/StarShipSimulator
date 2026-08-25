/**
 * The world layer: ground, StarBase, scenery, and the pig.
 *
 * Sprites are created once and repositioned each frame. Nothing here allocates
 * on the per-frame path, which CLAUDE.md requires and which the 2021 renderer
 * did not manage — it built a new PIXI.Container per engine shutdown and never
 * removed it.
 */
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { GROUND_OBJECTS, type GroundObject } from './assets';
import { worldToScreen, type CameraState, type Viewport } from './camera';

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
  update(camera: CameraState, viewport: Viewport, speedX: number): void;
}

export function createWorld(textures: Map<string, Texture>): World {
  const container = new Container({ label: 'worldContents' });

  // The ground is a single rectangle redrawn on resize rather than a sprite:
  // it has to cover any viewport at any zoom.
  const ground = new Graphics();
  container.addChild(ground);

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

  let groundWidth = 0;

  return {
    container,

    update(camera: CameraState, viewport: Viewport, speedX: number): void {
      // Ground: a band from y = 0 downward, wide enough to always cover.
      const horizon = worldToScreen(camera, viewport, camera.posX, 0);
      if (groundWidth !== viewport.width) {
        groundWidth = viewport.width;
        ground.clear();
        ground.rect(-viewport.width, 0, viewport.width * 3, viewport.height * 2);
        ground.fill(GROUND_COLOR);
      }
      ground.x = 0;
      ground.y = horizon.y;
      // Hidden when the camera is high enough that the ground is off screen,
      // which saves a full-screen fill on every frame of an ascent.
      ground.visible = horizon.y < viewport.height;

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
