/**
 * M6.4: the neumorphic pillow is gone, and stays gone.
 *
 * WHY THIS DESERVES A TEST OF ITS OWN. Of everything that made the 2021 look
 * what it was, one declaration carried more of it than any other:
 *
 *     box-shadow:
 *       3px 3px 7px 0 rgb(0 0 0 / 20%),
 *       -4px -4px 9px 0 rgb(255 255 255 / 55%);
 *
 * A dark shadow down-right and a white highlight up-left — a soft plastic
 * pillow, lit from the top left, on every button in the application. v2 ported
 * it faithfully along with everything else. It is the single clearest marker of
 * the old design, and the kind of thing that comes back one component at a time
 * because it is what everyone reaches for when a button needs to look raised.
 *
 * WHAT IS FORBIDDEN, AND WHAT IS NOT. Not `box-shadow` — a shadow is a tool and
 * the timeline's current-event dot legitimately wears a ring
 * (`0 0 0 3px rgb(255 255 255 / 18%)`), which is a halo rather than a bevel.
 * What is forbidden is the SIGNATURE: an offset white shadow, which is what
 * fakes a light source, plus the exact literals that were in the tree. The
 * second check would catch a copy-paste; the first catches a re-invention.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(svelte|css|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = sourceFiles(SRC);

/** Every `box-shadow: ...;` declaration in the tree, with its file. */
function shadows(): Array<{ file: string; value: string }> {
  const found: Array<{ file: string; value: string }> = [];
  for (const file of FILES) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/box-shadow\s*:\s*([^;]+);/g)) {
      found.push({ file: file.slice(SRC.length), value: match[1]!.replace(/\s+/g, ' ').trim() });
    }
  }
  return found;
}

/**
 * The x and y offsets of a shadow, in px.
 *
 * Fiddlier than it looks, and the first version got it wrong twice. Offsets may
 * be written unitless when zero (`0 0 0 3px …`), so a regex for `\d+px` skips
 * them and mistakes the blur radius for the x offset — which flagged the
 * timeline's legitimate halo as a bevel. And the colour function carries digits
 * of its own (`rgb(0 0 0 / 20%)`), so it has to come off before anything is
 * counted.
 */
function shadowOffsets(value: string): [number, number] {
  const geometry = value
    .replace(/(?:rgba?|hsla?)\([^)]*\)/gi, ' ')
    .replace(/#[0-9a-f]{3,8}/gi, ' ')
    .replace(/\binset\b/gi, ' ');
  const lengths = [...geometry.matchAll(/(-?\d+(?:\.\d+)?)(?:px|rem|em)?/g)]
    .map((m) => Number(m[1]))
    .filter((n) => !Number.isNaN(n));
  return [lengths[0] ?? 0, lengths[1] ?? 0];
}

/** The exact literals the 2021 tree used, in the forms it wrote them. */
const LITERALS = ['3px 3px 7px', '-4px -4px 9px', 'inset 2px 2px 5px'];

/**
 * Source with comments removed.
 *
 * Both greps below are about what the CODE does, not what it says about
 * itself — and the comments in this milestone quote the very declarations they
 * replaced, which is exactly the documentation worth keeping. The first draft
 * of this test flagged three files for explaining why they no longer use
 * `#0d0`.
 */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

describe('the neumorphic shadow is deleted repo-wide', () => {
  it('none of its literal offsets appear anywhere in src/', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const text = code(file);
      for (const literal of LITERALS) {
        if (text.includes(literal)) offenders.push(`${file.slice(SRC.length)}: ${literal}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no shadow fakes a light source with an offset white highlight', () => {
    // The general form. A white shadow at a non-zero offset is a bevel; a white
    // shadow at zero offset is a halo, and the timeline's current-event dot is
    // allowed one.
    const offenders: string[] = [];
    for (const { file, value } of shadows()) {
      if (!/rgb\(255 255 255|#fff|white/i.test(value)) continue;
      const [x, y] = shadowOffsets(value);
      if (x !== 0 || y !== 0) offenders.push(`${file}: ${value}`);
    }
    expect(offenders).toEqual([]);
  });

  it('the check is not vacuous — it rejects the declaration it was written for', () => {
    // A test that greps for an absent string passes forever, including after
    // someone breaks the grep. This proves the matcher still recognises the
    // thing, using the same logic the assertion above runs.
    const bevel = '-4px -4px 9px 0 rgb(255 255 255 / 55%)';
    expect(/rgb\(255 255 255/.test(bevel)).toBe(true);
    expect(shadowOffsets(bevel)).toEqual([-4, -4]);
    expect(LITERALS.some((literal) => bevel.includes(literal))).toBe(true);

    // And the halo it must NOT flag, checked the same way — otherwise the
    // matcher could pass by rejecting every shadow ever written.
    const halo = '0 0 0 3px rgb(255 255 255 / 18%)';
    expect(shadowOffsets(halo)).toEqual([0, 0]);
  });
});

describe('state is not spelled in green', () => {
  it('no lit control paints its text a hue', () => {
    /*
      The other half of the 2021 look, and the one BROADCAST-UI-PLAN § 1
      principle 6 rules out by name: `style.color = '#00ff00'` on every button
      repaint, which v2 ported as a green `.is-on` rule and an
      `accent-color: #0d0` on the sliders. Nothing in this interface says "on"
      by recolouring a word — controls carry a pip that fills.

      Colour that MEANS something is untouched: --caution, --alarm and --good
      are tokens and are what this checks the tree uses instead.
    */
    const greens = /#0d0\b|#0a0\b|#00ff00\b|#0f0\b/i;
    const offenders: string[] = [];
    for (const file of FILES) {
      if (greens.test(code(file))) offenders.push(file.slice(SRC.length));
    }
    expect(offenders).toEqual([]);
  });

  it('the meaning colours are still declared, so the rule above is a rule and not a ban', () => {
    const theme = readFileSync(join(SRC, 'ui/theme.css'), 'utf8');
    expect(theme).toContain('--caution');
    expect(theme).toContain('--alarm');
    expect(theme).toContain('--good');
  });
});
