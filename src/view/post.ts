/**
 * The post pass: bloom on the plumes, heat shimmer and a shock front on
 * re-entry.
 *
 * WHY HAND-WRITTEN AND NOT pixi-filters. That package would add roughly 80 kB
 * gzip for two effects, against a 250 kB first-load budget that already carries
 * PixiJS. These are two small fragment shaders; writing them costs less than
 * importing them, and keeps control of exactly what runs per frame.
 *
 * BOTH EFFECTS ARE INTENSITY-DRIVEN AND SKIP AT ZERO. A filter attached to a
 * container costs a full-screen pass whether or not it does anything, so each
 * is detached entirely when its driving quantity is below threshold. On the pad
 * and in cruise the post pass costs nothing at all.
 */
import { Container, Filter, GlProgram } from 'pixi.js';

const VERTEX = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void ) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void ) {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

/**
 * Bloom: bright pixels bleed into their neighbours.
 *
 * A threshold-and-blur, done in one pass with a small fixed kernel rather than
 * the usual downsample-blur-upsample. At the sizes a rocket plume occupies the
 * difference is not visible, and one pass is a third of the cost.
 */
const BLOOM_FRAGMENT = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uTexelSize;
uniform float uStrength;
uniform float uThreshold;

vec3 brightPass(vec2 uv) {
  vec3 c = texture(uTexture, uv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return c * max(luma - uThreshold, 0.0) / max(1.0 - uThreshold, 0.0001);
}

void main(void) {
  vec4 base = texture(uTexture, vTextureCoord);

  // Nine taps on a widening cross. Enough for a soft halo, cheap enough to run
  // every frame on a phone.
  vec3 bleed = vec3(0.0);
  bleed += brightPass(vTextureCoord) * 0.24;
  for (int i = 1; i <= 4; i++) {
    float o = float(i) * 1.6;
    float w = 0.19 / float(i);
    bleed += brightPass(vTextureCoord + vec2( o, 0.0) * uTexelSize) * w;
    bleed += brightPass(vTextureCoord + vec2(-o, 0.0) * uTexelSize) * w;
    bleed += brightPass(vTextureCoord + vec2(0.0,  o) * uTexelSize) * w;
    bleed += brightPass(vTextureCoord + vec2(0.0, -o) * uTexelSize) * w;
  }

  finalColor = vec4(base.rgb + bleed * uStrength, base.a);
}
`;

/**
 * Heat shimmer and shock front.
 *
 * Shimmer is a sine displacement whose amplitude follows thermal load; the
 * shock is a bright arc standing off the nose. Both are driven from the
 * simulation's own thermal power, so what you see is what the physics says.
 */
const HEAT_FRAGMENT = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uIntensity;
uniform vec2 uCenter;
uniform vec2 uTexelSize;

void main(void) {
  vec2 uv = vTextureCoord;

  // Displacement grows with distance behind the vehicle, so the wake shimmers
  // and the nose stays sharp.
  vec2 toCenter = uv - uCenter;
  float distance = length(toCenter);
  float wake = smoothstep(0.0, 0.45, distance);

  float wobble = sin(uv.y * 190.0 + uTime * 11.0) * 0.5
               + sin(uv.y * 91.0 - uTime * 7.3) * 0.5;
  uv.x += wobble * 0.0032 * uIntensity * wake;

  vec4 color = texture(uTexture, uv);

  // Shock front: a thin bright arc standing off the nose.
  float ring = smoothstep(0.055, 0.040, abs(distance - 0.052));
  vec3 shock = vec3(1.0, 0.62, 0.34) * ring * uIntensity * 0.55;

  finalColor = vec4(color.rgb + shock * color.a, color.a);
}
`;

export interface PostPass {
  /**
   * Update both effects for this frame.
   *
   * @param bloom 0..1 — how hard the plumes are burning
   * @param heat 0..1 — thermal load as a fraction of the structural limit
   * @param nose screen-space nose position, normalised 0..1
   */
  update(bloom: number, heat: number, nose: { x: number; y: number }, elapsed: number): void;
  /** Whether either filter is currently attached. */
  readonly active: boolean;
  destroy(): void;
}

/** Below this, an effect is detached rather than run at near-zero strength. */
export const POST_THRESHOLD = 0.02;

export function createPostPass(
  plumeLayer: Container,
  vehicleLayer: Container,
  width: number,
  height: number,
): PostPass {
  const bloomFilter = new Filter({
    glProgram: GlProgram.from({ vertex: VERTEX, fragment: BLOOM_FRAGMENT, name: 'bloom' }),
    resources: {
      bloomUniforms: {
        uTexelSize: { value: new Float32Array([1 / width, 1 / height]), type: 'vec2<f32>' },
        uStrength: { value: 0, type: 'f32' },
        uThreshold: { value: 0.62, type: 'f32' },
      },
    },
  });

  const heatFilter = new Filter({
    glProgram: GlProgram.from({ vertex: VERTEX, fragment: HEAT_FRAGMENT, name: 'heat' }),
    resources: {
      heatUniforms: {
        uTime: { value: 0, type: 'f32' },
        uIntensity: { value: 0, type: 'f32' },
        uCenter: { value: new Float32Array([0.5, 0.5]), type: 'vec2<f32>' },
        uTexelSize: { value: new Float32Array([1 / width, 1 / height]), type: 'vec2<f32>' },
      },
    },
  });

  let bloomAttached = false;
  let heatAttached = false;

  const bloomUniforms = bloomFilter.resources['bloomUniforms'] as {
    uniforms: { uStrength: number; uTexelSize: Float32Array };
  };
  const heatUniforms = heatFilter.resources['heatUniforms'] as {
    uniforms: { uTime: number; uIntensity: number; uCenter: Float32Array; uTexelSize: Float32Array };
  };

  return {
    get active() {
      return bloomAttached || heatAttached;
    },

    update(bloom, heat, nose, elapsed) {
      // A filter costs a full-screen pass whether or not it does anything, so
      // detach rather than run at zero. On the pad this whole pass is free.
      if (bloom > POST_THRESHOLD) {
        bloomUniforms.uniforms.uStrength = Math.min(bloom, 1) * 1.35;
        if (!bloomAttached) {
          plumeLayer.filters = [bloomFilter];
          bloomAttached = true;
        }
      } else if (bloomAttached) {
        plumeLayer.filters = [];
        bloomAttached = false;
      }

      if (heat > POST_THRESHOLD) {
        heatUniforms.uniforms.uIntensity = Math.min(heat, 1);
        heatUniforms.uniforms.uTime = elapsed;
        heatUniforms.uniforms.uCenter[0] = nose.x;
        heatUniforms.uniforms.uCenter[1] = nose.y;
        if (!heatAttached) {
          vehicleLayer.filters = [heatFilter];
          heatAttached = true;
        }
      } else if (heatAttached) {
        vehicleLayer.filters = [];
        heatAttached = false;
      }
    },

    destroy() {
      plumeLayer.filters = [];
      vehicleLayer.filters = [];
      bloomFilter.destroy();
      heatFilter.destroy();
    },
  };
}

/**
 * How hard the plumes are burning, 0..1.
 *
 * Engine count and throttle together, so a single engine at minimum throttle
 * glows faintly and three at full throttle bloom hard.
 */
export function bloomIntensity(runningEngines: number, throttleCurrent: number): number {
  if (runningEngines === 0) return 0;
  return (runningEngines / 3) * (throttleCurrent / 100);
}

/**
 * Thermal load as a fraction of the structural limit, 0..1.
 *
 * Deliberately tied to `heatLimit`: the shimmer should tell you how close to
 * breaking up you are, not how fast you are going.
 */
export function heatIntensity(thermalPower: number, heatLimit: number): number {
  if (thermalPower <= 0) return 0;
  return Math.min(thermalPower / heatLimit, 1);
}
