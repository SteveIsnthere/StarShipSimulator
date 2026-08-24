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

test('page loads with no console errors and no failed requests', async ({ page }) => {
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
  await expect(page.getByRole('heading', { name: /starship simulator/i })).toBeVisible();

  expect(pageErrors, 'uncaught exceptions').toEqual([]);
  expect(consoleErrors, 'console errors').toEqual([]);
  expect(failedRequests, 'failed network requests').toEqual([]);
});

test('loads no third-party origins', async ({ page }) => {
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

test('canvas mounts', async ({ page }) => {
  // M0.6's description asks for a canvas check, but the PixiJS shell does not
  // exist until M3.1. Skipping loudly rather than omitting it: this line shows
  // up as skipped on every run, and M3.1 deletes it.
  test.skip(true, 'canvas arrives with the PixiJS shell in M3.1');

  await page.goto('/', { waitUntil: 'load' });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const size = await canvas.boundingBox();
  expect(size?.width).toBeGreaterThan(0);
  expect(size?.height).toBeGreaterThan(0);
});
