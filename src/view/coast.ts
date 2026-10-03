/** Authored coastal depiction, not a geographic survey. Near geometry is in
 * metres at the unchanged pad origin; the far band shares distant-earth's
 * explicitly compressed projection. No fetched asset or simulation state. */
import { starBaseXPos } from '$core/constants';
import { Container, Graphics } from 'pixi.js';
import type { CameraState, Viewport } from './camera';
import { groundDaylight, type SunLight } from './sun';
import { scaleColour } from './colour';
import { MOTTLE_MEAN } from './terrain';

export const OCEAN_COLOUR = 0x284a5c;

export function createCoast() {
  const container = new Container({ label: 'coast' });
  const ocean = new Graphics({ label: 'coast-ocean' });
  ocean.poly([160, 0, 12000, 0, 12000, 3000, 240, 3000, 185, 180, 145, 65]).fill(0xffffff);
  const shore = new Graphics({ label: 'coast-shore' });
  shore.poly([145, 0, 160, 0, 145, 65, 185, 180, 240, 3000, 228, 3000, 173, 180, 133, 65]).fill(0xffffff);
  const pad = new Graphics({ label: 'coast-pad' });
  pad.rect(-48, 0, 96, 9).rect(-600, 14, 695, 5).rect(80, 0, 7, 80).fill(0xffffff);
  // Expansion joints and service apron, bounded startup geometry.
  for (let x = -40; x < 48; x += 16) pad.moveTo(x, 0).lineTo(x, 9);
  pad.stroke({ color: 0x77818a, width: 0.2 });
  const lights = new Graphics({ label: 'coast-lights' });
  lights.blendMode = 'add';
  for (const x of [-45, 45, 85]) {
    lights.ellipse(x, 2, 6, 2).fill({ color: 0xffbd74, alpha: 0.3 });
    lights.rect(x - 0.3, 0, 0.6, 0.7).fill(0xffdc99);
  }
  container.addChild(ocean, shore, pad, lights);
  for (const node of container.children) node.x = starBaseXPos;
  const assets = [
    { node: ocean, left: 133, right: 12000, depth: 3000, colour: OCEAN_COLOUR },
    { node: shore, left: 133, right: 240, depth: 3000, colour: 0xa8a086 },
    { node: pad, left: -600, right: 95, depth: 80, colour: 0xadb2b3 },
    { node: lights, left: -51, right: 91, depth: 5, colour: 0xffffff },
  ];
  return {
    container,
    update(camera: CameraState, viewport: Viewport, sun: SunLight) {
      container.position.set(viewport.width / 2 - (camera.posX + camera.shakeX) * viewport.scale,
        viewport.height / 2 + (camera.posY + camera.shakeY) * viewport.scale);
      container.scale.set(viewport.scale);
      const light = groundDaylight(sun);
      for (const asset of assets) {
        asset.node.visible = container.x + (starBaseXPos + asset.right) * viewport.scale > 0
          && container.x + (starBaseXPos + asset.left) * viewport.scale < viewport.width
          && container.y < viewport.height && container.y + asset.depth * viewport.scale > 0;
        asset.node.tint = asset.node === lights ? 0xffffff : scaleColour(asset.colour, light * MOTTLE_MEAN);
      }
      lights.alpha = 1 - sun.daylight;
    },
  };
}

/** Coastal depth in the existing compressed far projection. Rebuild only on
 * resize; the caller supplies the original curved ground mask and terminator. */
export function createDistantCoast(mask: Graphics) {
  const container = new Container({ label: 'distant-coast' });
  container.mask = mask;
  const ocean = new Graphics(), shore = new Graphics();
  container.addChild(shore, ocean);
  let width = -1, height = -1;
  return {
    container,
    update(viewport: Viewport, lineY: number, tint: number) {
      if (width !== viewport.width || height !== viewport.height) {
        width = viewport.width; height = viewport.height;
        ocean.clear(); shore.clear();
        const edge = width * 0.57;
        const beach = Math.max(0.5, width * 0.0015);
        ocean.moveTo(edge, 0).lineTo(width * 2, 0).lineTo(width * 2, height * 2)
          .lineTo(edge - width * 0.1, height * 2)
          .bezierCurveTo(edge + width * 0.05, height * 1.4, edge + width * 0.06, height * 0.45, edge, 0)
          .closePath().fill(0xffffff);
        shore.moveTo(edge - beach, 0).lineTo(edge, 0)
          .bezierCurveTo(edge + width * 0.06, height * 0.45, edge + width * 0.05, height * 1.4,
            edge - width * 0.1, height * 2)
          .lineTo(edge - width * 0.1 - beach, height * 2)
          .bezierCurveTo(edge + width * 0.05 - beach, height * 1.4,
            edge + width * 0.06 - beach, height * 0.45, edge - beach, 0)
          .closePath().fill(0xb7b198);
      }
      container.y = lineY;
      ocean.tint = tint;
    },
  };
}
