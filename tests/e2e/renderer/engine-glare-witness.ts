import { Application, Container } from 'pixi.js';
import { createEngineGlare } from '../../../src/view/engine-glare';
import { createParticleTextures } from '../../../src/view/particles';
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { rad } from '../../../src/core/units';
import { installEmissionBlending } from '../../../src/view/emission-blending';
import { createPostPass } from '../../../src/view/post';

export async function engineGlareWitness() {
  const app = new Application();
  await app.init({ width: 320, height: 480, background: 0x101010, resolution: 2,
    preference: 'webgl', autoStart: false });
  document.body.appendChild(app.canvas);
  const uninstall = installEmissionBlending(app.renderer);
  const atlas = createParticleTextures(app.renderer);
  const glare = createEngineGlare(atlas.soft);
  const layer = new Container();
  layer.addChild(glare.container);
  app.stage.addChild(layer);
  const post = createPostPass(layer, new Container(), 320, 480);
  const state = createScenarioState(getScenario('landing-burn')!);
  state.kinematics.pitch = rad(0);
  state.engines.running.fill(false);
  state.engines.failed.fill(false);
  state.forces.thrust = 1;
  state.vehicle.throttleCurrent = 100;
  const draw = async (altitude: number) => {
    glare.update(state, 2, 160, 160, 400, altitude);
    app.render();
    const image = new Image(); image.src = app.canvas.toDataURL(); await image.decode();
    const copy = document.createElement('canvas');
    copy.width = app.canvas.width; copy.height = app.canvas.height;
    const ctx = copy.getContext('2d')!; ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, copy.width, copy.height).data;
  };
  // Independently remove the whole source for the detector baseline. Off
  // engines must match this image; subtracting their own image proves nothing.
  glare.container.visible = false;
  const baseline = await draw(20);
  glare.container.visible = true;
  const energy = (pixels: Uint8ClampedArray, ground = false) => {
    let total = 0;
    for (let y = ground ? 780 : 0; y < (ground ? 820 : 960); y++) {
      for (let x = 0; x < 640; x++) {
        const i = (y * 640 + x) * 4;
        for (let c = 0; c < 3; c++) total += pixels[i + c]! - baseline[i + c]!;
      }
    }
    return total;
  };
  const offEnergy = energy(await draw(20));
  state.engines.running[0] = true;
  const lit = await draw(20);
  const paused = await draw(20);
  let pausedDifference = 0;
  for (let i = 0; i < lit.length; i++) pausedDifference = Math.max(pausedDifference, Math.abs(lit[i]! - paused[i]!));
  const farGroundEnergy = energy(await draw(5000), true);
  state.engines.failed[0] = true;
  const failedEnergy = energy(await draw(20));
  state.engines.failed[0] = false;
  state.forces.thrust = 0;
  const shutdownEnergy = energy(await draw(20));
  state.forces.thrust = 1;
  post.update(1, 0, { x: 0.5, y: 0.5 }, 0);
  const bloomed = await draw(20);
  let bloomMinimum = 255;
  for (let i = 0; i < lit.length; i++) if (i % 4 !== 3) {
    bloomMinimum = Math.min(bloomMinimum, bloomed[i]! - lit[i]!);
  }
  // WebGL's default non-preserved drawing buffer may be cleared while the
  // asynchronous pixel reader decodes its image. Capture immediately after
  // a fresh render, before any await yields to the browser compositor.
  app.render();
  const capture = app.canvas.toDataURL();
  const result = { offEnergy, engineEnergy: energy(lit) - energy(lit, true), groundEnergy: energy(lit, true),
    farGroundEnergy, failedEnergy, shutdownEnergy, pausedDifference, bloomMinimum,
    capture };
  post.destroy(); glare.destroy(); uninstall();
  app.destroy(true, { children: true });
  atlas.soft.source.destroy();
  return result;
}
