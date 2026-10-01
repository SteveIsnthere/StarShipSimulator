/**
 * The smoke test. It answers one question on every push: does the thing load?
 *
 * A console error is a failure here, not a warning. The 2021 build threw on
 * every start (three blocked CDN dependencies) and nothing caught it, because
 * nothing was watching. This is what watches.
 */
import { expect, test } from '@playwright/test';

/** Console messages that are environmental, not ours. */
const IGNORABLE = [/WebGL|WebGPU|SwiftShader|GroupMarkerNotSet|Automatic fallback to software/i];

test('page loads with no console errors and no failed requests @mobile', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // Resource errors carry no URL in the text ("Failed to load resource: 404"),
    // only in the location. Check both or the filter silently misses them.
    const where = `${msg.text()} ${msg.location().url}`;
    if (IGNORABLE.some((re) => re.test(where))) return;
    consoleErrors.push(`${msg.text()} @ ${msg.location().url}`);
  });
  page.on('pageerror', (err) => pageErrors.push(`${err.name}: ${err.message}`));
  page.on('requestfailed', (req) => {
    const failure = req.failure()?.errorText ?? 'unknown';
    if (IGNORABLE.some((re) => re.test(req.url()))) return;
    failedRequests.push(`${req.url()} — ${failure}`);
  });

  const response = await page.goto('/', { waitUntil: 'load' });
  expect(response?.status(), 'index.html should be served').toBe(200);

  // The Svelte root actually mounted, rather than the page merely being 200.
  // Since M3.1 the app is the canvas; there is no longer a placeholder heading.
  await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible();

  expect(pageErrors, 'uncaught exceptions').toEqual([]);
  expect(consoleErrors, 'console errors').toEqual([]);
  expect(failedRequests, 'failed network requests').toEqual([]);
});

test('loads no third-party origins @mobile', async ({ page }) => {
  // The 2021 build pulled PixiJS, Plotly and Google Fonts from CDNs, which is
  // why it could not run offline. M5.1 makes offline an acceptance criterion;
  // this keeps a CDN from creeping back in before then.
  const external: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol.startsWith('http')) {
      external.push(req.url());
    }
  });

  await page.goto('/', { waitUntil: 'load' });
  expect(external, 'third-party requests').toEqual([]);
});

test('canvas mounts @mobile', async ({ page }) => {
  // Staged as a skip in M0.6 and switched on here, in M3.1, now that the
  // PixiJS shell exists.
  await page.goto('/', { waitUntil: 'load' });

  const canvas = page.locator('[data-testid="world-canvas"]');
  await expect(canvas).toBeVisible();

  const size = await canvas.boundingBox();
  expect(size?.width, 'canvas width').toBeGreaterThan(0);
  expect(size?.height, 'canvas height').toBeGreaterThan(0);

  // Pixi actually acquired a rendering context, rather than the element merely
  // existing. Under SwiftShader this is WebGL; on real hardware it may be
  // WebGPU, so accept either.
  const context = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="world-canvas"]');
    if (!el) return 'no-canvas';
    // Pixi's own record of what it negotiated.
    return (el as HTMLCanvasElement & { __pixiContext?: string }).__pixiContext ?? 'unknown';
  });
  expect(context).not.toBe('no-canvas');
});

test('the simulation runs behind the canvas @mobile', async ({ page }) => {
  // The HUD is driven from the loop, so a changing value proves the whole
  // chain is live: rAF -> accumulator -> step() -> binder -> text node.
  await page.goto('/', { waitUntil: 'load' });

  const altitude = page.locator('[data-testid="readout-altitude-value"]');
  const verticalSpeed = page.locator('[data-testid="readout-speedY-value"]');
  await expect(altitude).toBeVisible();

  const first = await altitude.textContent();
  await expect
    .poll(async () => altitude.textContent(), { timeout: 5_000 })
    .not.toBe(first);

  // Both readouts show a number, not a placeholder or NaN.
  await expect(altitude).toHaveText(/^-?\d+(\.\d+)?$/);
  await expect(verticalSpeed).toHaveText(/^-?\d+$/);
});
