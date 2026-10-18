import type { CameraState, Viewport } from './camera';

/** World metres to screen pixels; every caller applies the same camera shake. */
export function worldToScreen(
  camera: CameraState,
  viewport: Viewport,
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  const out = { x: 0, y: 0 };
  writeWorldToScreen(camera, viewport, worldX, worldY, out);
  return out;
}

/** Per-frame callers own and reuse their output; coordinate order is unchanged. */
export function writeWorldToScreen(
  camera: CameraState,
  viewport: Viewport,
  worldX: number,
  worldY: number,
  out: { x: number; y: number },
): void {
  out.x = viewport.width / 2 + (worldX - camera.posX - camera.shakeX) * viewport.scale;
  out.y = viewport.height / 2 - (worldY - camera.posY - camera.shakeY) * viewport.scale;
}
