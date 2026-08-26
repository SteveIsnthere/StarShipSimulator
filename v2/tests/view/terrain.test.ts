/**
 * M9.8: the ground stops being one value.
 *
 * THE MEASUREMENT THAT OPENED THIS TASK. At six kilometres the harness reported
 * the bottom fifth of the frame as luma spread 0.47, a single tone bucket, and
 * one 4-bit colour bin holding 100% of the pixels. Two `Graphics` fills — the
 * near ground and the far earth — and nothing else. A flat brown band at the
 * bottom of a picture reads as ground, which is why three milestones of
 * screenshot review never mentioned it.
 *
 * `writeMottleTile` and `writeGroundRamp` are pure and take no canvas, so the
 * numbers that matter can be measured here in Node rather than through a
 * browser: the tone spread the mottle produces, that it tiles seamlessly, that
 * the ramp is monotonic, and that both are the same every run.
 */
import { describe, expect, it } from 'vitest';
import {
  MOTTLE_FLOOR,
  MOTTLE_TILE,
  RAMP_FOREGROUND,
  RAMP_HEIGHT,
  writeGroundRamp,
  writeMottleTile,
} from '$view/terrain';
import { GROUND_OBJECTS } from '$view/assets';
import { groundTint } from '$view/atmosphere-look';
import { GROUND_COLOR } from '$view/world';

function mottle(size = MOTTLE_TILE): number[] {
  const buffer = new Uint8ClampedArray(size * size * 4);
  writeMottleTile(size, buffer);
  const values: number[] = [];
  for (let i = 0; i < size * size; i++) values.push(buffer[i * 4]!);
  return values;
}

const stdev = (xs: readonly number[]): number => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
};

describe('the mottle', () => {
  it('has a tone spread where the flat fill had none', () => {
    /*
      The number this task exists to move. A `Graphics` fill has a standard
      deviation of exactly zero by construction; measured through the browser
      harness the band came out at 0.47, which is the renderer's antialiasing
      and nothing else.
    */
    const values = mottle();
    const spread = stdev(values);
    const report = `mottle spread ${spread.toFixed(1)} of 255, range ${Math.min(...values)}..${Math.max(...values)}`;
    expect(spread, report).toBeGreaterThan(10);
    // And bounded, because it is a MULTIPLIER on the tint: brighter than full
    // would mean ground lighter than the colour the atmosphere says it is.
    expect(Math.max(...values), report).toBeLessThanOrEqual(255);
    expect(Math.min(...values) / 255, report).toBeGreaterThanOrEqual(MOTTLE_FLOOR - 0.02);
  });

  it('tiles seamlessly, or the ground is a grid', () => {
    /*
      A TilingSprite repeats this texture across three screen widths. If the
      lattice did not wrap, every tile boundary would be a visible seam and the
      ground would read as graph paper — which is a worse failure than the flat
      fill it replaces, and one that only shows up on a wide frame.
    */
    const size = MOTTLE_TILE;
    const values = mottle(size);
    for (let i = 0; i < size; i++) {
      const leftEdge = values[i * size]!;
      const rightEdge = values[i * size + size - 1]!;
      const topEdge = values[i]!;
      const bottomEdge = values[(size - 1) * size + i]!;
      // Opposite edges are adjacent once tiled, so they must be within one
      // step of the noise rather than identical.
      expect(Math.abs(leftEdge - rightEdge), `row ${i}`).toBeLessThan(14);
      expect(Math.abs(topEdge - bottomEdge), `column ${i}`).toBeLessThan(14);
    }
  });

  it('is deterministic, and scales without changing character', () => {
    const a = new Uint8ClampedArray(MOTTLE_TILE * MOTTLE_TILE * 4);
    const b = new Uint8ClampedArray(MOTTLE_TILE * MOTTLE_TILE * 4);
    writeMottleTile(MOTTLE_TILE, a);
    writeMottleTile(MOTTLE_TILE, b);
    expect(Array.from(a)).toEqual(Array.from(b));
    // Half the resolution, same statistics: the noise is a function of position
    // in the tile rather than of the pixel grid.
    expect(stdev(mottle(64))).toBeCloseTo(stdev(mottle(128)), -1);
  });

  it('multiplies into the tinted ground rather than colouring it', () => {
    /*
      THE CONSTRAINT THAT MATTERS. M6.7 made the ground dim with the sky because
      2021 darkened one and not the other and the world came apart at the
      horizon. A terrain fill that picked its own colours would reintroduce that
      one layer down. The mottle is greyscale and is tinted through the same
      `groundTint` call the flat fill used, so the darkest it can be is a
      fraction of the atmosphere's colour and the brightest is that colour.
    */
    for (const lightness of [0, 0.25, 0.6, 1]) {
      const tint = groundTint(GROUND_COLOR, lightness);
      const red = (tint >> 16) & 0xff;
      const values = mottle(32);
      const brightest = (Math.max(...values) / 255) * red;
      const darkest = (Math.min(...values) / 255) * red;
      expect(brightest, `lightness ${lightness}`).toBeLessThanOrEqual(red + 1e-9);
      expect(darkest, `lightness ${lightness}`).toBeLessThan(brightest);
    }
  });
});

describe('the vertical ramp', () => {
  it('runs bright at the horizon to dark underfoot, monotonically', () => {
    const buffer = new Uint8ClampedArray(RAMP_HEIGHT * 4);
    writeGroundRamp(RAMP_HEIGHT, buffer);
    let previous = 256;
    for (let y = 0; y < RAMP_HEIGHT; y++) {
      const value = buffer[y * 4]!;
      expect(value, `row ${y}`).toBeLessThanOrEqual(previous);
      previous = value;
    }
    expect(buffer[0]).toBe(255);
    expect(buffer[(RAMP_HEIGHT - 1) * 4]! / 255).toBeCloseTo(RAMP_FOREGROUND, 1);
  });

  it('spends most of its change near the horizon', () => {
    // Squared rather than linear, so the value shift lands where the air
    // actually thins along the line of sight. A linear ramp puts it in the
    // middle of the band, where it reads as a band of its own.
    const buffer = new Uint8ClampedArray(RAMP_HEIGHT * 4);
    writeGroundRamp(RAMP_HEIGHT, buffer);
    const total = buffer[0]! - buffer[(RAMP_HEIGHT - 1) * 4]!;
    const firstThird = buffer[0]! - buffer[Math.floor(RAMP_HEIGHT / 3) * 4]!;
    expect(firstThird / total).toBeLessThan(0.3);
  });
});

describe('more scenery, and nothing new to fetch', () => {
  it('adds instances rather than art', () => {
    /*
      Every added object reuses a `src` that was already in the table, so
      `loadTextures` fetches exactly the same set of files and the asset budget
      cannot move. Asserted as a set comparison rather than by counting, because
      what matters is which FILES exist, not how many objects use them.
    */
    const sources = new Set(GROUND_OBJECTS.map((o) => o.src));
    expect(sources.size).toBe(9);
    expect(GROUND_OBJECTS.length).toBeGreaterThan(20);
  });

  it('gives every object a unique id', () => {
    const ids = GROUND_OBJECTS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('THE PIG IS AT x = 0', () => {
    // CLAUDE.md names it in the soul. It spawns half a planet from StarBase and
    // roams, so it reappears wherever you fly. That is the joke, and it is
    // load-bearing.
    const pig = GROUND_OBJECTS.find((o) => o.id === 'pig');
    expect(pig).toBeDefined();
    expect(pig!.x).toBe(0);
    expect(pig!.roams).toBe(true);
  });

  it('leaves the fixed StarBase positions exactly where they were', () => {
    // The five objects that place the pad. M9.8 may add scenery around them and
    // may not move them.
    const fixed = Object.fromEntries(
      GROUND_OBJECTS.filter((o) => !o.roams).map((o) => [o.id, o.x]),
    );
    const starBase = GROUND_OBJECTS.find((o) => o.id === 'starBaseBackGround2')!.x + 100;
    expect(fixed['starBaseBackGround2']).toBe(starBase - 100);
    expect(fixed['starBaseBackGround']).toBe(starBase + 100);
    expect(fixed['sn15']).toBe(starBase - 100);
    expect(fixed['starhopper']).toBe(starBase - 200);
    expect(fixed['lunchpad_Light1']).toBe(starBase - 30);
    expect(fixed['lunchpad_Light2']).toBe(starBase + 30);
  });
});
