/** Startup-only authored belly albedo. The normal map locates the fixed
 * viewer-facing hemisphere; stainless rims retain the silhouette. Attitude
 * and sunlight shade both materials through the existing hull shader.
 * This is a compressed tile pattern, not a surveyed tile layout or radiometry. */
export const TILE_START = 0.35;
export const TILE_END = 0.65;

function tileWeight(normalZ: number, alpha: number): number {
  const t = alpha >= 40 ? Math.max(0, Math.min(1, (normalZ - TILE_START) / (TILE_END - TILE_START))) : 0;
  return t * t * (3 - 2 * t);
}

/** The legacy steel gain removes photographed lighting. Authored neutral tiles
 * already have albedo, so applying that gain again would bake in a new bias. */
export function applyHeatShieldGain(rgba: Uint8ClampedArray, normals: Uint8ClampedArray): void {
  for (let i = 0; i < normals.length; i += 4) {
    const belly = tileWeight(normals[i + 2]! / 255 * 2 - 1, rgba[i + 3]!);
    normals[i + 3] = Math.round(normals[i + 3]! * (1 - belly) + 127.5 * belly);
  }
}

export function writeHeatShieldAlbedo(
  rgba: Uint8ClampedArray, normals: Uint8ClampedArray, width: number, height: number,
  out: Uint8Array, detail = true,
): void {
  const tileWidth = Math.max(2, Math.round(width / 18));
  const tileHeight = Math.max(2, Math.round(height / 100));
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / tileHeight);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = rgba[i + 3]!;
      const normalZ = normals[i + 2]! / 255 * 2 - 1;
      const belly = tileWeight(normalZ, alpha);
      const seam = detail && (y % tileHeight === 0
        || (x + (row % 2) * Math.floor(tileWidth / 2)) % tileWidth === 0);
      // Neutral authored tile albedo replaces the photograph's baked light.
      // The display range is compressed for legibility, not reflectivity.
      const tile = seam ? 0.38 : 0.44;
      for (let c = 0; c < 3; c++) {
        const albedo = rgba[i + c]! * (1 - belly) + 180 * tile * belly;
        out[i + c] = Math.round(albedo * alpha / 255);
      }
      out[i + 3] = alpha;
    }
  }
}
