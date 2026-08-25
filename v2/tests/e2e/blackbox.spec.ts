/**
 * M4.5: the black box, and the 3.5 MB that is no longer on the critical path.
 *
 * 2021 loaded Plotly from a CDN on every page load — for nine charts almost
 * nobody opened, blocking the first frame of a game, and making the whole thing
 * unusable offline. The first test here is that wound, stated as a measurement:
 * no chart code is fetched until the black box is opened.
 */
import { expect, test } from '@playwright/test';

async function ready(page: import('@playwright/test').Page) {
  await expect
    .poll(async () => (await page.locator('[data-testid="readout-altitude-value"]').textContent()) !== '', {
      timeout: 10_000,
    })
    .toBe(true);
}

test('no chart code is loaded until the black box is opened', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    const url = res.url();
    if (/\.(js|css)(\?|$)/.test(url)) scripts.push(url);
  });

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  // Long enough for the recorder to hold something: the view refuses to load a
  // chart library to draw an empty recording, which is correct behaviour and
  // would make this measurement vacuous.
  await page.waitForTimeout(1_500);
  await page.waitForLoadState('networkidle');

  expect(
    scripts.filter((u) => /uplot/i.test(u)),
    'uPlot must not be in the first load',
  ).toEqual([]);
  // And nothing at all from a third party, which is what M5.1 depends on.
  expect(scripts.filter((u) => !u.startsWith('http://127.0.0.1'))).toEqual([]);

  const beforeCount = scripts.length;
  await page.locator('[data-testid="open-black-box"]').click();

  // Wait for a drawn plot, not for the dialog: the dialog renders immediately
  // and the import resolves later, so asserting on visibility alone reads the
  // request list before the fetch has started.
  await expect(page.locator('[data-plot]').first()).toBeVisible({ timeout: 15_000 });

  // Opening it fetches the chunk, from our own origin.
  expect(scripts.length).toBeGreaterThan(beforeCount);
  expect(scripts.filter((u) => /uplot/i.test(u)).length).toBeGreaterThan(0);
  expect(scripts.filter((u) => !u.startsWith('http://127.0.0.1'))).toEqual([]);
});

test('it draws the nine plots of the flight', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Give the intro a moment to record something worth plotting.
  await page.waitForTimeout(2_000);
  await page.locator('[data-testid="open-black-box"]').click();

  const plots = page.locator('[data-plot]');
  await expect(plots).toHaveCount(9, { timeout: 15_000 });

  for (const id of [
    'flyPath',
    'motionSpeed',
    'propellant',
    'acceleration',
    'motionAngle',
    'controlInput',
    'thermal',
    'aerodynamicForce',
    'altitude',
  ]) {
    await expect(page.locator(`[data-plot="${id}"]`), id).toBeVisible();
  }

  // Each plot really rendered, rather than leaving an empty div.
  const canvases = await page.locator('[data-plot] canvas').count();
  expect(canvases).toBeGreaterThanOrEqual(9);
});

test('it closes, and the keyboard is suppressed while it is open', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await page.waitForTimeout(1_000);

  const fins = page.locator('[data-testid="fins"]');
  const before = ((await fins.getAttribute('class')) ?? '').includes('is-on');

  await page.locator('[data-testid="open-black-box"]').click();
  await expect(page.locator('[data-testid="black-box"]')).toBeVisible();

  await page.keyboard.press('f');
  await page.waitForTimeout(300);
  expect(((await fins.getAttribute('class')) ?? '').includes('is-on')).toBe(before);

  await page.locator('[data-testid="black-box-close"]').click();
  await expect(page.locator('[data-testid="black-box"]')).toHaveCount(0);

  // And it works again once closed.
  await page.keyboard.press('f');
  await expect(fins).toHaveClass(before ? /control/ : /is-on/);
});
