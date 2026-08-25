/**
 * The vehicle: body sprite plus four articulated fins.
 *
 * Geometry ported from render/drawMethods/drawMethods.js:5-18, where every
 * dimension is expressed as a fraction of the drawn ship height — the ratios
 * come from the source artwork's own proportions (818 px tall) and hold at any
 * zoom.
 *
 * The fins are drawn rather than sprited, because they articulate: extension
 * runs 0..100% and the drawn chord follows it. That is what makes a belly flop
 * readable at a glance.
 */
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { STARSHIP_TEXTURE } from './assets';
import { worldToScreen, type CameraState, type Viewport } from './camera';
import { vehicleDiameter, vehicleHeight } from '$core/constants';

/** Fin colour, matching the 2021 art's stainless. */
export const FIN_COLOR = 0xb9bec4;

/** drawMethods.js:5-18 — fin geometry as fractions of drawn ship height. */
const FIN = {
  thickness: 12 / 818,
  front: {
    start: 299 / 818,
    length: 136 / 818,
    width: 0.057,
    shortSide: 23 / 56,
  },
  aft: {
    start: 159 / 818,
    length: 247 / 818,
    width: 0.087,
    shortSide: 51 / 100,
  },
} as const;

export interface VehicleView {
  readonly container: Container;
  update(
    camera: CameraState,
    viewport: Viewport,
    state: {
      readonly altitude: number;
      readonly downRangeDistance: number;
      /** rad */
      readonly pitch: number;
      /** % 0..100 */
      readonly frontFinExtension: number;
      readonly aftFinExtension: number;
    },
  ): void;
}

export function createVehicle(textures: Map<string, Texture>): VehicleView {
  const container = new Container({ label: 'starship' });

  // Fins go behind the body so the hull edge stays clean.
  const finsBack = new Graphics();
  const body = new Sprite(textures.get(STARSHIP_TEXTURE));
  body.anchor.set(0.5, 0.5);

  container.addChild(finsBack, body);

  let lastHeight = -1;
  let lastFront = -1;
  let lastAft = -1;

  return {
    container,

    update(camera, viewport, state): void {
      const screen = worldToScreen(
        camera,
        viewport,
        state.downRangeDistance,
        state.altitude,
      );
      container.x = screen.x;
      container.y = screen.y;
      // World pitch is measured from vertical with positive nose-right; screen
      // rotation is clockwise from up, so the sign flips with the y axis.
      container.rotation = -state.pitch;

      const drawnHeight = vehicleHeight * viewport.scale;
      const drawnWidth = vehicleDiameter * viewport.scale;
      body.width = drawnWidth;
      body.height = drawnHeight;

      // Fins are redrawn only when something about them actually changed —
      // zoom, or an extension. Redrawing four polygons every frame at 120 Hz
      // for a stationary configuration is exactly the kind of waste the
      // performance budget exists to prevent.
      if (
        drawnHeight === lastHeight &&
        state.frontFinExtension === lastFront &&
        state.aftFinExtension === lastAft
      ) {
        return;
      }
      lastHeight = drawnHeight;
      lastFront = state.frontFinExtension;
      lastAft = state.aftFinExtension;

      finsBack.clear();
      drawFinPair(finsBack, drawnHeight, FIN.front, state.frontFinExtension / 100);
      drawFinPair(finsBack, drawnHeight, FIN.aft, state.aftFinExtension / 100);
      finsBack.fill(FIN_COLOR);
    },
  };
}

/**
 * One pair of fins, mirrored about the centreline.
 *
 * Each is a trapezoid: full chord at the root, `shortSide` of it at the tip,
 * scaled outward by how far the fin is extended. At zero extension it collapses
 * to the hull thickness rather than vanishing, because a retracted fin is still
 * a visible strake on the real vehicle.
 */
function drawFinPair(
  g: Graphics,
  drawnHeight: number,
  fin: { start: number; length: number; width: number; shortSide: number },
  extension: number,
): void {
  const thickness = drawnHeight * FIN.thickness;
  const top = -drawnHeight * 0.5 + drawnHeight * (1 - fin.start - fin.length);
  const length = drawnHeight * fin.length;
  const reach = thickness + (drawnHeight * fin.width - thickness) * extension;
  const tipInset = length * (1 - fin.shortSide);

  for (const side of [-1, 1] as const) {
    g.poly([
      0,
      top,
      side * reach,
      top + tipInset * 0.5,
      side * reach,
      top + length - tipInset * 0.5,
      0,
      top + length,
    ]);
  }
}
