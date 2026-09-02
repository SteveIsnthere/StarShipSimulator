/**
 * The vehicle's lighting — M11.4: a normal map generated from the sprite.
 *
 * The 2021 art is one picture of a stainless cylinder, and it comes with its
 * own light baked in: the right flank bright, the left dark. That was fine
 * while the picture was the only light there was. With a sun it is a problem
 * twice over — a sun on the left would brighten a flank the art has painted
 * dark, and any sun would double the shading on the right.
 *
 * So the sprite is read back once at startup and two things are derived from
 * it, both by geometry rather than by guessing at the art:
 *
 *   NORMALS. The hull is a body of revolution. Its silhouette gives the radius
 *   r(y) row by row, and the outward normal at a point t ∈ [-1, 1] across a row
 *   is ∝ (t, -r'(y), √(1 - t²)) — the cylinder's sideways normal, tilted up
 *   the nose cone where the radius shrinks. Outside the silhouette the normal
 *   faces the viewer, so nothing there is shaded.
 *
 *   DELIGHTING. Across the straight part of the hull the art's brightness is
 *   a function of t alone — the baked light. Its profile is measured in bins
 *   of t and the reciprocal, clamped, becomes a gain that flattens the flank
 *   back to albedo. The shader then applies the REAL light. On a morning the
 *   result is the picture the art always showed; on an afternoon the other
 *   flank is lit, which no amount of tinting could have done.
 *
 * Both are pure over pixel arrays and tested that way. `createVehicleLighting`
 * is the thin browser wrapper that reads the texture and builds the GPU
 * resources.
 */
import { BufferImageSource, GlProgram, Shader, Texture } from 'pixi.js';

/** Alpha at or above which a pixel is hull. */
export const HULL_ALPHA = 40;
/** Rows whose radius is at least this share of the widest row are "straight hull". */
export const STRAIGHT_HULL_SHARE = 0.85;
/** Bins across the hull for the delighting profile. */
export const DELIGHT_BINS = 16;
/** Bounds on the delighting gain, so a black edge is not amplified into noise. */
export const DELIGHT_MIN = 0.6;
export const DELIGHT_MAX = 1.8;

/** Rec. 601 luma of a pixel, 0..255. */
function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Write the lighting texture for a sprite.
 *
 * @param rgba the sprite's pixels, RGBA, row-major
 * @param out the same size: RGB = normal · 0.5 + 0.5, A = delighting gain / 2
 * @returns the gain profile, for tests and for the record
 */
export function writeHullLighting(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  out: Uint8ClampedArray,
): Float32Array {
  // 1. The silhouette: per-row extent of the hull.
  const left = new Int32Array(height).fill(-1);
  const right = new Int32Array(height).fill(-1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3]! >= HULL_ALPHA) {
        if (left[y]! < 0) left[y] = x;
        right[y] = x;
      }
    }
  }
  const radius = new Float32Array(height);
  const mid = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    if (left[y]! >= 0) {
      radius[y] = (right[y]! - left[y]! + 1) / 2;
      mid[y] = (right[y]! + left[y]!) / 2;
    }
  }
  // Smoothed over five rows, so the pixel stairs of a diagonal do not become
  // a ridged normal.
  const smooth = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    let n = 0;
    for (let k = -2; k <= 2; k++) {
      const yy = y + k;
      if (yy >= 0 && yy < height && radius[yy]! > 0) {
        sum += radius[yy]!;
        n++;
      }
    }
    smooth[y] = n > 0 ? sum / n : 0;
  }
  let widest = 0;
  for (let y = 0; y < height; y++) widest = Math.max(widest, smooth[y]!);

  // 2. The delighting profile over the straight hull.
  const binSum = new Float64Array(DELIGHT_BINS);
  const binCount = new Float64Array(DELIGHT_BINS);
  let total = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    if (radius[y]! <= 0 || smooth[y]! < STRAIGHT_HULL_SHARE * widest) continue;
    for (let x = left[y]!; x <= right[y]!; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3]! < HULL_ALPHA) continue;
      const t = (x - mid[y]!) / radius[y]!;
      const bin = Math.min(DELIGHT_BINS - 1, Math.max(0, Math.floor(((t + 1) / 2) * DELIGHT_BINS)));
      const l = luma(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!);
      binSum[bin] = binSum[bin]! + l;
      binCount[bin] = binCount[bin]! + 1;
      total += l;
      count += 1;
    }
  }
  const gain = new Float32Array(DELIGHT_BINS).fill(1);
  if (count > 0) {
    const mean = total / count;
    for (let b = 0; b < DELIGHT_BINS; b++) {
      if (binCount[b]! > 0 && binSum[b]! > 0) {
        gain[b] = Math.min(DELIGHT_MAX, Math.max(DELIGHT_MIN, mean / (binSum[b]! / binCount[b]!)));
      }
    }
    // Neighbour-smoothed once, so the bins do not show as stripes.
    const smoothed = new Float32Array(DELIGHT_BINS);
    for (let b = 0; b < DELIGHT_BINS; b++) {
      const a = gain[Math.max(0, b - 1)]!;
      const c = gain[Math.min(DELIGHT_BINS - 1, b + 1)]!;
      smoothed[b] = (a + 2 * gain[b]! + c) / 4;
    }
    gain.set(smoothed);
  }

  // 3. The normals and the gain, written out.
  for (let y = 0; y < height; y++) {
    const up = smooth[Math.max(0, y - 1)]!;
    const down = smooth[Math.min(height - 1, y + 1)]!;
    // dr/dy in image rows: positive where the hull widens going down, which
    // is the nose cone. The normal there tilts toward the nose (image up).
    const slope = radius[y]! > 0 ? (down - up) / 2 : 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let nx = 0;
      let ny = 0;
      let nz = 1;
      let g = 1;
      if (radius[y]! > 0 && rgba[i + 3]! >= HULL_ALPHA) {
        const t = Math.max(-1, Math.min(1, (x - mid[y]!) / radius[y]!));
        nx = t;
        ny = -slope;
        nz = Math.sqrt(Math.max(0, 1 - t * t));
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;
        const bin = Math.min(DELIGHT_BINS - 1, Math.max(0, Math.floor(((t + 1) / 2) * DELIGHT_BINS)));
        g = gain[bin]!;
      }
      out[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out[i + 3] = Math.round((g / 2) * 255);
    }
  }
  return gain;
}

/** Light the hull keeps in shadow, and the range the sun adds on top. */
export const AMBIENT = 0.55;
export const DIFFUSE = 0.65;
/** Strength and tightness of the stainless highlight. */
export const SPECULAR = 0.5;
export const SHININESS = 16;
/** How dark the hull goes at night, as a factor on the daytime shading. */
export const NIGHT_HULL = 0.22;

/**
 * Brightness of a flat, viewer-facing surface such as a fin, as the shader
 * would light the hull's centre line. Used to tint the fins to match.
 */
export function flatLighting(southComponent: number, daylightShare: number): number {
  const lit = AMBIENT + DIFFUSE * Math.max(0, southComponent);
  return lit * (NIGHT_HULL + (1 - NIGHT_HULL) * daylightShare);
}

const VERTEX = `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
out vec4 vColor;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec4 uColor;

void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
  // The container's tint and alpha, as Pixi's own mesh shader applies them,
  // so a faded or tinted vehicle layer fades and tints the hull too.
  vColor = uColor * uWorldColorAlpha;
}
`;

const FRAGMENT = `
in vec2 vUV;
in vec4 vColor;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uNormal;
uniform vec3 uLight;
uniform float uDaylight;

void main(void) {
  vec4 colour = texture(uTexture, vUV);
  vec4 map = texture(uNormal, vUV);
  vec3 n = normalize(map.xyz * 2.0 - 1.0);
  // Image y runs down; the light's y runs up the hull.
  vec3 l = normalize(vec3(uLight.x, -uLight.y, uLight.z));
  float diffuse = max(0.0, dot(n, l));
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(0.0, dot(n, h)), ${SHININESS.toFixed(1)}) * ${SPECULAR.toFixed(2)};
  float gain = map.a * 2.0;
  float lit = (${AMBIENT.toFixed(2)} + ${DIFFUSE.toFixed(2)} * diffuse) * gain;
  lit *= ${NIGHT_HULL.toFixed(2)} + ${(1 - NIGHT_HULL).toFixed(2)} * uDaylight;
  // The texture is premultiplied. Scaling rgb by more than one can carry a
  // channel past alpha on an anti-aliased edge texel, and under the
  // premultiplied blend that composites brighter than white — a rim along
  // the silhouette. Clamped to alpha, the invariant holds.
  vec3 rgb = colour.rgb * lit + vec3(spec * uDaylight) * colour.a;
  rgb = min(rgb, vec3(colour.a));
  finalColor = vec4(rgb, colour.a) * vColor;
}
`;

export interface VehicleLighting {
  readonly shader: Shader;
  /** Set the light for this frame: direction in the hull's frame, and daylight. */
  set(x: number, y: number, z: number, daylightShare: number): void;
  destroy(): void;
}

/**
 * Read the sprite back, build its lighting texture, and compile the shader.
 * Browser only; the pure part is `writeHullLighting`.
 */
export function createVehicleLighting(texture: Texture): VehicleLighting | undefined {
  const width = texture.source.pixelWidth;
  const height = texture.source.pixelHeight;
  const resource = texture.source.resource as CanvasImageSource | undefined;
  if (!resource || width <= 0 || height <= 0) return undefined;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return undefined;
  let pixels: Uint8ClampedArray;
  try {
    ctx.drawImage(resource, 0, 0, width, height);
    pixels = ctx.getImageData(0, 0, width, height).data;
  } catch {
    return undefined;
  }

  const lighting = new Uint8ClampedArray(width * height * 4);
  writeHullLighting(pixels, width, height, lighting);
  // Uploaded as the bytes they are. The alpha channel carries the gain, not
  // coverage, so it must not premultiply — and a 2D canvas on the way would
  // have: putImageData premultiplies and the upload divides back, which
  // quantises a normal to the gain's precision. A buffer source does neither.
  const normal = new Texture({
    source: new BufferImageSource({
      resource: new Uint8Array(lighting.buffer, lighting.byteOffset, lighting.byteLength),
      width,
      height,
      alphaMode: 'no-premultiply-alpha',
    }),
  });

  const shader = new Shader({
    glProgram: GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT, name: 'hull-lighting' }),
    resources: {
      uTexture: texture.source,
      uSampler: texture.source.style,
      uNormal: normal.source,
      uNormalSampler: normal.source.style,
      lightUniforms: {
        uLight: { value: new Float32Array([0.6, 0.7, 0.3]), type: 'vec3<f32>' },
        uDaylight: { value: 1, type: 'f32' },
      },
    },
  });
  const uniforms = shader.resources['lightUniforms'] as {
    uniforms: { uLight: Float32Array; uDaylight: number };
  };

  return {
    shader,
    set(x, y, z, daylightShare) {
      uniforms.uniforms.uLight[0] = x;
      uniforms.uniforms.uLight[1] = y;
      uniforms.uniforms.uLight[2] = z;
      uniforms.uniforms.uDaylight = daylightShare;
    },
    destroy() {
      shader.destroy();
      normal.destroy(true);
    },
  };
}
