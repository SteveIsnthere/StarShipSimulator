import { Application, Container, Rectangle, Sprite, Texture, type Filter } from 'pixi.js';
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { vehicleHeight } from '../../../src/core/constants';
import { createCamera } from '../../../src/view/camera';
import { createEffectDriver } from '../../../src/view/effects';
import { createParticleSystem, createParticleTextures } from '../../../src/view/particles';
import { createPostPass } from '../../../src/view/post';
import { installEmissionBlending } from '../../../src/view/emission-blending';

export interface SamplingRow {
  scale: number;
  resolution: number;
  phase: number;
  source: 'particles' | 'control';
  directEnergy: number;
  directPixels: number;
  modes: { name: string; energy: number; lostPixels: number; maxLoss: number; bleedPixels: number; detectorWidth: number }[];
}

export async function samplingWitness(): Promise<SamplingRow[]> {
  const rows: SamplingRow[] = [];
  for (const scale of [0.4, 0.543, 0.72]) for (const resolution of [1, 2]) {
    const app = new Application();
    await app.init({ width: 320, height: 480, background: 0x101010, resolution,
      antialias: true, preference: 'webgl', autoStart: false });
    const uninstall = installEmissionBlending(app.renderer);
    const layer = new Container();
    layer.filterArea = new Rectangle(0, 0, 320, 480);
    app.stage.addChild(layer);
    const particles = createParticleSystem(createParticleTextures(app.renderer));
    layer.addChild(particles.container);
    const state = createScenarioState(getScenario('landing-burn')!);
    state.kinematics.altitude = 120000;
    state.kinematics.pitch = 0 as typeof state.kinematics.pitch;
    state.kinematics.trueSpeed = 0;
    state.kinematics.machSpeed = 0;
    state.forces.thermalPower = 0;
    state.forces.dynamicPressure = 0;
    state.forces.thrust = 1;
    state.engines.running = [true, true, true, false, false, false];
    state.vehicle.throttleCurrent = 100;
    state.atmosphere.airPressure = 0;
    const viewport = { width: 320, height: 480, physicalHeight: 480 / scale,
      physicalWidth: 320 / scale, scale };
    const camera = createCamera(viewport, state.kinematics.downRangeDistance, 0, 0);
    camera.posY = state.kinematics.altitude;
    const effects = createEffectDriver();
    for (let i = 0; i < 360; i++) effects.update(particles, camera, viewport, state, state, 1 / 120);
    const control = new Sprite(Texture.WHITE);
    control.position.set(160, effects.nozzle.y);
    control.width = 6;
    control.height = 6;
    control.blendMode = 'add';
    control.visible = false;
    layer.addChild(control);
    const post = createPostPass(layer, new Container(), 320, 480);
    post.update(1, 0, { x: 0.5, y: 0.5 }, 1);
    const retained = (Array.isArray(layer.filters) ? layer.filters[0] : layer.filters) as Filter;
    const configuredResolution = retained.resolution;
    const configuredAntialias = retained.antialias;
    layer.filters = [];
    const copy = document.createElement('canvas');
    copy.width = app.canvas.width;
    copy.height = app.canvas.height;
    const context = copy.getContext('2d')!;
    const read = async () => {
      app.render();
      const image = new Image();
      image.src = (app.canvas as HTMLCanvasElement).toDataURL();
      await image.decode();
      context.clearRect(0, 0, copy.width, copy.height);
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, copy.width, copy.height).data;
    };
    particles.container.visible = false;
    const background = await read();
    if (background.some((value, i) => i % 4 !== 3 && value !== 16)) throw new Error('emission-off control is not the uniform background');
    for (const source of ['particles', 'control'] as const) for (const phase of [0, 0.25, 0.5, 0.75]) {
      particles.container.visible = source === 'particles';
      control.visible = source === 'control';
      layer.position.set(phase, phase);
      layer.filters = [];
      const direct = await read();
      let directEnergy = 0;
      let directPixels = 0;
      for (let i = 0; i < direct.length; i += 4) {
        const delta = Math.max(direct[i]! - 16, direct[i + 1]! - 16, direct[i + 2]! - 16);
        if (delta > 3) directPixels++;
        directEnergy += direct[i]! + direct[i + 1]! + direct[i + 2]! - 48;
      }
      layer.filters = [retained];
      const row: SamplingRow = { scale, resolution, phase, source, directEnergy, directPixels, modes: [] };
      for (const mode of ['configured', 'current', 'resolution', 'antialias', 'both']) {
        retained.resolution = mode === 'configured' ? configuredResolution
          : mode === 'resolution' || mode === 'both' ? 'inherit' : 1;
        retained.antialias = mode === 'configured' ? configuredAntialias
          : mode === 'antialias' || mode === 'both' ? 'inherit' : 'off';
        const shot = await read();
        let energy = 0, lostPixels = 0, maxLoss = 0, bleedPixels = 0;
        let left = Infinity, right = -Infinity;
        const bandTop = (effects.nozzle.y + phase) * resolution;
        const bandBottom = bandTop + 0.4 * vehicleHeight * scale * resolution;
        for (let i = 0; i < shot.length; i += 4) {
          const current = Math.max(shot[i]! - 16, shot[i + 1]! - 16, shot[i + 2]! - 16);
          const before = Math.max(direct[i]! - 16, direct[i + 1]! - 16, direct[i + 2]! - 16);
          energy += shot[i]! + shot[i + 1]! + shot[i + 2]! - 48;
          if (before > 3 && current <= 3) lostPixels++;
          maxLoss = Math.max(maxLoss, direct[i]! - shot[i]!, direct[i + 1]! - shot[i + 1]!, direct[i + 2]! - shot[i + 2]!);
          if (before <= 3 && current > 3) bleedPixels++;
          const y = Math.floor(i / 4 / copy.width);
          if (y >= bandTop && y <= bandBottom &&
            (0.299 * shot[i]! + 0.587 * shot[i + 1]! + 0.114 * shot[i + 2]! >= 200 || shot[i]! - shot[i + 2]! >= 100)) {
            const x = (i / 4) % copy.width;
            left = Math.min(left, x); right = Math.max(right, x);
          }
        }
        row.modes.push({ name: mode, energy, lostPixels, maxLoss, bleedPixels, detectorWidth: right >= left ? right - left + 1 : 0 });
      }
      rows.push(row);
    }
    post.destroy();
    particles.destroy();
    uninstall();
    app.destroy(true, { children: true });
  }
  return rows;
}
