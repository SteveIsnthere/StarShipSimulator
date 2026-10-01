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
import { Container, Graphics, Mesh, MeshGeometry, Sprite, type Shader, type Texture } from 'pixi.js';
import { STARSHIP_TEXTURE } from './assets';
import { worldToScreen, type CameraState, type Viewport } from './camera';
import { flatLighting, type VehicleLighting } from './lighting';
import { lightInVehicleFrame, type SunLight } from './sun';
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
    /** M11.4: the sun, for the hull's shading. Without it the sprite is drawn flat. */
    sun?: SunLight,
  ): void;
}

/**
 * @param lighting M11.4 — the hull's normal map and shader. With it the body
 *   is a mesh lit by the sun; without it (tests, or a sprite that could not
 *   be read back) it is the plain sprite it always was.
 */
export function createVehicle(
  textures: Map<string, Texture>,
  lighting?: VehicleLighting,
): VehicleView {
  const container = new Container({ label: 'starship' });

  // Fins go behind the body so the hull edge stays clean.
  const finsBack = new Graphics();
  const texture = textures.get(STARSHIP_TEXTURE);
  /*
    THE HULL IS A LIT MESH (M11.4). A unit quad, scaled to the drawn size each
    frame, drawn by the lighting shader with the sprite and its normal map.
    The plain sprite path is kept because it costs nothing and is what every
    test that builds a vehicle without a GPU sees.
  */
  let sprite: Sprite | undefined;
  let mesh: Mesh<MeshGeometry, Shader> | undefined;
  if (lighting && texture) {
    const geometry = new MeshGeometry({
      positions: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    mesh = new Mesh<MeshGeometry, Shader>({ geometry, shader: lighting.shader, texture });
    mesh.label = 'hull';
    container.addChild(finsBack, mesh);
  } else {
    sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0.5);
    container.addChild(finsBack, sprite);
  }
  const light = { x: 0, y: 1, z: 0 };
  let lastFinTint = -1;

  let lastHeight = -1;
  let lastFront = -1;
  let lastAft = -1;

  return {
    container,

    update(camera, viewport, state, sun): void {
      const screen = worldToScreen(
        camera,
        viewport,
        state.downRangeDistance,
        state.altitude,
      );
      container.x = screen.x;
      container.y = screen.y;
      /*
        World pitch is measured from vertical, positive nose toward +x, which
        is screen-right — and Pixi's rotation is positive CLOCKWISE on screen,
        so a positive pitch is a positive rotation, unflipped. The port wrote
        `-state.pitch`, reasoning that the sign "flips with the y axis"; it
        does not, because the world's pitch was already defined as a
        visually clockwise angle. Every hull was drawn leaning the wrong way
        for ten milestones while the HUD's attitude chevron leaned the right
        way, and nothing measured which. M11.5 found it, because the plasma
        sheath is the first asymmetric thing the hull's frame has carried.
      */
      container.rotation = state.pitch;

      const drawnHeight = vehicleHeight * viewport.scale;
      const drawnWidth = vehicleDiameter * viewport.scale;
      if (sprite) {
        sprite.width = drawnWidth;
        sprite.height = drawnHeight;
      } else if (mesh) {
        mesh.scale.set(drawnWidth, drawnHeight);
      }

      // M11.4: the sun in the hull's own frame, and the fins lit as flat
      // plates facing the viewer. The fin tint is a grey and cannot brighten,
      // so the flat lighting is clamped at one; the hull's shader is not.
      if (sun && lighting) {
        lightInVehicleFrame(sun, state.pitch, light);
        lighting.set(light.x, light.y, light.z, sun.daylight);
        const lit = Math.min(1, flatLighting(sun.south, sun.daylight));
        const shade = Math.round(255 * lit);
        const tint = (shade << 16) | (shade << 8) | shade;
        if (tint !== lastFinTint) {
          lastFinTint = tint;
          finsBack.tint = tint;
        }
      }

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
