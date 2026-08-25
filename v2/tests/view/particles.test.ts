/**
 * M3.3: pooled particles, and the death of the shutdown leak.
 *
 * THE 2021 DEFECT. backend/utilities/switches.js:26 ran, on every engine
 * shutdown:
 *
 *     globalThis.raptorShutDownEffect1 = new PIXI.Container();
 *     globalThis.raptorShutDownEffectEmitter1 = fx.getParticleEmitter('RaptorShutDown');
 *     starShipAndEffects.addChild(raptorShutDownEffect1)
 *
 * A new container and a new emitter, added to the scene, never removed. The
 * landing autopilot shuts engines down repeatedly - raptorAutoShutDown fires
 * every time minimum thrust exceeds weight - so the scene graph grew for as long
 * as the session lasted.
 *
 * These tests assert the property that makes that impossible: the pool's size
 * never changes, no matter what is thrown at it.
 */
import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';
import { createParticleSystem, EFFECTS, type EffectName } from '$view/particles';

const EFFECT_NAMES = Object.keys(EFFECTS) as EffectName[];

/** Pixi's EMPTY texture needs no GPU, so these run headless. */
const system = (capacity = 500) => createParticleSystem(Texture.EMPTY, capacity, 12345);

describe('the pool never grows', () => {
  it('allocates every sprite up front', () => {
    const s = system(500);
    expect(s.container.children.length).toBe(500);
    expect(s.capacity).toBe(500);
    expect(s.alive).toBe(0);
  });

  it('emitting does not add a single child', () => {
    const s = system(500);
    const before = s.container.children.length;
    for (let i = 0; i < 2_000; i++) {
      s.emit('raptorPlume', 0, 0, 0, 1, 1 / 120, 1);
      s.update(1 / 120);
    }
    expect(s.container.children.length).toBe(before);
  });

  it('THE LEAK: ten thousand engine shutdowns add nothing', () => {
    // The exact 2021 failure, at a scale no real flight reaches.
    const s = system(500);
    const before = s.container.children.length;
    for (let i = 0; i < 10_000; i++) {
      s.burst('raptorShutdown', 0, 0, 40, 1);
      s.update(1 / 60);
    }
    expect(s.container.children.length).toBe(before);
    expect(s.alive).toBeLessThanOrEqual(s.capacity);
  });

  it('never exceeds capacity, however hard it is pushed', () => {
    const s = system(200);
    for (let i = 0; i < 100; i++) {
      s.burst('explosion', 0, 0, 5_000, 1);
      expect(s.alive).toBeLessThanOrEqual(200);
    }
  });

  it('drops particles rather than growing when saturated', () => {
    // The honest trade: a full pool refuses new work. Silently allocating more
    // is what the 2021 code did.
    const s = system(50);
    s.burst('explosion', 0, 0, 500, 1);
    expect(s.alive).toBe(50);
    expect(s.container.children.length).toBe(50);
  });
});

describe('particles are recycled', () => {
  it('returns to zero alive once everything has expired', () => {
    const s = system(500);
    s.burst('raptorShutdown', 0, 0, 100, 1);
    expect(s.alive).toBeGreaterThan(0);
    // Longest possible life is life * (1 + jitter).
    for (let i = 0; i < 600; i++) s.update(1 / 60);
    expect(s.alive).toBe(0);
  });

  it('a recycled slot can be used again, indefinitely', () => {
    const s = system(20);
    for (let cycle = 0; cycle < 200; cycle++) {
      s.burst('raptorShutdown', 0, 0, 20, 1);
      expect(s.alive).toBe(20);
      for (let i = 0; i < 400; i++) s.update(1 / 60);
      expect(s.alive).toBe(0);
    }
    expect(s.container.children.length).toBe(20);
  });

  it('clear() kills everything without deallocating', () => {
    const s = system(500);
    s.burst('explosion', 0, 0, 400, 1);
    expect(s.alive).toBeGreaterThan(0);
    s.clear();
    expect(s.alive).toBe(0);
    expect(s.container.children.length).toBe(500);
    // And the pool is fully usable afterwards.
    s.burst('explosion', 0, 0, 400, 1);
    expect(s.alive).toBe(400);
  });

  it('dead particles are hidden, not left drawing', () => {
    const s = system(50);
    s.burst('raptorShutdown', 0, 0, 50, 1);
    for (let i = 0; i < 400; i++) s.update(1 / 60);
    expect(s.container.children.every((c) => !c.visible)).toBe(true);
  });
});

describe('emission', () => {
  it('rate is per second, and honours fractional particles', () => {
    // At 20/s and 1/120 s per frame, a naive floor would emit nothing forever.
    const s = system(2000);
    let emitted = 0;
    for (let i = 0; i < 120; i++) {
      const before = s.alive;
      s.emit('aeroTrail', 0, 0, 0, 20 / EFFECTS.aeroTrail.rate, 1 / 120, 1);
      emitted += s.alive - before;
    }
    expect(emitted).toBeGreaterThanOrEqual(19);
    expect(emitted).toBeLessThanOrEqual(21);
  });

  it('zero intensity emits nothing', () => {
    const s = system(500);
    for (let i = 0; i < 200; i++) s.emit('raptorPlume', 0, 0, 0, 0, 1 / 120, 1);
    expect(s.alive).toBe(0);
  });

  it('intensity scales the count linearly', () => {
    const half = system(4000);
    const full = system(4000);
    for (let i = 0; i < 60; i++) {
      half.emit('raptorPlume', 0, 0, 0, 0.5, 1 / 60, 1);
      full.emit('raptorPlume', 0, 0, 0, 1, 1 / 60, 1);
    }
    expect(full.alive / half.alive).toBeCloseTo(2, 0);
  });

  it('is deterministic for a given seed', () => {
    const a = createParticleSystem(Texture.EMPTY, 300, 999);
    const b = createParticleSystem(Texture.EMPTY, 300, 999);
    for (let i = 0; i < 50; i++) {
      a.emit('raptorPlume', 10, 20, 0.3, 1, 1 / 60, 1);
      b.emit('raptorPlume', 10, 20, 0.3, 1, 1 / 60, 1);
      a.update(1 / 60);
      b.update(1 / 60);
    }
    expect(a.alive).toBe(b.alive);
    const posA = a.container.children.map((c) => `${c.x.toFixed(6)},${c.y.toFixed(6)}`);
    const posB = b.container.children.map((c) => `${c.x.toFixed(6)},${c.y.toFixed(6)}`);
    expect(posA).toEqual(posB);
  });
});

describe('every 2021 effect is present', () => {
  it('covers plume, shutdown, aero trail, ground smoke, sonic boom, heat and explosion', () => {
    expect(EFFECT_NAMES.sort()).toEqual(
      [
        'aeroHeat',
        'plasmaTrail',
        'aeroTrail',
        'explosion',
        'groundSmoke',
        'raptorPlume',
        'raptorShutdown',
        'sonicBoom',
      ].sort(),
    );
  });

  it.each(EFFECT_NAMES)('%s produces particles that live and die', (name) => {
    const s = system(3000);
    s.burst(name, 0, 0, 50, 1);
    expect(s.alive, `${name} emitted nothing`).toBe(50);
    for (let i = 0; i < 1000; i++) s.update(1 / 60);
    expect(s.alive, `${name} left particles alive`).toBe(0);
  });

  it.each(EFFECT_NAMES)('%s has a sane configuration', (name) => {
    const c = EFFECTS[name];
    expect(c.life, 'life').toBeGreaterThan(0);
    expect(c.lifeJitter, 'lifeJitter must not allow zero or negative life').toBeLessThan(1);
    expect(c.rate).toBeGreaterThan(0);
    expect(c.startAlpha).toBeGreaterThan(0);
    expect(c.endAlpha).toBeLessThanOrEqual(c.startAlpha);
    expect(c.drag).toBeGreaterThanOrEqual(0);
  });
});

describe('motion', () => {
  it('particles move away from the emission point', () => {
    const s = system(100);
    s.emit('raptorPlume', 0, 0, 0, 1, 1 / 10, 1);
    const n = s.alive;
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < 5; i++) s.update(1 / 60);
    const moved = s.container.children.filter((c) => c.visible && Math.abs(c.x) > 0.01);
    expect(moved.length).toBe(n);
  });

  it('drag slows them down', () => {
    const s = system(100);
    s.burst('raptorPlume', 0, 0, 1, 1);
    const first = s.container.children.find((c) => c.visible)!;
    let previousStep = Infinity;
    let lastX = first.x;
    for (let i = 0; i < 8; i++) {
      s.update(1 / 60);
      const step = Math.abs(first.x - lastX);
      expect(step).toBeLessThanOrEqual(previousStep + 1e-9);
      previousStep = step;
      lastX = first.x;
    }
  });

  it('scale multiplies size and speed together', () => {
    const small = createParticleSystem(Texture.EMPTY, 10, 7);
    const big = createParticleSystem(Texture.EMPTY, 10, 7);
    small.burst('groundSmoke', 0, 0, 1, 1);
    big.burst('groundSmoke', 0, 0, 1, 3);
    small.update(1 / 60);
    big.update(1 / 60);
    const a = small.container.children.find((c) => c.visible)!;
    const b = big.container.children.find((c) => c.visible)!;
    expect(b.width / a.width).toBeCloseTo(3, 1);
  });
});
