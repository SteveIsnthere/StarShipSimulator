/**
 * M5.2: capture the README screenshot.
 *
 * Kept as a Playwright spec rather than a one-off script so the image is
 * reproducible: the same scenario, the same moment in the flight, the same
 * viewport, every time. A screenshot taken by hand ages badly and nobody can
 * tell when it stopped matching the thing it shows.
 *
 * Tagged @screenshot and skipped in normal runs — it writes a file into the
 * repository, which a test run should not do. Capture with:
 *   npx playwright test --grep @screenshot
 */
import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test('capture @screenshot', async ({ page }) => {
  test.skip(!process.env['CAPTURE_SCREENSHOT'], 'set CAPTURE_SCREENSHOT=1 to write the image');

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/', { waitUntil: 'load' });

  await expect
    .poll(async () => (await page.locator('[data-readout="altitude"] .value').textContent()) !== '', {
      timeout: 15_000,
    })
    .toBe(true);

  // The intro demo, caught on final approach: the vehicle is inside the render
  // box and the camera has settled on it. The obvious choice — a preset at
  // altitude — puts the ship above the frame, because the camera is
  // semi-sticky and stays with the pad until the vehicle has left it.
  await expect
    .poll(async () => Number(await page.locator('[data-readout="altitude"] .value').textContent()), {
      timeout: 30_000,
      intervals: [200],
    })
    .toBeLessThan(90);

  await page.screenshot({
    path: fileURLToPath(new URL('../../../docs/screenshot.png', import.meta.url)),
  });
});
