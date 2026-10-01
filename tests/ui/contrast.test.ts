/**
 * The in-flight chrome is legible over the brightest thing behind it.
 *
 * THE RISK THIS ANSWERS. Every in-flight surface (status bar, cluster, map
 * card, control rails, hint) is text on one translucent backing, and behind the
 * backing is a daytime sky. Nothing about that is safe by construction: a grey
 * label on a 62 % black over a pale blue is the light-on-light that passes on a
 * dark monitor and fails on a phone at the beach.
 *
 * HOW IT IS CHECKED. Everything is read from the real sources: the text colours
 * from the kit's tokens.css, the backing from the shell's index.css, the sky
 * from `$view/sky`. A change to any of them moves this test rather than
 * quietly invalidating it. The backing is composited over the noon sky and the
 * result run through the WCAG 2.1 contrast formula.
 *
 * The opaque surfaces (menu, black box, debrief, phone sheets) sit on
 * `--color-ui-surface`, which the sky never shows through; they are checked
 * against that instead, and they are the only place the dim grey may appear.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SKY_COLOR } from '$view/sky';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const KIT = read('../../src/ui/kit/tokens.css');
const SHELL = read('../../src/ui/shell/index.css');

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** `#b8b8b8`, or `rgb(0 0 0 / 0.62)`. */
function parseColor(text: string): Rgba {
  const hex = /^\s*#([0-9a-f]{6})\s*$/i.exec(text);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff, a: 1 };
  }
  const rgb = /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)/.exec(text);
  if (!rgb) throw new Error(`unparsed colour: ${text}`);
  const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]) / (rgb[5] === '%' ? 100 : 1);
  return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: alpha };
}

/** One `--name: <colour>;` declaration, straight out of a stylesheet. */
function token(sheet: string, name: string): Rgba {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(sheet);
  if (!match) throw new Error(`missing token --${name}`);
  return parseColor(match[1]!);
}

/** `over` composited on `under`, opaque out. */
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
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The brightest thing that can ever be behind the chrome: the noon sky. */
const BRIGHTEST_SKY: Rgba = { r: SKY_COLOR.r, g: SKY_COLOR.g, b: SKY_COLOR.b, a: 1 };
const BACKING = token(SHELL, 'color-flight-backing');
const ON_BACKING = composite(BACKING, BRIGHTEST_SKY);
const SURFACE = token(KIT, 'color-ui-surface');

const ratioOnBacking = (name: string) => contrast(composite(token(KIT, name), ON_BACKING), ON_BACKING);

describe('the model matches the stylesheets it claims to describe', () => {
  it('reads the backing out of index.css and the text out of the kit', () => {
    expect(BACKING.a).toBeGreaterThan(0.5);
    expect(BACKING.a).toBeLessThan(1);
    expect(token(KIT, 'color-ui-fg')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('computes the reference contrasts the WCAG spec publishes', () => {
    // If the formula were wrong every number below would be wrong in the same
    // direction and look perfectly plausible.
    const white: Rgba = { r: 255, g: 255, b: 255, a: 1 };
    const black: Rgba = { r: 0, g: 0, b: 0, a: 1 };
    expect(contrast(black, white)).toBeCloseTo(21, 1);
    expect(contrast(white, white)).toBeCloseTo(1, 6);
    // #767676 on white is the canonical 4.54:1.
    expect(contrast({ r: 0x76, g: 0x76, b: 0x76, a: 1 }, white)).toBeGreaterThan(4.5);
    expect(contrast({ r: 0x76, g: 0x76, b: 0x76, a: 1 }, white)).toBeLessThan(4.6);
  });
});

describe('on the backing, over the brightest sky the chrome will ever see', () => {
  it('the foreground and the muted grey clear AA for body text', () => {
    // Muted carries the labels and units, and they are small.
    for (const name of ['color-ui-fg', 'color-ui-muted']) {
      const ratio = ratioOnBacking(name);
      expect(ratio, `--${name} ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the meaning colours clear the 3:1 indicator threshold', () => {
    for (const name of ['color-ui-warning', 'color-ui-danger', 'color-ui-success']) {
      const ratio = ratioOnBacking(name);
      expect(ratio, `--${name} ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });

  it('the dim grey does not, which is why it never appears there', () => {
    // Not vacuous: this is the line the next test enforces in the source.
    expect(ratioOnBacking('color-ui-dim')).toBeLessThan(3);
  });

  it('the backing does the work: muted on the bare sky would fail', () => {
    const bare = contrast(composite(token(KIT, 'color-ui-muted'), BRIGHTEST_SKY), BRIGHTEST_SKY);
    expect(bare).toBeLessThan(4.5);
  });
});

describe('on the opaque surfaces', () => {
  it('even the dim grey clears AA', () => {
    const ratio = contrast(token(KIT, 'color-ui-dim'), SURFACE);
    expect(ratio, `--color-ui-dim ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the in-flight surfaces never use the dim grey', () => {
  /** The surfaces drawn on the translucent backing, over the world. */
  const IN_FLIGHT = ['StatusBar', 'Hud', 'TrajectoryCard', 'Controls', 'FirstFlight'];
  const SHELL_DIR = fileURLToPath(new URL('../../src/ui/shell/', import.meta.url));

  it.each(IN_FLIGHT)('%s', (surface) => {
    const dir = join(SHELL_DIR, surface);
    const offenders = readdirSync(dir)
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) => /\btext-ui-dim\b/.test(readFileSync(join(dir, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
