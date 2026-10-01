/**
 * M6.1: the type, measured where it actually renders.
 *
 * tests/ui/tabular-digits.test.ts proves the FONT we chose has tabular figures,
 * from advance widths pinned in src/ui/shell/fonts/metrics.ts. It cannot prove three things
 * that would each break the readouts just as thoroughly: that the woff2 files
 * ship and load, that the stylesheet asks for the tabular set, and that the
 * pinned numbers still describe the bytes on disk.
 *
 * So this measures `1111` against `0000` on a real canvas, in the real browser,
 * with the real stylesheet applied — the plan's test, done the plan's way.
 */
import { expect, test } from '@playwright/test';
import {
  FAMILY,
  FAMILY_DISPLAY,
  FAMILY_MONO,
  LARGEST_NUMERAL_PX,
} from '../../src/ui/shell/fonts/metrics';

/** Every face index.css declares: family and weight. */
const FACES = [
  { family: FAMILY, weight: 400 },
  { family: FAMILY, weight: 600 },
  { family: FAMILY_DISPLAY, weight: 600 },
  { family: FAMILY_MONO, weight: 500 },
] as const;

/** The faces whose default figures are proportional: the ones `tnum` matters for. */
const PROPORTIONAL = FACES.filter((face) => face.family !== FAMILY_MONO);

async function ready(page: import('@playwright/test').Page) {
  await expect
    .poll(
      async () =>
        (await page.locator('[data-testid="readout-altitude-value"]').textContent()) !== '',
      { timeout: 15_000 },
    )
    .toBe(true);
  await page.evaluate(() => document.fonts.ready);
}

test('every face loads from the app itself, not from a CDN', async ({ page }) => {
  const fontRequests: string[] = [];
  page.on('request', (req) => {
    if (req.resourceType() === 'font') fontRequests.push(req.url());
  });

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Each declared face, by its own FontFace status. Not `document.fonts.check`:
  // that answers true for a family nobody declared, which once let this test
  // pass against fonts that had been deleted.
  const status = await page.evaluate(async (faces) => {
    await Promise.all(faces.map((f) => document.fonts.load(`${f.weight} 16px '${f.family}'`)));
    return faces.map((f) => {
      const declared = [...document.fonts].filter(
        (face) => face.family.replace(/['"]/g, '') === f.family && String(face.weight) === String(f.weight),
      );
      return { face: `${f.family} ${f.weight}`, declared: declared.length, loaded: declared.some((d) => d.status === 'loaded') };
    });
  }, FACES);

  for (const face of status) {
    expect(face.declared, `${face.face} is not declared`).toBeGreaterThan(0);
    expect(face.loaded, `${face.face} did not load`).toBe(true);
  }

  // Self-hosted is not optional: the 2021 build pulled two libraries from CDNs
  // and could not run offline because of it. tests/e2e/smoke.spec.ts holds the
  // whole-page version of this line; here it is specifically about fonts.
  const origin = new URL(page.url()).origin;
  for (const url of fontRequests) {
    expect(url.startsWith(origin), `font fetched off-origin: ${url}`).toBe(true);
  }
});

/**
 * 1111 against 0000, measured where `tabular-nums` actually applies.
 *
 * The plan said "canvas". Canvas cannot answer this question: Chromium's
 * CanvasRenderingContext2D exposes `fontKerning`, `fontStretch`,
 * `fontVariantCaps`, `letterSpacing` and `textRendering` — and no
 * `fontVariantNumeric`. Setting one is not an error, it is simply ignored, so a
 * canvas "tabular" measurement returns the proportional widths and an assertion
 * over it would have been measuring nothing. The first version of this test did
 * exactly that and failed by 33.9px, which is how the gap was found.
 *
 * So the tabular half is measured on real elements, laid out by the real
 * stylesheet — which is a strictly better instrument anyway, since it is the
 * text the pilot actually reads rather than a reconstruction of it.
 *
 * Canvas keeps a job: it is the control. It can only produce the proportional
 * widths, so it establishes that these figures DO differ without `tnum` — which
 * is what stops the DOM assertion from being vacuous.
 */
test('1111 and 0000 measure the same width in the shipped type', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const measured = await page.evaluate(
    ([faces, size]) => {
      const host = document.createElement('div');
      host.style.cssText =
        'position:fixed;left:-9999px;top:0;white-space:pre;letter-spacing:0;line-height:1';
      document.body.appendChild(host);

      const domWidth = (text: string, css: string) => {
        const span = document.createElement('span');
        span.style.cssText = css;
        span.textContent = text;
        host.appendChild(span);
        const width = span.getBoundingClientRect().width;
        span.remove();
        return width;
      };

      const context = document.createElement('canvas').getContext('2d');
      if (!context) throw new Error('no 2d context');
      const canvasWidth = (text: string, font: string) => {
        context.font = font;
        return context.measureText(text).width;
      };

      const out = faces.map((face) => {
        const css = `'${face.family}'`;
        const base = `font-family:${css};font-weight:${face.weight};font-size:${size}px;`;
        const canvasFont = `${face.weight} ${size}px ${css}`;
        return {
          name: `${face.family} ${face.weight}`,
          tabular: {
            ones: domWidth('1111', `${base}font-variant-numeric:tabular-nums;`),
            zeroes: domWidth('0000', `${base}font-variant-numeric:tabular-nums;`),
          },
          proportional: {
            ones: canvasWidth('1111', canvasFont),
            zeroes: canvasWidth('0000', canvasFont),
          },
        };
      });

      host.remove();
      return out;
    },
    [PROPORTIONAL, LARGEST_NUMERAL_PX] as const,
  );

  for (const face of measured) {
    expect(
      Math.abs(face.tabular.ones - face.tabular.zeroes),
      `${face.name}: tabular 1111 vs 0000`,
    ).toBeLessThanOrEqual(1);

    // The control. If this ever stops holding, either the font changed or the
    // measurement is not reaching the font at all — and the assertion above
    // would then be proving nothing.
    expect(
      Math.abs(face.proportional.ones - face.proportional.zeroes),
      `${face.name}: default figures should differ, or the test is vacuous`,
    ).toBeGreaterThan(1);
  }
});

test('the readouts themselves are set in the tabular face', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const style = await page
    .locator('[data-testid="readout-altitude-value"]')
    .evaluate((el) => {
      const computed = getComputedStyle(el);
      return {
        family: computed.fontFamily,
        numeric: computed.fontVariantNumeric,
      };
    });

  // The primary readouts are display numerals (design-system.md §5).
  expect(style.family).toContain(FAMILY_DISPLAY);
  expect(style.numeric).toContain('tabular-nums');
});
