/**
 * M5.2, extended in M6.8: capture the README images.
 *
 * Kept as Playwright specs rather than a one-off script so the images are
 * reproducible: the same scenario, the same moment in the flight, the same
 * viewport, every time. A screenshot taken by hand ages badly and nobody can
 * tell when it stopped matching the thing it shows.
 *
 * TWO IMAGES SINCE M6.6, because there are now two layouts and one of them
 * would otherwise never be looked at. The phone shot is not a narrower copy of
 * the desktop one — the dials are digits and ticks, the timeline is a line of
 * text, and the controls are a tab bar — so a README carrying only the desktop
 * view would be advertising half the work.
 *
 * Tagged @screenshot and skipped in normal runs, because they write files into
 * the repository and a test run should not. Capture with:
 *   CAPTURE_SCREENSHOT=1 npx playwright test --grep @screenshot
 */
import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { byTestId, readoutValueTestId } from '../../src/ui/testids';

/**
 * The intro demo on final approach.
 *
 * The obvious choice — a preset at altitude — puts the ship above the frame,
 * because the camera is semi-sticky and stays with the pad until the vehicle
 * has left it. Waiting for the descent to pass 90 m puts it in the middle of
 * the shot with an engine lit and StarBase behind.
 */
async function onFinalApproach(page: import('@playwright/test').Page) {
  const altitude = page.locator(byTestId(readoutValueTestId('altitude')));
  await expect
    .poll(async () => (await altitude.textContent()) !== '', { timeout: 20_000 })
    .toBe(true);
  await expect
    .poll(async () => Number(await altitude.textContent()), {
      timeout: 40_000,
      intervals: [200],
    })
    .toBeLessThan(90);
}

test('capture desktop @screenshot', async ({ page }) => {
  test.skip(!process.env['CAPTURE_SCREENSHOT'], 'set CAPTURE_SCREENSHOT=1 to write the image');

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/', { waitUntil: 'load' });
  await onFinalApproach(page);

  await page.screenshot({
    path: fileURLToPath(new URL('../../../docs/screenshot.png', import.meta.url)),
  });
});

test('capture phone @screenshot @mobile @mobile-only @portrait-only', async ({ page }) => {
  test.skip(!process.env['CAPTURE_SCREENSHOT'], 'set CAPTURE_SCREENSHOT=1 to write the image');

  await page.goto('/', { waitUntil: 'load' });
  await onFinalApproach(page);

  await page.screenshot({
    path: fileURLToPath(new URL('../../../docs/screenshot-phone.png', import.meta.url)),
  });
});
