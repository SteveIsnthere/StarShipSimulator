/** Continuous, authored nozzle-frame exhaust; geometry never writes simulation state. */
import { BufferImageSource, Container, Mesh, MeshGeometry, Texture } from 'pixi.js';
import type { SimState } from '$core/state';
import { SHIP, type VehicleDefinition } from '$core/vehicle';
import { EFFECTS, softParticleProfile } from './particles';
import { lerpColourFast } from './colour';
import { enginePlumeLook } from './engine-look';
import { PLUME_REACH_FLOOR } from './effects';

/** Fixed tessellation, independent of viewport, detector and particle population. */
export const BELL_ROWS = 32;
const COLUMNS = 5;

export function writeBellGeometry(
  positions: Float32Array, uvs: Float32Array,
  expansion: number, spread: number, reach: number, frontAge: number,
): void {
  const bell = EFFECTS.raptorPlume;
  const size = 0.9 * expansion * reach;
  const angle = bell.spread * spread;
  for (let row = 0; row < BELL_ROWS; row++) {
    const t = Math.min(row / (BELL_ROWS - 1), Math.max(0, frontAge) / bell.life, 1);
    const travel = bell.speed / bell.drag * (1 - Math.exp(-bell.drag * t * bell.life)) * size;
    const fan = travel * Math.sin(angle);
    const radius = fan + (bell.startSize + (bell.endSize - bell.startSize) * t) * size / 2;
    const axial = travel * Math.cos(angle);
    for (let col = 0; col < COLUMNS; col++) {
      const offset = (row * COLUMNS + col) * 2;
      const x = col === 0 ? -radius : col === 1 ? -fan : col === 2 ? 0 : col === 3 ? fan : radius;
      positions[offset] = x;
      positions[offset + 1] = axial;
      // One unchanged soft profile across the complete envelope; overlapping
      // engine light must not turn an authored constant interior into a slab.
      uvs[offset] = radius > 0 ? 0.5 + x / (2 * radius) : 0.5;
      uvs[offset + 1] = t;
    }
  }
}


export interface EmissiveBell {
  readonly container: Container;
  update(state: SimState, scale: number, nozzleX: number, nozzleY: number, worldDt: number): void;
  reset(): void;
  destroy(): void;
}

/** Startup-only texture: original longitudinal tint/alpha, original soft feather. */
function createBellTexture(): Texture {
  const width = 65;
  const height = 64;
  const data = new Uint8Array(width * height * 4);
  const bell = EFFECTS.raptorPlume;
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    const colour = lerpColourFast(bell.startColor, bell.endColor, t);
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const alpha = (bell.startAlpha + (bell.endAlpha - bell.startAlpha) * t)
        * softParticleProfile(Math.abs(2 * x / (width - 1) - 1));
      // Typed-array upload does not premultiply pixels: do it once here, so
      // additive ONE/ONE RGB respects the authored fade and transparent rim.
      data[offset] = Math.round(((colour >> 16) & 255) * alpha);
      data[offset + 1] = Math.round(((colour >> 8) & 255) * alpha);
      data[offset + 2] = Math.round((colour & 255) * alpha);
      data[offset + 3] = Math.round(255 * alpha);
    }
  }
  return new Texture({ source: new BufferImageSource({ resource: data, width, height,
    format: 'rgba8unorm', alphaMode: 'premultiplied-alpha', scaleMode: 'linear' }) });
}

export function createEmissiveBell(model: VehicleDefinition = SHIP): EmissiveBell {
  const container = new Container();
  const texture = createBellTexture();
  const ages = new Float64Array(model.engines.length);
  const looks = model.engines.map(() => ({ spread: 0, scale: 0, diamonds: 0, cellLength: 0 }));
  const meshes = model.engines.map(() => {
    const indices = new Uint32Array((BELL_ROWS - 1) * (COLUMNS - 1) * 6);
    let offset = 0;
    for (let row = 0; row < BELL_ROWS - 1; row++) {
      for (let col = 0; col < COLUMNS - 1; col++) {
        const a = row * COLUMNS + col;
        indices[offset++] = a; indices[offset++] = a + 1; indices[offset++] = a + COLUMNS;
        indices[offset++] = a + 1; indices[offset++] = a + COLUMNS + 1; indices[offset++] = a + COLUMNS;
      }
    }
    const geometry = new MeshGeometry({ positions: new Float32Array(BELL_ROWS * COLUMNS * 2),
      uvs: new Float32Array(BELL_ROWS * COLUMNS * 2), indices });
    const mesh = new Mesh({ geometry, texture });
    mesh.blendMode = 'add';
    mesh.visible = false;
    container.addChild(mesh);
    return mesh;
  });
  return {
    container,
    update(state, scale, nozzleX, nozzleY, worldDt) {
      const pitch = state.kinematics.pitch;
      for (let i = 0; i < meshes.length; i++) {
        const mesh = meshes[i]!;
        mesh.visible = !!state.engines.running[i] && !state.engines.failed[i] && state.forces.thrust > 0;
        if (!mesh.visible) { ages[i] = 0; continue; }
        ages[i] = Math.min(EFFECTS.raptorPlume.life, ages[i]! + Math.max(0, worldDt));
        const mountDefinition = model.engines[i]!;
        const look = looks[i]!;
        enginePlumeLook(state.atmosphere.airPressure, state.vehicle.throttleCurrent,
          mountDefinition.kind === 'vacuum', look);
        // Positive measured thrust is the emission authority. Preserve the
        // existing reach floor when a supplied state reports thrust before its
        // throttle readout catches up (also the unsaturated blending control).
        if (look.scale === 0) {
          enginePlumeLook(state.atmosphere.airPressure, 100, mountDefinition.kind === 'vacuum', look);
          look.scale *= PLUME_REACH_FLOOR;
        }
        writeBellGeometry(mesh.geometry.positions, mesh.geometry.uvs, look.scale, look.spread, 1, ages[i]!);
        mesh.geometry.getBuffer('aPosition').update();
        mesh.geometry.getBuffer('aUV').update();
        const mount = model.engines[i]!.offAxis * scale;
        mesh.position.set(nozzleX + Math.cos(pitch) * mount, nozzleY + Math.sin(pitch) * mount);
        const steerable = mountDefinition.gimballed ?? mountDefinition.kind === 'sea-level';
        mesh.rotation = steerable
          ? state.vehicle.gimbalPointingDirection : pitch;
        mesh.scale.set(scale);
      }
    },
    reset() {
      ages.fill(0);
      for (const mesh of meshes) mesh.visible = false;
    },
    destroy() {
      for (const mesh of meshes) {
        const geometry = mesh.geometry;
        mesh.destroy();
        geometry.destroy(true);
      }
      container.destroy();
      texture.destroy(true);
    },
  };
}
