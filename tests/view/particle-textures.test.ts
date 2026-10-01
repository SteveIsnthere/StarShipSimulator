/**
 * M9.5: four shapes instead of one, measured rather than looked at.
 *
 * Until this task `createParticleTexture` built a single 64 px white radial
 * gradient and all nine effects drew with it, so the Raptor plume, the pad dust,
 * the plasma wake, the transonic cone and the explosion were the same dot in
 * different tints. A tint can change what colour something is. It cannot change
 * whether it has an edge, whether its interior is flat, or whether it is round.
 *
 * `writeParticleTexture` is pure and takes no canvas, which is what makes this
 * file possible: the shapes are measured in Node with no GPU and no DOM, as
 * radial profiles and moments rather than as pictures. Nothing here compares one
 * image with another image — see the note at the top of `tests/e2e/pixels.ts`
 * for why this milestone does no golden-image diffing anywhere.
 */
import { describe, expect, it } from 'vitest';
import {
  EFFECTS,
  PARTICLE_TEXTURES,
  textureRandom,
  writeParticleTexture,
  type EffectName,
  type ParticleTextureName,
} from '$view/particles';

const CELL = 64;

/** Alpha channel of one generated texture, as a plain array. */
function alphaOf(name: ParticleTextureName, cell = CELL): number[] {
  const buffer = new Uint8ClampedArray(cell * cell * 4);
  writeParticleTexture(name, cell, buffer);
  const alpha: number[] = [];
  for (let i = 0; i < cell * cell; i++) alpha.push(buffer[i * 4 + 3]!);
  return alpha;
}

/** Total alpha, and how much of it falls inside a given fraction of the radius. */
function energy(alpha: readonly number[], cell = CELL): (within: number) => number {
  const half = cell / 2;
  let total = 0;
  for (let py = 0; py < cell; py++) {
    for (let px = 0; px < cell; px++) total += alpha[py * cell + px]!;
  }
  return (within: number) => {
    let inside = 0;
    for (let py = 0; py < cell; py++) {
      for (let px = 0; px < cell; px++) {
        const dx = (px + 0.5 - half) / half;
        const dy = (py + 0.5 - half) / half;
        if (Math.hypot(dx, dy) <= within) inside += alpha[py * cell + px]!;
      }
    }
    return total === 0 ? 0 : inside / total;
  };
}

describe('every effect names a texture, and every texture is used', () => {
  it('the nine effects between them use all four', () => {
    const used = new Set(Object.values(EFFECTS).map((e) => e.texture));
    expect([...used].sort()).toEqual([...PARTICLE_TEXTURES].sort());
  });

  it('no effect was left without one', () => {
    for (const name of Object.keys(EFFECTS) as EffectName[]) {
      expect(PARTICLE_TEXTURES, name).toContain(EFFECTS[name].texture);
    }
  });
});

describe('the four are actually different shapes', () => {
  it('core concentrates its light where soft spreads it', () => {
    /*
      THE MEASUREMENT THAT MATTERS FOR THE PLUME. Additive blending sums
      overlapping particles, so a wide gradient becomes a flat wash and a tight
      core becomes a bright centre with a thin halo. Measured as the share of
      total alpha inside a third of the radius.
    */
    const core = energy(alphaOf('core'))(1 / 3);
    const soft = energy(alphaOf('soft'))(1 / 3);
    const report = `core ${(core * 100).toFixed(0)}% inside r/3, soft ${(soft * 100).toFixed(0)}%`;
    expect(core, report).toBeGreaterThan(soft * 1.5);
    expect(core, report).toBeGreaterThan(0.4);
  });

  it('soft is the 2021 gradient, ramp for ramp', () => {
    /*
      The one texture that must not change. Everything tuned against it before
      M9.5 — the shock cone, and every startSize/endSize/alpha in EFFECTS — was
      tuned against `rgba(255,255,255,1)` at the centre, 0.65 at 40% of the
      radius and 0 at the rim, linear between.
    */
    const alpha = alphaOf('soft');
    const half = CELL / 2;
    const at = (t: number) => alpha[Math.round(half - 0.5) * CELL + Math.round(half - 0.5 + t * half)]!;
    expect(at(0) / 255).toBeCloseTo(1, 1);
    expect(at(0.4) / 255).toBeCloseTo(0.65, 1);
    expect(at(0.98) / 255).toBeCloseTo(0, 1);
  });

  it('smoke has an interior, where soft is perfectly smooth', () => {
    /*
      "Ragged" as a number: walk a ring at 55% of the radius and measure how
      much the alpha varies around it. A radial gradient is constant on any
      ring, by construction; a cloud is not.
    */
    const ring = (name: ParticleTextureName): number => {
      const alpha = alphaOf(name);
      const half = CELL / 2;
      const samples: number[] = [];
      for (let i = 0; i < 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        const px = Math.round(half + Math.cos(angle) * half * 0.55);
        const py = Math.round(half + Math.sin(angle) * half * 0.55);
        samples.push(alpha[py * CELL + px]!);
      }
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
      return Math.sqrt(variance);
    };
    const smoke = ring('smoke');
    const soft = ring('soft');
    const report = `smoke ring deviation ${smoke.toFixed(1)}, soft ${soft.toFixed(1)}`;
    /*
      Soft is not exactly zero — 5.3 of 255 — and the reason is the sampling
      rather than the texture: the ring is walked at rounded pixel coordinates,
      so the sampled radius wobbles by half a pixel and a steep gradient turns
      that into a few levels of alpha. Measured, smoke is 17.8. The claim is the
      ratio, not the absolute.
    */
    expect(soft, report).toBeLessThan(8);
    expect(smoke, report).toBeGreaterThan(12);
    expect(smoke, report).toBeGreaterThan(soft * 2.5);
  });

  it('smoke has a ragged silhouette, not a circle', () => {
    // The radius at which each direction fades out, measured around the rim.
    const alpha = alphaOf('smoke');
    const half = CELL / 2;
    const radii: number[] = [];
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      let last = 0;
      for (let r = 0; r < half - 2; r += 0.5) {
        const px = Math.round(half + Math.cos(angle) * r);
        const py = Math.round(half + Math.sin(angle) * r);
        if (alpha[py * CELL + px]! > 8) last = r;
      }
      radii.push(last);
    }
    const spread = Math.max(...radii) - Math.min(...radii);
    expect(spread, `rim varies by ${spread.toFixed(1)} px around the circle`).toBeGreaterThan(3);
  });

  it('wisp is elongated, and the round ones are round', () => {
    const aspect = (name: ParticleTextureName): number => {
      const alpha = alphaOf(name);
      let minX = CELL;
      let maxX = -1;
      let minY = CELL;
      let maxY = -1;
      for (let py = 0; py < CELL; py++) {
        for (let px = 0; px < CELL; px++) {
          if (alpha[py * CELL + px]! > 24) {
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
      }
      return (maxX - minX + 1) / (maxY - minY + 1);
    };
    const wisp = aspect('wisp');
    expect(wisp, `wisp aspect ${wisp.toFixed(2)}`).toBeGreaterThan(1.6);
    for (const round of ['core', 'soft', 'smoke'] as const) {
      expect(aspect(round), round).toBeGreaterThan(0.75);
      expect(aspect(round), round).toBeLessThan(1.35);
    }
  });

  it('all four fade to nothing before the frame edge', () => {
    /*
      NOT COSMETIC. The four share one GPU texture and are addressed as frames of
      it, so a bilinear sample at a frame boundary reads the neighbour. A
      transparent margin is what makes an atlas safe, and it is cheaper to assert
      than to notice.
    */
    for (const name of PARTICLE_TEXTURES) {
      const alpha = alphaOf(name);
      for (let i = 0; i < CELL; i++) {
        expect(alpha[i], `${name} top row`).toBe(0);
        expect(alpha[(CELL - 1) * CELL + i], `${name} bottom row`).toBe(0);
        expect(alpha[i * CELL], `${name} left column`).toBe(0);
        expect(alpha[i * CELL + CELL - 1], `${name} right column`).toBe(0);
      }
    }
  });
});

describe('deterministic, like the cloud deck', () => {
  it('generates identical bytes every time', () => {
    for (const name of PARTICLE_TEXTURES) {
      const a = new Uint8ClampedArray(CELL * CELL * 4);
      const b = new Uint8ClampedArray(CELL * CELL * 4);
      writeParticleTexture(name, CELL, a);
      writeParticleTexture(name, CELL, b);
      expect(Array.from(a), name).toEqual(Array.from(b));
    }
  });

  it('the hash is stable, salted, and spread over the unit interval', () => {
    // Pinned the way `puffRandom` is: this is what "two players see the same
    // smoke" reduces to.
    expect(textureRandom(0, 0, 0)).toBe(textureRandom(0, 0, 0));
    expect(textureRandom(1, 0, 0)).not.toBe(textureRandom(0, 1, 0));
    expect(textureRandom(3, 4, 1)).not.toBe(textureRandom(3, 4, 2));
    let min = 1;
    let max = 0;
    let sum = 0;
    let n = 0;
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 40; y++) {
        const v = textureRandom(x, y, 7);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
        min = Math.min(min, v);
        max = Math.max(max, v);
        sum += v;
        n++;
      }
    }
    expect(min).toBeLessThan(0.02);
    expect(max).toBeGreaterThan(0.98);
    expect(sum / n).toBeCloseTo(0.5, 1);
  });

  it('scales to any cell size without changing shape', () => {
    // Generated rather than shipped means it can be regenerated larger for a
    // dense display without a second asset. The energy profile should barely
    // move; the pixel grid should be the only difference.
    for (const name of PARTICLE_TEXTURES) {
      const small = energy(alphaOf(name, 32), 32)(0.5);
      const large = energy(alphaOf(name, 128), 128)(0.5);
      expect(large, `${name}: ${small.toFixed(3)} at 32 px, ${large.toFixed(3)} at 128`).toBeCloseTo(
        small,
        1,
      );
    }
  });
});
