import { rad } from '../../../src/core/units';
import { Application, Container, Sprite, Texture } from 'pixi.js';
import { createEmissiveBell } from '../../../src/view/emissive-bell';
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { installEmissionBlending } from '../../../src/view/emission-blending';

export interface BellReport { offEnergy: number; oneEnergy: number; threeEnergy: number; pausedDifference: number;
  restartEnergy: number; widths: number[]; smokeMinimum: number[]; mixedRed: number[] }

export async function bellWitness(): Promise<BellReport> {
  const app = new Application();
  await app.init({ width: 320, height: 480, background: 0x101010,
    antialias: true, resolution: 2, preference: 'webgl', autoStart: false });
  document.body.appendChild(app.canvas);
  const uninstall = installEmissionBlending(app.renderer);
  const layer = new Container();
  app.stage.addChild(layer);
  const bell = createEmissiveBell();
  layer.addChild(bell.container);
  const state = createScenarioState(getScenario('landing-burn')!);
  state.kinematics.pitch = rad(0);
  state.atmosphere.airPressure = 101.325;
  state.engines.running.fill(false);
  state.forces.thrust = 1;
  // Existing reach floor keeps this unsaturated energy control independent of
  // the separate engine-count reach scaling; it is not a production scenario.
  state.vehicle.throttleCurrent = 0;
  const read = async () => {
    app.render();
    const image = new Image(); image.src = app.canvas.toDataURL(); await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = app.canvas.width; canvas.height = app.canvas.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  };
  const energy = (pixels: Uint8ClampedArray) => {
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 4) sum += pixels[i]! + pixels[i + 1]! + pixels[i + 2]! - 48;
    return sum;
  };
  bell.update(state, 1, 160, 100, 0.42);
  const offEnergy = energy(await read());
  state.engines.running[0] = true;
  bell.update(state, 1, 160, 100, 0.42);
  const one = await read(); const oneEnergy = energy(one);
  bell.update(state, 1, 160, 100, 0);
  const paused = await read(); let pausedDifference = 0;
  for (let i = 0; i < one.length; i++) pausedDifference = Math.max(pausedDifference, Math.abs(one[i]! - paused[i]!));
  state.engines.running[1] = state.engines.running[2] = true;
  bell.update(state, 1, 160, 100, 0.42);
  const threeEnergy = energy(await read());
  bell.reset(); bell.update(state, 1, 160, 100, 0);
  const restartEnergy = energy(await read());
  const widths: number[] = [];
  state.vehicle.throttleCurrent = 100;
  for (const pressure of [101.325, 0]) {
    state.atmosphere.airPressure = pressure;
    bell.update(state, 1, 160, 100, 0.42);
    const pixels = await read(); let width = 0;
    // Diagnostic whole-field width using absolute original luma/warmth thresholds.
    // This is not the original scene acceptance (which uses a nozzle-relative band).
    for (let y = 202; y < 400; y++) {
      let count = 0;
      for (let x = 0; x < 640; x++) {
        const i = (y * 640 + x) * 4;
        const r = pixels[i]!, g = pixels[i + 1]!, b = pixels[i + 2]!;
        if (0.299 * r + 0.587 * g + 0.114 * b >= 200 || r - b >= 100) count++;
      }
      width = Math.max(width, count);
    }
    widths.push(width);
  }
  const smokeMinimum: number[] = [];
  bell.container.visible = false;
  const smoke = new Sprite(Texture.WHITE);
  smoke.tint = 0; smoke.alpha = 0.5; smoke.position.set(140, 95); smoke.width = 40; smoke.height = 40;
  layer.addChild(smoke);
  for (const smokeFirst of [false, true]) {
    layer.setChildIndex(smoke, smokeFirst ? 0 : layer.children.length - 1);
    const pixels = await read();
    smokeMinimum.push(pixels[(210 * 640 + 310) * 4]! - 16);
  }
  state.engines.running[1] = state.engines.running[2] = false;
  state.atmosphere.airPressure = 101.325;
  state.vehicle.throttleCurrent = 0;
  bell.update(state, 1, 160, 100, 0.42);
  bell.container.visible = true;
  const mixedRed: number[] = [];
  for (const smokeFirst of [false, true]) {
    layer.setChildIndex(smoke, smokeFirst ? 0 : layer.children.length - 1);
    mixedRed.push((await read())[(220 * 640 + 318) * 4]!);
  }
  bell.destroy(); smoke.destroy(); uninstall(); app.destroy(true, { children: true });
  return { offEnergy, oneEnergy, threeEnergy, pausedDifference, restartEnergy, widths, smokeMinimum, mixedRed };
}
