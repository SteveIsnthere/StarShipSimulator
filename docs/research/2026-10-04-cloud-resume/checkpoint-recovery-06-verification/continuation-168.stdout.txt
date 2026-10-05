import { Application } from 'pixi.js';
import { createVehicle } from '../../../src/view/vehicle';

/** Actual authored V3 geometry and production analytic material on the GPU.
 * Isolated forward barrel and complete Ship use the same retained component.
 * The control changes material selection only: normals/geometry/light/exposure
 * stay fixed. It compares authored TPS versus steel response, not radiometry.
 */
export async function heatShieldWitness(mode: 'barrel' | 'vehicle' = 'barrel') {
  const app = new Application();
  await app.init({ width: 320, height: 480, background: 0x101010,
    resolution: 2, preference: 'webgl', autoStart: false });
  const body = createVehicle();
  const barrel = body.components.partsById.get('ship-hull-forward');
  if (!barrel) throw new Error('actual Ship renderer has no forward barrel');
  if (mode === 'barrel') {
    for (const part of body.components.partsById.values())
      part.container.visible = part === barrel;
  }
  // Fixed metric crop of the actual barrel: CSS scale13.333px/m, stations20–32m
  // in the sampled vertical band. Both side bands stay inside its TPS boundary.
  const scale = 120 / 9;
  body.container.position.set(160, 240);
  body.container.scale.set(scale);
  app.stage.addChild(body.container);
  const materials = [...body.components.partsById.values()].flatMap(part => part.materials);
  for (const material of materials) {
    material.setEnvironment(0, 1, 1, 1);
    material.setScale(scale, true);
    material.setTemperature(293.15);
  }
  const read = async (lightX: number, daylight: number) => {
    for (const material of materials) material.setLight(lightX, 0, 0.3, daylight);
    app.render();
    const capture = app.canvas.toDataURL();
    const image = new Image(); image.src = capture; await image.decode();
    const copy = document.createElement('canvas'); copy.width = 640; copy.height = 960;
    const ctx = copy.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, 640, 960).data;
    let left = 0, right = 0, count = 0;
    for (let y = 320; y < 640; y++) for (let x = 220; x < 260; x++) {
      left += pixels[(y * 640 + x) * 4]!;
      right += pixels[(y * 640 + (640 - x)) * 4]!;
      count++;
    }
    return { left: left / count, right: right / count, capture };
  };
  const day = await read(1, 1);
  const reversed = await read(-1, 1);
  const night = await read(1, 0);
  // Actual steel response in the exact same TPS meshes is a positive control.
  // No texture/normal swap or photograph survives this render path.
  for (const material of materials)
    if (material.uniforms.uMaterial === 1) material.uniforms.uMaterial = 0;
  const unshielded = await read(1, 1);
  body.destroy();
  app.destroy(true);
  return { day, reversed, night, unshielded };
}
