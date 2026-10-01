/**
 * M6.8: the overlay is legible over the brightest thing behind it.
 *
 * THE RISK THIS ANSWERS. The whole design is white text at four opacities over
 * a translucent scrim, and behind that scrim is a daytime sky. Nothing about
 * that is safe by construction: `--ink-45` over a thin part of the gradient
 * over `#a7bdd9` is a light grey on a light blue, and the plan flagged it as a
 * risk before any of it was built ("scrim over bright sky at noon"). An
 * eyeballed check would pass on a dark monitor and fail on a phone at the beach.
 *
 * HOW IT IS CHECKED. Everything is read from the real sources — the gradient
 * stops and the ink ramp are parsed out of `theme.css`, the sky colour comes
 * from `$view/sky` — so a change to any of them moves this test rather than
 * quietly invalidating it. The gradient is evaluated at each point, composited
 * over the worst-case sky, and run through the WCAG 2.1 contrast formula.
 *
 * The band matters as much as the numbers. Text does not sit at the very top of
 * the scrim, where the gradient has faded to nothing and NOTHING would pass;
 * `tests/e2e/a11y.spec.ts` measures where the text actually is and asserts it
 * stays inside the band this file certifies. Two tests, one claim.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SKY_COLOR } from '$view/sky';

const THEME = readFileSync(fileURLToPath(new URL('../../src/ui/theme.css', import.meta.url)), 'utf8');

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** `rgb(6 8 12 / 92%)`, `rgb(255 255 255)`, or `transparent`. */
function parseColor(text: string): Rgba {
  if (/^\s*transparent\s*$/.test(text)) return { r: 0, g: 0, b: 0, a: 0 };
  const match = /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+)%)?\s*\)/.exec(text);
  if (!match) throw new Error(`unparsed colour: ${text}`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]) / 100,
  };
}

/** One `--token: <colour>;` declaration, straight out of the stylesheet. */
function token(name: string): Rgba {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(THEME);
  if (!match) throw new Error(`missing token --${name}`);
  return parseColor(match[1]!);
}

interface Stop {
  color: Rgba;
  /** 0 at the bottom of the scrim, 1 at the top. */
  position: number;
}

/** A bottom-up scrim gradient, parsed from the stylesheet rather than retyped. */
function parseScrim(name = 'scrim'): Stop[] {
  const block = new RegExp(`--${name}:\\s*linear-gradient\\(([\\s\\S]*?)\\);`).exec(THEME);
  if (!block) throw new Error(`missing --${name}`);
  const body = block[1]!;
  expect(body, 'the scrim must rise from the bottom edge').toContain('to top');

  const stops: Stop[] = [];
  for (const match of body.matchAll(/(rgb\([^)]*\)|transparent)\s+([\d.]+)%/g)) {
    stops.push({ color: parseColor(match[1]!), position: Number(match[2]) / 100 });
  }
  expect(stops.length, 'the scrim should have several stops').toBeGreaterThan(2);
  return stops;
}

const SCRIM = parseScrim();
const SCRIM_PHONE = parseScrim('scrim-phone');

/** The scrim's colour at a height, 0 at the bottom edge. */
function scrimAt(position: number, stops: Stop[] = SCRIM): Rgba {
  const p = Math.min(1, Math.max(0, position));
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1]!;
    const b = stops[i]!;
    if (p > b.position) continue;
    const span = b.position - a.position;
    const t = span === 0 ? 0 : (p - a.position) / span;
    // CSS interpolates gradients in premultiplied alpha, which is exactly why
    // fading to `transparent` does not go through grey. Modelled the same way.
    const pa = a.color.a;
    const pb = b.color.a;
    const alpha = pa + (pb - pa) * t;
    const mix = (ca: number, cb: number) =>
      alpha === 0 ? 0 : (ca * pa + (cb * pb - ca * pa) * t) / alpha;
    return {
      r: mix(a.color.r, b.color.r),
      g: mix(a.color.g, b.color.g),
      b: mix(a.color.b, b.color.b),
      a: alpha,
    };
  }
  return stops[stops.length - 1]!.color;
}

/** `over` composited on `under`, both opaque out. */
function composite(over: Rgba, under: Rgba): Rgba {
  return {
    r: over.r * over.a + under.r * (1 - over.a),
    g: over.g * over.a + under.g * (1 - over.a),
    b: over.b * over.a + under.b * (1 - over.a),
    a: 1,
  };
}

/** WCAG 2.1 relative luminance. The published transform, written out. */
function luminance(c: Rgba): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

function contrast(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** The brightest thing that can ever be behind the overlay: the noon sky. */
const BRIGHTEST_SKY: Rgba = { r: SKY_COLOR.r, g: SKY_COLOR.g, b: SKY_COLOR.b, a: 1 };

/**
 * How far up the scrim text is allowed to sit.
 *
 * Above this the gradient has faded far enough that nothing would pass, which
 * is not a failure — it is the part of the scrim that exists to blend the
 * overlay into the world. `tests/e2e/a11y.spec.ts` asserts no text is up there.
 */
const TEXT_BAND_TOP = 0.75;

/**
 * And how far up the PHONE scrim.
 *
 * Higher, because the phone's lower third is taller relative to its own ramp —
 * the engineering strip wraps to two lines and the block is compressed, so text
 * lands at 81-85% where the desktop layout keeps it under 75%. That is why
 * `--scrim-phone` exists: same contrast budget, different geometry. Must match
 * PHONE_BAND_TOP in tests/e2e/a11y.spec.ts.
 */
const PHONE_BAND_TOP = 0.9;

/** Contrast of an ink token at a height on the scrim, over the worst sky. */
function inkContrast(ink: Rgba, position: number, stops: Stop[] = SCRIM): number {
  const background = composite(scrimAt(position, stops), BRIGHTEST_SKY);
  const rendered = composite(ink, background);
  return contrast(rendered, background);
}

describe('the model matches the stylesheet it claims to describe', () => {
  it('reads the scrim stops out of theme.css', () => {
    expect(SCRIM[0]!.color.a).toBeCloseTo(0.94, 4);
    expect(SCRIM[SCRIM.length - 1]!.color.a).toBe(0);
  });

  it('reads the ink ramp out of theme.css', () => {
    expect(token('ink-100').a).toBe(1);
    expect(token('ink-70').a).toBeCloseTo(0.7, 4);
    expect(token('ink-45').a).toBeCloseTo(0.45, 4);
  });

  it('computes the reference contrasts the WCAG spec publishes', () => {
    // Black on white is 21:1 and white on white is 1:1. If this formula were
    // wrong every number below would be wrong in the same direction and look
    // perfectly plausible.
    const white: Rgba = { r: 255, g: 255, b: 255, a: 1 };
    const black: Rgba = { r: 0, g: 0, b: 0, a: 1 };
    expect(contrast(black, white)).toBeCloseTo(21, 1);
    expect(contrast(white, white)).toBeCloseTo(1, 6);
    // And a published mid-point: #767676 on white is the canonical 4.54:1.
    expect(contrast({ r: 0x76, g: 0x76, b: 0x76, a: 1 }, white)).toBeGreaterThan(4.5);
    expect(contrast({ r: 0x76, g: 0x76, b: 0x76, a: 1 }, white)).toBeLessThan(4.6);
  });
});

describe('over the brightest sky the overlay will ever see', () => {
  it('ink-100 clears AA everywhere text can sit', () => {
    let worst = Infinity;
    let worstAt = 0;
    for (let p = 0; p <= TEXT_BAND_TOP; p += 0.01) {
      const ratio = inkContrast(token('ink-100'), p);
      if (ratio < worst) {
        worst = ratio;
        worstAt = p;
      }
    }
    expect(worst, `worst ${worst.toFixed(2)}:1 at ${(worstAt * 100).toFixed(0)}% up`).toBeGreaterThanOrEqual(4.5);
  });

  it('ink-70 clears AA for body text everywhere it can sit', () => {
    // The important one: labels, units and the engineering strip are all
    // ink-70, and they are small.
    let worst = Infinity;
    let worstAt = 0;
    for (let p = 0; p <= TEXT_BAND_TOP; p += 0.01) {
      const ratio = inkContrast(token('ink-70'), p);
      if (ratio < worst) {
        worst = ratio;
        worstAt = p;
      }
    }
    expect(worst, `worst ${worst.toFixed(2)}:1 at ${(worstAt * 100).toFixed(0)}% up`).toBeGreaterThanOrEqual(4.5);
  });

  it('ink-45 clears the large-text threshold, which is all it is used for', () => {
    // ink-45 carries the full-scale marks and inactive timeline labels — never
    // running prose. AA's 3:1 applies to text at 18.66px bold or 24px regular
    // and to non-text indicators, which is what these are.
    let worst = Infinity;
    for (let p = 0; p <= TEXT_BAND_TOP; p += 0.01) {
      worst = Math.min(worst, inkContrast(token('ink-45'), p));
    }
    expect(worst, `worst ${worst.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });

  it('the check is not vacuous — it fails above the band', () => {
    /*
      A contrast test that passes everywhere is measuring nothing. Near the top
      of the scrim the gradient has faded out and white-on-pale-blue genuinely
      fails, which is why TEXT_BAND_TOP exists and why an e2e checks the layout
      respects it. If this assertion ever stops holding, the scrim has become
      opaque everywhere and the band is no longer doing any work.
    */
    expect(inkContrast(token('ink-70'), 1)).toBeLessThan(4.5);
  });
});

describe('the phone scrim carries the same budget over a taller block', () => {
  it('ink-70 clears AA all the way up the phone text band', () => {
    let worst = Infinity;
    let worstAt = 0;
    for (let p = 0; p <= PHONE_BAND_TOP; p += 0.01) {
      const ratio = inkContrast(token('ink-70'), p, SCRIM_PHONE);
      if (ratio < worst) {
        worst = ratio;
        worstAt = p;
      }
    }
    expect(
      worst,
      `worst ${worst.toFixed(2)}:1 at ${(worstAt * 100).toFixed(0)}% up`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('ink-45 clears the large-text threshold there too', () => {
    let worst = Infinity;
    for (let p = 0; p <= PHONE_BAND_TOP; p += 0.01) {
      worst = Math.min(worst, inkContrast(token('ink-45'), p, SCRIM_PHONE));
    }
    expect(worst, `worst ${worst.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });

  it('is deeper than the desktop scrim where it has to be', () => {
    // The whole reason it is a separate token. If these ever converge, one of
    // the two layouts has stopped being checked at the height its text sits at.
    expect(scrimAt(0.85, SCRIM_PHONE).a).toBeGreaterThan(scrimAt(0.85).a);
  });
});

describe('the meaning colours are legible too', () => {
  it('caution and alarm clear AA at the bottom of the scrim, where they appear', () => {
    // Both are used on the engineering strip, which sits low on the scrim.
    for (const name of ['caution', 'alarm']) {
      const match = new RegExp(`--${name}:\\s*#([0-9a-f]{6})`, 'i').exec(THEME);
      expect(match, `--${name} should be a hex literal`).not.toBeNull();
      const hex = parseInt(match![1]!, 16);
      const colour: Rgba = {
        r: (hex >> 16) & 0xff,
        g: (hex >> 8) & 0xff,
        b: hex & 0xff,
        a: 1,
      };
      const background = composite(scrimAt(0.15), BRIGHTEST_SKY);
      const ratio = contrast(colour, background);
      expect(ratio, `--${name} ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the upper scrim carries the clock', () => {
  /**
   * `--scrim-top` runs the other way — `to bottom`, so 0% is the top edge.
   * Re-parsed rather than reusing the machinery above, because getting the
   * direction wrong would silently certify the wrong end of the gradient.
   */
  const stops: Stop[] = (() => {
    const block = /--scrim-top:\s*linear-gradient\(([\s\S]*?)\);/.exec(THEME);
    if (!block) throw new Error('missing --scrim-top');
    expect(block[1]!, 'the top scrim must fall from the top edge').toContain('to bottom');
    const found: Stop[] = [];
    for (const match of block[1]!.matchAll(/(rgb\([^)]*\)|transparent)\s+([\d.]+)%/g)) {
      found.push({ color: parseColor(match[1]!), position: Number(match[2]) / 100 });
    }
    return found;
  })();

  /** Depth at a distance BELOW the top edge, 0 at the edge itself. */
  const depthAt = (position: number): number => {
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1]!;
      const b = stops[i]!;
      if (position > b.position) continue;
      const span = b.position - a.position;
      const t = span === 0 ? 0 : (position - a.position) / span;
      return a.color.a + (b.color.a - a.color.a) * t;
    }
    return stops[stops.length - 1]!.color.a;
  };

  it('the clock and the scenario name clear AA where they sit', () => {
    // Both live in the top ~55% of that gradient: the clock is ink-100, the
    // scenario name ink-70, and the name is the one that can fail.
    let worst = Infinity;
    for (let p = 0; p <= 0.55; p += 0.01) {
      const background = composite(
        { r: 6, g: 8, b: 12, a: depthAt(p) },
        BRIGHTEST_SKY,
      );
      const rendered = composite(token('ink-70'), background);
      worst = Math.min(worst, contrast(rendered, background));
    }
    expect(worst, `worst ${worst.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});
