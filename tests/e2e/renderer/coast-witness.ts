import { Application, Texture } from 'pixi.js';
import { createWorld } from '../../../src/view/world';
import { createDistantEarth } from '../../../src/view/distant-earth';
import { computeViewport, createCamera } from '../../../src/view/camera';
import { createSunLight, writeSun } from '../../../src/view/sun';
import { starBaseXPos } from '../../../src/core/constants';

/** Actual production geometry/mask/night policy, isolated from overlay/vehicles.
 * Source-off references remove only ocean or lamps at the identical scene. */
export async function coastWitness(width: number, height: number, far: boolean) {
  const app = new Application();
  await app.init({ width, height, background: 0xadc4d4, preference: 'webgl', autoStart: false });
  const viewport = computeViewport(width, height, 50);
  const camera = createCamera(viewport, starBaseXPos + 160, 0, 0);
  camera.posY = viewport.physicalHeight / 4;
  const world = createWorld(new Map());
  const earth = createDistantEarth({ mottle: Texture.WHITE, haze: Texture.EMPTY, limb: Texture.EMPTY });
  const sun = createSunLight();
  const root = far ? earth.container : world.container;
  app.stage.addChild(root);
  const read = async (hour: number, hidden?: string, atPad = false) => {
    camera.posX = starBaseXPos + (atPad ? 0 : 160);
    writeSun(sun, 'custom', 0, starBaseXPos, hour);
    if (far) earth.update(viewport, 100000, 0, 0, sun);
    else world.update(camera, viewport, 0, 50, { sun, downRangeDistance: starBaseXPos, altitude: 50, pitch: 0 });
    const coast = root.getChildByLabel(far ? 'distant-coast' : 'coast')!;
    const target = far ? coast.children[1]! : coast.getChildByLabel(hidden === 'lights' ? 'coast-lights' : 'coast-ocean')!;
    if (hidden) target.visible = false;
    app.render(); const capture = app.canvas.toDataURL();
    const image = new Image(); image.src = capture; await image.decode();
    const copy = document.createElement('canvas'); copy.width = width; copy.height = height;
    const ctx = copy.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    // Far ocean may have been hidden by prior control; near update owns culling.
    target.visible = true;
    return { pixels, capture };
  };
  const day = await read(12), oceanOff = await read(12, 'ocean');
  const night = await read(0);
  const lampsOn = far ? night : await read(0, undefined, true);
  const lampsOff = await read(0, far ? 'ocean' : 'lights', !far);
  const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
    let changed = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i+1]! - b[i+1]!) + Math.abs(a[i+2]! - b[i+2]!) > 3) changed++;
    return changed;
  };
  const mean = (pixels: Uint8ClampedArray) => {
    let left = 0, right = 0, count = 0;
    for (let y = Math.floor(height * 0.85); y < Math.floor(height * 0.95); y++) {
      for (let x = Math.floor(width * 0.1); x < Math.floor(width * 0.2); x++) {
        const i = (y * width + x) * 4, j = (y * width + width - x - 1) * 4;
        left += pixels[i]! + pixels[i+1]! + pixels[i+2]!;
        right += pixels[j]! + pixels[j+1]! + pixels[j+2]!; count++;
      }
    }
    return { left: left / (3 * count), right: right / (3 * count) };
  };
  const report = { day: mean(day.pixels), night: mean(night.pixels),
    oceanPixels: difference(day.pixels, oceanOff.pixels), absentPixels: difference(oceanOff.pixels, oceanOff.pixels),
    nightSourcePixels: difference(lampsOn.pixels, lampsOff.pixels), dayCapture: day.capture, nightCapture: night.capture };
  // Clean both startup graphs, including the one not attached to the renderer.
  app.stage.removeChild(root); world.container.destroy({ children: true }); earth.container.destroy({ children: true }); app.destroy(true);
  return report;
}
(window as unknown as { coastWitness: typeof coastWitness }).coastWitness = coastWitness;
