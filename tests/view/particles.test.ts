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
    /*
      Plus the three this rebuild added: `plasmaTrail` in M6.7, `velocityStreak`
      in M7.5 and `raptorPlumeCore` in M9.6. Listed rather than counted, so an
      effect that arrives without anyone deciding it should shows up here — and
      it did its job at M9.6, which is the only reason this line is being edited
      rather than quietly passing.
    */
    expect(EFFECT_NAMES.sort()).toEqual(
      [
        'aeroHeat',
        'plasmaTrail',
        'aeroTrail',
        'explosion',
        'groundSmoke',
        'raptorPlume',
        'raptorPlumeCore',
        'raptorShutdown',
        'sonicBoom',
        'velocityStreak',
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

/**
 * The particle integrator, and the frame-rate dependence it used to carry.
 *
 * `view/` is not `core/` and has no golden fixtures, but the wound is the same
 * one the seven walls exist for: a picture that depends on how fast the machine
 * happens to be running. Drag was integrated as `1 - drag * dt` — explicit
 * Euler, unclamped, with `dt` a whole frame of simulated time — so a plume drawn
 * in one long frame was shorter than the same plume drawn in ten short ones,
 * and past `dt = 1/drag` the factor went negative and the particles flew
 * backwards. It is `exp(-drag * dt)` now, which is the closed form of the same
 * equation and agrees with itself at every step size.
 *
 * Measured through the pool rather than on a formula: these ask where the
 * particles ARE.
 */
describe('drag does not depend on the frame rate', () => {
  /**
   * Emit one particle of `effect` and carry it forward by `steps` frames of `dt`.
   *
   * Returns the POSITION of the farthest live particle, not its distance: a
   * distance is unsigned, and the failure this file is about is a particle that
   * reverses. `Math.hypot` says the same thing about a plume 30 px out and a
   * plume 30 px the wrong way.
   */
  function travel(effect: EffectName, dt: number, steps: number): { x: number; y: number } {
    const s = system(64);
    s.emit(effect, 0, 0, 0, 1, 1 / 120, 1);
    for (let i = 0; i < steps; i++) s.update(dt);
    let best = { x: 0, y: 0 };
    let far = -1;
    for (const child of s.container.children) {
      if (!child.visible) continue;
      const d = Math.hypot(child.x, child.y);
      if (d > far) {
        far = d;
        best = { x: child.x, y: child.y };
      }
    }
    return best;
  }

  const length = (p: { x: number; y: number }) => Math.hypot(p.x, p.y);

  it('one long frame carries a particle as far as many short ones', () => {
    // A tenth of a second, taken in one step and in twenty.
    const coarse = travel('raptorPlume', 0.1, 1);
    const fine = travel('raptorPlume', 0.005, 20);
    expect(length(coarse), 'the particle moved at all').toBeGreaterThan(0);
    /*
      The exact solution composes: stepping it once over dt and n times over
      dt/n are the same function, so what is left here is float rounding, not
      truncation error. A percent is generous by six orders of magnitude and
      says so deliberately — the claim under test is "the frame rate does not
      change the picture", not "these two doubles are bit-identical".
    */
    const drift = Math.abs(length(coarse) - length(fine)) / length(fine);
    expect(drift, `${length(coarse)} vs ${length(fine)}`).toBeLessThan(0.01);
  });

  it('and a frame longer than 1/drag does not send it backwards', () => {
    /*
      THE FAILURE MODE, stated as a number.

      `groundSmoke` is the subject because it is the effect that both fails and
      survives: its drag is 1.9 per second, so the old `1 - drag * dt` turns
      negative past dt = 0.526 s — a particle drifting away from the pad would
      reverse, in one frame, because the machine was busy — and its life is 1.8 s
      (0.99 at the short end of the jitter), so it is still alive at the end of
      the long frame to be measured. The plume itself cannot be asked this
      question: it lives 0.42 s, less than the frame that breaks it.

      0.6 s is past that threshold and inside that life. It is also a frame this
      application has really seen on a loaded runner.
    */
    const long = travel('groundSmoke', 0.6, 1);
    const short = travel('groundSmoke', 0.01, 60);
    // SAME SIDE OF THE NOZZLE, which is the claim the title makes. A reversed
    // particle has a positive distance and a negative projection.
    const along = (long.x * short.x + long.y * short.y) / length(short);
    expect(along, `${JSON.stringify(long)} against ${JSON.stringify(short)}`).toBeGreaterThan(0);
    const drift = Math.abs(length(long) - length(short)) / length(short);
    expect(drift, `${length(long)} vs ${length(short)}`).toBeLessThan(0.01);
  });

  it('and every particle is carried by its OWN drag when nine are alive at once', () => {
    /*
      THE CACHE, TESTED AS A CACHE — and the second attempt at it.

      The way a per-frame lookup fails is by handing one effect the decay factor
      of another, and that is invisible to any test that watches one effect at a
      time. The first version of this test compared the first particle of a
      lone system against the first particle of a crowded one, which reads well
      and proves nothing: the first particle's drag is always the first key put
      in the cache, so it is always found at slot 0 whatever the lookup does.
      Breaking the scan to return slot 0 unconditionally left it green.

      So ask each particle what drag it thinks it has. With no gravity in x,
      `x(t) = vx0 (1 - e^-kt) / k`, so successive displacements over equal steps
      are in the ratio `e^-k dt` exactly — and `-ln(ratio)/dt` recovers k from
      the pixels, per particle, with no access to anything internal. Every
      recovered k must be one of the nine in the effect table, and there must be
      most of nine distinct ones, or something is sharing a factor.
    */
    const dt = 0.05;
    /*
      WHICH PARTICLE BELONGS TO WHICH EFFECT, established rather than assumed.
      Sprites come off the free list in order, so the crowd's live children are
      its emits in emit order; how many each emit produces is what a lone system
      given the same call produces, because the fractional-emission debt is per
      effect. Without this the test can only ask "is this drag in the table",
      which every particle passes even when they are all sharing one factor.
    */
    const counts = EFFECT_NAMES.map((name) => {
      const one = system(600);
      one.emit(name, 0, 0, 0, 1, 0.1, 1);
      return one.container.children.filter((c) => c.visible).length;
    });

    const s = system(600);
    for (const name of EFFECT_NAMES) s.emit(name, 0, 0, 0, 1, 0.1, 1);

    const live = () => s.container.children.filter((c) => c.visible);
    const before = live().map((c) => c.x);
    expect(before.length, 'every effect emitted').toBe(counts.reduce((a, b) => a + b, 0));

    s.update(dt);
    const first = live().map((c) => c.x);
    s.update(dt);
    const second = live().map((c) => c.x);
    // A particle that died between the two steps would shift the arrays out of
    // step with each other; at dt = 0.05 against the shortest life (0.42 s x
    // 0.65) none can, and this says so rather than assuming it.
    expect(second.length, 'nothing died mid-measurement').toBe(before.length);

    let owner = 0;
    let remaining = counts[0]!;
    let checked = 0;
    for (let i = 0; i < before.length; i++) {
      while (remaining === 0) {
        owner += 1;
        remaining = counts[owner]!;
      }
      remaining -= 1;
      const name = EFFECT_NAMES[owner]!;
      const d1 = first[i]! - before[i]!;
      const d2 = second[i]! - first[i]!;
      /*
        Particles emitted straight up have no x to read a ratio from, and a
        small one is mostly noise: positions live in a Float32Array, so a
        displacement carries about 1e-7 of relative error and `-ln(r)/dt`
        divides that by the step. A tenth of a pixel is plenty of signal.
      */
      if (Math.abs(d1) < 0.1) continue;
      const k = -Math.log(d2 / d1) / dt;
      // A hundredth is two orders looser than that noise and still an order
      // tighter than the closest pair in the table (1.9 against 2.0).
      expect(k, `a ${name} particle moved as if its drag were ${k}`).toBeCloseTo(
        EFFECTS[name].drag,
        2,
      );
      checked += 1;
    }
    expect(checked, 'particles with enough sideways motion to read').toBeGreaterThan(
      EFFECT_NAMES.length,
    );
  });
});
