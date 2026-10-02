import { Application, Container, Sprite, Texture, type WebGLRenderer } from 'pixi.js';
import { createParticleSystem, createParticleTextures } from '../../../src/view/particles';
import { createPostPass } from '../../../src/view/post';
import { installEmissionBlending } from '../../../src/view/emission-blending';

export type WitnessKind = 'fire' | 'smoke' | 'fire-then-smoke' | 'smoke-then-fire';

export interface CompositeReport {
  directMinimum: number;
  bloomMinimum: number;
  bloomVsDirectMinimum: number;
  directChanged: number;
}

async function witness(kind: WitnessKind, restoreContext = false, baseline = false): Promise<CompositeReport> {
  const app = new Application();
  await app.init({ width: 320, height: 480, background: 0x8090a0,
    antialias: false, resolution: 1, preference: 'webgl', autoStart: false });
  document.body.appendChild(app.canvas);
  const uninstall = baseline ? () => {} : installEmissionBlending(app.renderer);
  const particles = createParticleSystem(createParticleTextures(app.renderer));
  const layer = new Container();
  layer.addChild(particles.container);
  app.stage.addChild(layer);
  const post = createPostPass(layer, new Container(), 320, 480);
  const canvas = app.canvas as HTMLCanvasElement;
  const read = async () => {
    app.render();
    const image = new Image();
    image.src = canvas.toDataURL();
    await image.decode();
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, copy.width, copy.height).data;
  };
  const background = await read();
  const mixed = kind === 'fire-then-smoke' || kind === 'smoke-then-fire';
  for (let frame = 0; !mixed && frame < 120; frame++) {
    const dt = 1 / 120;
    if (kind !== 'fire') particles.emit('groundSmoke', 160, 100, Math.PI / 2, 1, dt, 1);
    if (kind !== 'smoke') {
      particles.emit('raptorPlumeCore', 160, 100, Math.PI / 2, 1, dt, 1);
      particles.emit('raptorPlume', 160, 100, Math.PI / 2, 1, dt, 1);
    }
    particles.update(dt);
  }
  if (mixed) {
    // Two exactly specified draws isolate compositing algebra. Hundreds of
    // smoke overlaps accumulate intermediate 8-bit render-target rounding;
    // that is a different measurement from this one-draw rounding allowance.
    for (const smoke of kind === 'fire-then-smoke' ? [false, true] : [true, false]) {
      const sprite = new Sprite(Texture.WHITE);
      sprite.position.set(120, 100);
      sprite.width = 80;
      sprite.height = 80;
      sprite.alpha = 0.5;
      sprite.tint = smoke ? 0x405060 : 0x204060;
      sprite.blendMode = smoke ? 'normal' : 'add';
      layer.addChild(sprite);
    }
  }
  const direct = await read();
  post.update(1, 0, { x: 0.5, y: 0.5 }, 1);
  const bloomed = await read();
  if (restoreContext) {
    const renderer = app.renderer as WebGLRenderer;
    const gl = renderer.gl;
    const extension = gl.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('context-loss positive control unavailable');
    const lost = new Promise<void>((resolve) => canvas.addEventListener('webglcontextlost', () => resolve(), { once: true }));
    const restored = new Promise<void>((resolve) => canvas.addEventListener('webglcontextrestored', () => resolve(), { once: true }));
    // Pixi's public loss hook drives its own asynchronous restoration path.
    renderer.context.forceContextLoss();
    await lost;
    await restored;
    const recovered = await read();
    for (let i = 0; i < recovered.length; i++) {
      if (Math.abs(recovered[i]! - bloomed[i]!) > 1) throw new Error('context restoration changed the frozen composite');
    }
  }
  const result: CompositeReport = { directMinimum: 255, bloomMinimum: 255,
    bloomVsDirectMinimum: 255, directChanged: 0 };
  for (let i = 0; i < direct.length; i++) {
    if (i % 4 === 3) continue;
    result.directMinimum = Math.min(result.directMinimum, direct[i]! - background[i]!);
    result.bloomMinimum = Math.min(result.bloomMinimum, bloomed[i]! - background[i]!);
    result.bloomVsDirectMinimum = Math.min(result.bloomVsDirectMinimum, bloomed[i]! - direct[i]!);
    if (direct[i] !== background[i]) result.directChanged++;
  }
  post.destroy();
  particles.destroy();
  uninstall();
  app.destroy(true);
  return result;
}

(window as unknown as { postWitness: typeof witness }).postWitness = witness;
