/**
 * Re-entry — M11.5: the plasma sheath and the onboard inset.
 *
 * WHAT WAS WRONG. At 80 km the vehicle is a few pixels and the plasma is a
 * trail of dots streaming behind it (`docs/reentry.png`). `thermalPower` and
 * `angleOfAttack` are both in SimState and nothing drew a sheath from them:
 * the thing a re-entry looks like — a shell of ionised air wrapped around the
 * windward face — was absent, and at that scale the vehicle could not have
 * shown it anyway.
 *
 * TWO THINGS, ONE MODEL.
 *
 *   THE SHEATH. A quad around the hull, drawn by a shader. The hull is a
 *   capsule in its own frame; the glow is a function of the distance outside
 *   that capsule, scaled by `thermalPower` against the structural limit, and
 *   gated to the WINDWARD side by the angle of attack: the air arrives from
 *   the direction of motion, which in the hull's frame is `(-sin α, cos α)`,
 *   and a face that does not meet it does not glow. Additive, so it wraps the
 *   hull rather than sitting on top of it.
 *
 *   THE INSET. A second view of the same vehicle, large, in the corner: its
 *   own camera centred on the vehicle at a fixed scale, its own instance of
 *   the lit hull and its own sheath, shown only while there is a sheath to
 *   show. The main view keeps the world; the inset keeps the vehicle legible.
 *   The trajectory map is the precedent (M7.1): a scale the main view cannot
 *   reach gets a second display.
 *
 * The pure parts — the windward vector, the visibility hysteresis, the layout
 * — are exported and tested in node. Everything per frame is a uniform write
 * or a transform; nothing allocates.
 */
import { Container, GlProgram, Graphics, Mesh, MeshGeometry, Shader, type Texture } from 'pixi.js';
import {
  BASE_VERTICAL_PROPORTION,
  MAX_VEHICLE_DRAW_HEIGHT,
  MIN_VEHICLE_DRAW_HEIGHT,
  type CameraState,
  type MutableViewport,
  type Viewport,
} from './camera';
import type { VehicleLighting } from './lighting';
import { skyTintLit } from './sky';
import type { SunLight } from './sun';
import { createVehicle, type VehicleView } from './vehicle';
import { vehicleDiameter, vehicleHeight } from '$core/constants';


/**
 * The direction the air arrives from, in the hull's frame (x across the hull
 * to its right when upright, y up the nose). With the angle of attack α the
 * nose leads the velocity by α, so the velocity — and the incoming air — sits
 * at −α from the nose: `(-sin α, cos α)`. Nose-first is (0, 1); a belly flop
 * falling straight down with the nose to the right is α = −π/2 and (1, 0),
 * the flank that faces the ground.
 */
export function windwardInHull(angleOfAttack: number, out: { x: number; y: number }): void {
  out.x = -Math.sin(angleOfAttack);
  out.y = Math.cos(angleOfAttack);
}

/**
 * The inset appears above this sheath strength and goes below the other.
 * Both above `plasmaIntensity`'s floor of 0.05 (below which it returns 0), so
 * the hide line is a line the strength can actually cross.
 */
export const INSET_SHOW = 0.1;
export const INSET_HIDE = 0.06;

/** Hysteresis, so a sheath flickering at the threshold does not flicker a window. */
export function insetShouldShow(strength: number, wasShown: boolean): boolean {
  return wasShown ? strength > INSET_HIDE : strength > INSET_SHOW;
}

export interface InsetLayout {
  /** px — top-left corner. */
  x: number;
  y: number;
  /** px — square. */
  size: number;
}

/** px — clear of the top strip: the clock's line plus the scrim's padding. */
export const INSET_TOP = 60;
/** Size bounds, and the share of the width it takes between them. */
export const INSET_MIN = 72;
export const INSET_MAX = 150;
export const INSET_SHARE = 0.16;
/** px — kept between the inset's bottom edge and the top of the drawn vehicle. */
export const INSET_CLEARANCE = 8;

/**
 * px — where the top of the drawn vehicle is on a screen of this height, from
 * the camera's own rule: the vehicle is framed at the middle and drawn a
 * quarter of the height tall, clamped to the camera's bounds (unzoomed, at
 * the pad; the altitude field of view only makes it smaller).
 */
export function vehicleTopOnScreen(height: number): number {
  const drawn = Math.min(
    MAX_VEHICLE_DRAW_HEIGHT,
    Math.max(MIN_VEHICLE_DRAW_HEIGHT, height / BASE_VERTICAL_PROPORTION),
  );
  return height / 2 - drawn / 2;
}

/**
 * Where the inset sits: top-CENTRE, under the strip. The clock is at the
 * left of that strip and the buttons at its right; the two control rails
 * are vertically centred at the sides and reach the top of a short window,
 * so a corner is never free on every layout and the middle of the top edge
 * is. The vehicle itself is framed at the middle of the screen, below the
 * largest inset's bottom edge at any height this game supports.
 */
export function insetLayout(viewport: { readonly width: number; readonly height: number }, out: InsetLayout): void {
  const byWidth = Math.min(INSET_MAX, Math.max(INSET_MIN, viewport.width * INSET_SHARE));
  // A short window — a phone on its side — has the vehicle's top not far
  // below the strip; the inset shrinks to fit the gap rather than cover it.
  const room = vehicleTopOnScreen(viewport.height) - INSET_CLEARANCE - INSET_TOP;
  out.size = Math.round(Math.max(INSET_MIN, Math.min(byWidth, room)));
  out.x = Math.round((viewport.width - out.size) / 2);
  out.y = INSET_TOP;
}

/** How many vehicle heights the inset's square spans. */
export const INSET_SPAN = 1.7;

/** The sheath quad is this many hull heights on a side, centred on the hull. */
export const SHEATH_SPAN = 2.2;
/** hull heights — how far the glow reaches at full strength. */
export const SHEATH_REACH = 0.28;

const VERTEX = `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}
`;

const FRAGMENT = `
in vec2 vUV;
out vec4 finalColor;

uniform float uStrength;
uniform vec2 uWind;
uniform float uAspect;
uniform float uTime;

// Distance from a point to a segment on the y axis from -L to +L.
float capsule(vec2 p, float L, float r) {
  float y = clamp(p.y, -L, L);
  return length(vec2(p.x, p.y - y)) - r;
}

void main(void) {
  // Hull-height units, centred, y down (image space).
  vec2 p = (vUV - 0.5) * ${SHEATH_SPAN.toFixed(2)};
  float r = uAspect * 0.5;
  float d = capsule(p, 0.5 - r, r);
  float reach = ${SHEATH_REACH.toFixed(2)} * (0.55 + 0.45 * uStrength);
  float t = clamp(d / reach, 0.0, 1.0);
  float shell = (1.0 - t) * (1.0 - t);
  // Windward: the direction from the hull's axis to this point, against the
  // air's direction. The leeward side gets nothing; the flanks a little.
  vec2 fromAxis = normalize(vec2(p.x, p.y - clamp(p.y, -(0.5 - r), 0.5 - r)) + vec2(1e-5, 0.0));
  float facing = smoothstep(-0.25, 0.7, dot(fromAxis, uWind));
  // A little turbulence along the shell, so it is a fire and not a halo.
  float flicker = 0.85 + 0.15 * sin(p.y * 40.0 + uTime * 23.0) * sin(p.x * 31.0 - uTime * 17.0);
  // The strength is the HEAT readout's fraction of amber (0.8 of the limit);
  // a third of the way there is already a bright shell, because that is what
  // a third of a fatal heat flux looks like, and a glow the eye reads as a
  // tint is not a re-entry. Saturates at one.
  float glow = min(1.0, shell * facing * (0.35 + 1.15 * uStrength) * flicker);
  // Orange-white against the skin, red at the edge: ionised air, not a lamp.
  // The first ramp was near-white at the skin, and additive white over a
  // grey hull is grey — the harness saw a tint where a fire was claimed.
  vec3 near = vec3(1.0, 0.72, 0.42);
  vec3 far = vec3(1.0, 0.22, 0.04);
  vec3 colour = mix(near, far, sqrt(t));
  // The sheath is drawn OVER the hull, additively. Inside the silhouette the
  // shell is 1, and a quarter of it is left on as a wash over the windward
  // skin: the skin heats, and the picture should say so, a little.
  float inside = d < 0.0 ? 0.25 : 1.0;
  finalColor = vec4(colour * glow * inside, glow * inside);
}
`;

export interface Sheath {
  readonly mesh: Mesh<MeshGeometry, Shader>;
  /** Size it to the hull it wraps: the drawn hull height, in pixels. */
  place(drawnHeight: number): void;
  /** Strength 0..1, the windward direction in the hull's frame, and a clock. */
  set(strength: number, windX: number, windY: number, time: number): void;
  destroy(): void;
}

/** The sheath shader is compiled once and shared by every sheath. */
let sharedProgram: GlProgram | undefined;

export function createSheath(): Sheath {
  sharedProgram ??= GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT, name: 'plasma-sheath' });
  const shader = new Shader({
    glProgram: sharedProgram,
    resources: {
      sheathUniforms: {
        uStrength: { value: 0, type: 'f32' },
        uWind: { value: new Float32Array([0, -1]), type: 'vec2<f32>' },
        uAspect: { value: vehicleDiameter / vehicleHeight, type: 'f32' },
        uTime: { value: 0, type: 'f32' },
      },
    },
  });
  const uniforms = shader.resources['sheathUniforms'] as {
    uniforms: { uStrength: number; uWind: Float32Array; uAspect: number; uTime: number };
  };
  const geometry = new MeshGeometry({
    positions: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  });
  const mesh = new Mesh<MeshGeometry, Shader>({ geometry, shader });
  mesh.label = 'plasma-sheath';
  mesh.blendMode = 'add';
  mesh.visible = false;

  return {
    mesh,
    place(drawnHeight) {
      // Square in hull heights, so the capsule maths is isotropic; the
      // hull's aspect is the shader's constant.
      mesh.scale.set(drawnHeight * SHEATH_SPAN, drawnHeight * SHEATH_SPAN);
    },
    set(strength, windX, windY, time) {
      mesh.visible = strength > 0.001;
      uniforms.uniforms.uStrength = strength;
      // Image y runs down; the hull's y runs up the nose.
      uniforms.uniforms.uWind[0] = windX;
      uniforms.uniforms.uWind[1] = -windY;
      uniforms.uniforms.uTime = time;
    },
    destroy() {
      mesh.destroy();
      shader.destroy();
    },
  };
}

export interface OnboardInset {
  readonly container: Container;
  /** Whether it is on screen this frame. */
  readonly shown: boolean;
  update(
    viewport: Viewport,
    state: {
      readonly altitude: number;
      readonly downRangeDistance: number;
      readonly pitch: number;
      readonly angleOfAttack: number;
      readonly frontFinExtension: number;
      readonly aftFinExtension: number;
    },
    strength: number,
    sun: SunLight | undefined,
    time: number,
  ): void;
  destroy(): void;
}

/**
 * The onboard view: the vehicle, large, in a framed square at the top-left.
 *
 * Built from the same parts as the main view — `createVehicle` with the same
 * lighting, a sheath of its own — and driven through the same `update`, with
 * a camera of its own that is always centred on the vehicle. That is the
 * whole trick: no second render, no render texture, one more mesh and one
 * more Graphics, positioned by an ordinary camera that never moves.
 */
export function createOnboardInset(
  textures: Map<string, Texture>,
  lighting: VehicleLighting | undefined,
): OnboardInset {
  const container = new Container({ label: 'onboard-inset' });
  container.visible = false;

  const backdrop = new Graphics();
  const mask = new Graphics();
  const frame = new Graphics();
  const vehicle: VehicleView = createVehicle(textures, lighting);
  const sheath = createSheath();
  const scene = new Container({ label: 'onboard-scene' });
  scene.addChild(vehicle.container);
  vehicle.container.addChild(sheath.mesh);
  scene.mask = mask;
  container.addChild(backdrop, scene, mask, frame);

  const layout: InsetLayout = { x: 0, y: 0, size: 0 };
  const wind = { x: 0, y: 1 };
  let shown = false;
  let drawnSize = -1;

  // A camera that sits on the vehicle, and a viewport the size of the window.
  const camera: CameraState = {
    posX: 0,
    posY: 0,
    speedX: 0,
    speedY: 0,
    accX: 0,
    accY: 0,
    sticky: true,
    shakeX: 0,
    shakeY: 0,
    shakeTime: 0,
  };
  const viewport: MutableViewport = { width: 1, height: 1, physicalHeight: 1, physicalWidth: 1, scale: 1 };

  return {
    container,
    get shown() {
      return shown;
    },

    update(outer, state, strength, sun, time) {
      shown = insetShouldShow(strength, shown);
      container.visible = shown;
      if (!shown) return;

      insetLayout(outer, layout);
      container.x = layout.x;
      container.y = layout.y;
      if (drawnSize !== layout.size) {
        drawnSize = layout.size;
        backdrop.clear();
        backdrop.rect(0, 0, layout.size, layout.size);
        backdrop.fill(0xffffff);
        mask.clear();
        mask.rect(0, 0, layout.size, layout.size);
        mask.fill(0xffffff);
        frame.clear();
        frame.rect(0.5, 0.5, layout.size - 1, layout.size - 1);
        frame.stroke({ color: 0xffffff, alpha: 0.25, width: 1 });
        viewport.width = layout.size;
        viewport.height = layout.size;
        viewport.scale = layout.size / (vehicleHeight * INSET_SPAN);
        viewport.physicalHeight = layout.size / viewport.scale;
        viewport.physicalWidth = viewport.physicalHeight;
      }
      // The sky behind, at this altitude and hour: the same tint the main sky shows.
      backdrop.tint = sun
        ? skyTintLit(state.altitude, sun.skyR, sun.skyG, sun.skyB)
        : skyTintLit(state.altitude, 1, 1, 1);

      camera.posX = state.downRangeDistance;
      camera.posY = state.altitude;
      vehicle.update(camera, viewport, state, sun);
      windwardInHull(state.angleOfAttack, wind);
      sheath.place(vehicleHeight * viewport.scale);
      sheath.set(strength, wind.x, wind.y, time);
    },

    destroy() {
      sheath.destroy();
      container.destroy({ children: true });
    },
  };
}
