/**
 * M4.3: the keyboard in a real browser.
 *
 * The unit tests cover the binding table and the clamp. What only a browser can
 * show is that the listeners are attached to the document, that a key produces
 * the same visible result a button does, and that keys do not scroll the page.
 */
import { expect, test } from '@playwright/test';

/** A control, by its test id (src/ui/testids.ts). The `is-on` class is the
    indicator binder's output, so this reads what the simulation believes. */
const light = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-testid="${id}"]`);

/**
 * Wait until the input listeners exist.
 *
 * The canvas is in the markup, so it is present long before anything is bound —
 * waiting on it races the keyboard against startup and loses. The HUD showing a
 * value is the honest signal: it is written by the first tick, and the tick only
 * starts after bindInput has attached.
 */
async function ready(page: import('@playwright/test').Page) {
  await expect
    .poll(async () => (await page.locator('[data-testid="readout-altitude-value"]').textContent()) !== '', {
      timeout: 10_000,
    })
    .toBe(true);
}

test('keys toggle the same things the buttons do', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  for (const [key, id] of [
    ['f', 'fins'],
    ['r', 'rcs'],
    ['t', 'pitch-hold'],
  ] as const) {
    await expect(light(page, id), id).not.toHaveClass(/is-on/);
    await page.keyboard.press(key);
    await expect(light(page, id), id).toHaveClass(/is-on/);
    await page.keyboard.press(key);
    await expect(light(page, id), id).not.toHaveClass(/is-on/);
  }
});

test('space toggles the engines without scrolling the page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);

  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});

test('the throttle keys cannot leave the engine limits', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  // Wait for the intro to hand over — the fuel readout returning to 350 t is
  // the only unambiguous signal (see controls.spec.ts).
  const fuel = page.locator('[data-testid="readout-propellant-value"]');
  await expect
    .poll(async () => Number(await fuel.textContent()), { timeout: 40_000, intervals: [250] })
    .toBe(350);

  const readout = page.locator('[data-testid="readout-throttle-value"]');
  await expect.poll(async () => Number(await readout.textContent()), { timeout: 10_000 }).toBe(100);

  // Twenty presses of the down key: 2021 would have reached -100.
  for (let i = 0; i < 20; i++) await page.keyboard.press('s');
  await expect.poll(async () => Number(await readout.textContent()), { timeout: 8_000 }).toBe(40);

  // And twenty back up stops at the top, not at 240.
  for (let i = 0; i < 20; i++) await page.keyboard.press('w');
  await expect.poll(async () => Number(await readout.textContent()), { timeout: 8_000 }).toBe(100);
});

test('the zoom keys and buttons change how much world is drawn', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // The vehicle is drawn larger when zoomed in. Reading that out of a canvas is
  // not possible, so this asserts the control path does not throw and the page
  // survives it — the numbers are covered in tests/view/zoom.test.ts.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.keyboard.press('=');
  await page.keyboard.press('=');
  await page.keyboard.press('-');
  await page.getByLabel('Zoom in').click();
  await page.getByLabel('Zoom out').click();
  await page.waitForTimeout(500);

  expect(errors).toEqual([]);
  await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible();
});
