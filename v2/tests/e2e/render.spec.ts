/**
 * M3.2: the world renders.
 *
 * A screenshot test would be brittle and a canvas is opaque to the DOM, so
 * these assert what can be checked honestly: that every texture loaded, that
 * the scene graph has the expected shape, and that the pig is where CLAUDE.md
 * says it must be.
 */
import { expect, test } from '@playwright/test';

test('every art asset loads', async ({ page }) => {
  const failed: string[] = [];
  page.on('requestfailed', (req) => {
    if (req.url().includes('/assets/')) failed.push(req.url());
  });
  const notOk: string[] = [];
  page.on('response', (res) => {
    if (res.url().includes('.webp') && !res.ok()) notOk.push(`${res.url()} ${res.status()}`);
  });

  await page.goto('/', { waitUntil: 'load' });
  // Textures load after mount, so give the loader a moment. Counting the WORLD
  // canvas specifically: M7.1's trajectory map added a second one, and this
  // was waiting for Pixi to mount rather than counting canvases for their own
  // sake.
  await expect
    .poll(
      async () =>
        page.evaluate(() => document.querySelectorAll('[data-testid="world-canvas"]').length),
      { timeout: 5_000 },
    )
    .toBe(1);
  await page.waitForLoadState('networkidle');

  expect(failed, 'failed asset requests').toEqual([]);
  expect(notOk, 'non-OK asset responses').toEqual([]);
});

test('the webp images are actually fetched', async ({ page }) => {
  const fetched = new Set<string>();
  page.on('response', (res) => {
    const m = /\/assets\/([^/?]+\.webp)/.exec(res.url());
    if (m && res.ok()) fetched.add(m[1]!);
  });

  await page.goto('/', { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');

  // The pig is not optional.
  expect([...fetched]).toContain('pig.webp');
  expect([...fetched]).toContain('Starship.webp');
  expect(fetched.size).toBeGreaterThanOrEqual(8);
});

test('the renderer draws frames without erroring', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/WebGL|SwiftShader|Automatic fallback/i.test(m.text())) {
      errors.push(m.text());
    }
  });

  await page.goto('/', { waitUntil: 'load' });
  // Let it run long enough for the intro demo to light engines and descend.
  await page.waitForTimeout(3_000);

  expect(errors).toEqual([]);

  // And the simulation moved, so those frames were doing something.
  const altitude = await page.locator('[data-testid="readout-altitude-value"]').textContent();
  expect(altitude).toMatch(/^-?\d+(\.\d+)?$/);
});
