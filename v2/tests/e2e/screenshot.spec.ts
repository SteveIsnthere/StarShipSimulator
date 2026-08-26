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

/* ── M7.4: the distant earth, at three altitudes ───────────────────────── */

/**
 * Fly to an altitude and hold still there.
 *
 * The point of these three is the DEPTH LAYER, so the shot has to be taken
 * where that layer is the whole story: above the true-scale ground, which
 * before M7.4 meant above a blank sky. The vehicle is placed by the editor
 * rather than flown there, because flying a booster to 100 km takes two minutes
 * of wall clock per image and lands it somewhere slightly different each run.
 */
async function atAltitude(page: import('@playwright/test').Page, metres: number) {
  const altitude = page.locator(byTestId(readoutValueTestId('altitude')));
  await expect
    .poll(async () => (await altitude.textContent()) !== '', { timeout: 20_000 })
    .toBe(true);

  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('preset-booster-sep')).click();
  await page.locator(byTestId('field-altitude')).fill(String(metres));
  await page.locator(byTestId('field-speedX')).fill('120');
  await page.locator(byTestId('field-speedY')).fill('0');
  await page.locator(byTestId('menu-configure')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();

  // Let the camera settle into the new field of view before the shutter.
  await page.waitForTimeout(2_500);
}

for (const [label, metres] of [
  ['1km', 1_000],
  ['20km', 20_000],
  ['100km', 100_000],
] as const) {
  test(`capture the distant earth at ${label} @screenshot`, async ({ page }) => {
    test.skip(!process.env['CAPTURE_SCREENSHOT'], 'set CAPTURE_SCREENSHOT=1 to write the image');

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'load' });
    await atAltitude(page, metres);

    await page.screenshot({
      path: fileURLToPath(new URL(`../../../docs/depth-${label}.png`, import.meta.url)),
    });
  });
}

/* ── M9.9: the shot this application could not take until M9.2 ─────────── */

/**
 * A re-entry, WITH THE VEHICLE IN IT.
 *
 * Before M9.2 this image was impossible. The `reentry` preset put the ship
 * 1734 px off the left edge of a 1280 px frame within four seconds of loading
 * and left it there for the rest of the flight, because the view was driven by
 * wall time while the simulation was driven by its own — so every screenshot of
 * a re-entry that anyone could have taken was a screenshot of an empty sky.
 * That is why it is worth a picture of its own rather than a line in a log.
 *
 * Held in slow motion for the shutter, for the same reason the shake spec is:
 * at 7 km/s the vehicle crosses a frame in a fifth of a second, and a capture
 * timed by wall clock would land somewhere different every run.
 */
test('capture a re-entry @screenshot', async ({ page }) => {
  test.skip(!process.env['CAPTURE_SCREENSHOT'], 'set CAPTURE_SCREENSHOT=1 to write the image');

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/', { waitUntil: 'load' });
  const altitude = page.locator(byTestId(readoutValueTestId('altitude')));
  await expect
    .poll(async () => (await altitude.textContent()) !== '', { timeout: 20_000 })
    .toBe(true);

  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('preset-reentry')).click();
  await page.locator(byTestId('menu-configure')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();

  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('menu-time-direction')).click();
  await page.locator(byTestId('menu-time-rate')).fill('4');
  await page.locator(byTestId('menu-close')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();

  // Long enough for the plasma trail to build behind it.
  await page.waitForTimeout(6_000);

  await page.screenshot({
    path: fileURLToPath(new URL('../../../docs/reentry.png', import.meta.url)),
  });
});
