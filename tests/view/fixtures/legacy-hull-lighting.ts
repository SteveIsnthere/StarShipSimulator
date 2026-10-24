/** Historical photo-derived lighting reference. Pure equations preserved;
 * no production renderer samples this path. */
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

