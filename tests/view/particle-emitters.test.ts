import { describe, expect, it } from 'vitest';
import { Sprite, Texture } from 'pixi.js';
import { createParticleSystem } from '$view/particles';

const snapshot = (system: ReturnType<typeof createParticleSystem>, left: boolean) =>
  system.container.children.filter((child): child is Sprite => child instanceof Sprite && child.visible
    && (left ? child.x < 500 : child.x > 500))
    .map(child => ({ x: child.x, y: child.y, alpha: child.alpha, width: child.width }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

describe('independent pooled engine emitters', () => {
  it('does not lose integer birth boundaries when the per-engine rate is fractional per frame', () => {
    const particles = createParticleSystem(Texture.EMPTY, 4000, 12345);
    for (let frame = 0; frame < 30; frame++) {
      particles.emit('raptorPlumeCore', 0, 0, Math.PI / 2, 80 / 300, 1 / 120, 1, 1, 0, 0, 1);
      particles.update(1 / 120);
    }
    //80 births/s for0.25s =20; every core life exceeds this window.
    expect(particles.alive).toBe(20);
    particles.destroy();
  });

  it('keeps fractional birth debt on its engine instead of giving it to its neighbour', () => {
    const particles = createParticleSystem(Texture.EMPTY, 4000, 12345);
    particles.emit('raptorPlumeCore', 0, 0, Math.PI / 2, 1, 1 / 600, 1, 1, 0, 0, 1);
    particles.emit('raptorPlumeCore', 1000, 0, Math.PI / 2, 1, 1 / 600, 1, 1, 0, 0, 2);
    expect(particles.alive).toBe(0);
    particles.emit('raptorPlumeCore', 0, 0, Math.PI / 2, 1, 1 / 600, 1, 1, 0, 0, 1);
    expect(particles.alive).toBe(1);
    particles.emit('raptorPlumeCore', 1000, 0, Math.PI / 2, 1, 1 / 600, 1, 1, 0, 0, 2);
    expect(particles.alive).toBe(2);
    particles.update(1 / 600);
    expect(snapshot(particles, true)).toHaveLength(1);
    expect(snapshot(particles, false)).toHaveLength(1);
    particles.destroy();
  });

  it('keeps each engine’s geometry invariant across frame batching and other engine activity', () => {
    const run = (hz: number, secondEngine: boolean) => {
      const particles = createParticleSystem(Texture.EMPTY, 4000, 12345);
      for (let frame = 0; frame < hz * 2; frame++) {
        particles.emit('raptorPlumeCore', 0, 0, Math.PI / 2, 1, 1 / hz, 1, 1, 0, 0, 1);
        if (secondEngine) particles.emit('raptorPlumeCore', 1000, 0, Math.PI / 2, 1, 1 / hz, 1, 1, 0, 0, 2);
        particles.update(1 / hz);
      }
      const out = snapshot(particles, true);
      particles.destroy();
      return out;
    };
    const fine = run(120, true);
    expect(fine.length).toBeGreaterThan(100);
    expect(run(120, false)).toEqual(fine);
    const coarse = run(4, true);
    expect(coarse).toHaveLength(fine.length);
    for (let i = 0; i < fine.length; i++) {
      for (const field of ['x', 'y', 'alpha', 'width'] as const) {
        expect(Math.abs(coarse[i]![field] - fine[i]![field])).toBeLessThan(0.001);
      }
    }
  });

  it('resets all emitter streams and fractional debt on a cleared flight', () => {
    const particles = createParticleSystem(Texture.EMPTY, 4000, 12345);
    const fresh = createParticleSystem(Texture.EMPTY, 4000, 12345);
    particles.emit('raptorPlumeCore', 0, 0, Math.PI / 2, 1, 0.251, 1, 1, 0, 0, 3);
    particles.update(0.251);
    particles.clear();
    for (const system of [particles, fresh]) {
      system.emit('raptorPlumeCore', 0, 0, Math.PI / 2, 1, 0.25, 1, 1, 0, 0, 3);
      system.update(0.25);
    }
    expect(snapshot(particles, true)).toEqual(snapshot(fresh, true));
    particles.destroy();
    fresh.destroy();
  });
});
