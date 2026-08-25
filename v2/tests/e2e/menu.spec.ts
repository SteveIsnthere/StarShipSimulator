/**
 * M4.4: the menu in a browser.
 */
import { expect, test } from '@playwright/test';

async function openMenu(page: import('@playwright/test').Page) {
  await expect
    .poll(async () => (await page.locator('[data-testid="readout-altitude-value"]').textContent()) !== '', {
      timeout: 10_000,
    })
    .toBe(true);
  await page.locator('[data-testid="open-menu"]').click();
  await expect(page.locator('[data-testid="menu"]')).toBeVisible();
}

test('the menu opens, offers every preset, and closes', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  for (const id of [
    'booster-sep',
    'rtls',
    'reentry',
    'before-flip',
    'landing-burn',
    'circularize',
    'deorbit',
  ]) {
    await expect(page.locator(`[data-testid="preset-${id}"]`), id).toBeVisible();
  }

  await page.locator('[data-testid="menu-close"]').click();
  await expect(page.locator('[data-testid="menu"]')).toHaveCount(0);
});

test('a preset fills the form without flying it', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  await page.locator('[data-testid="preset-booster-sep"]').click();
  await expect(page.locator('[data-testid="field-altitude"]')).toHaveValue('70000');
  await expect(page.locator('[data-testid="field-speedX"]')).toHaveValue('1130');

  // tools.js:230 — the button fills the form. Nothing has flown yet. The intro
  // is still descending, so the altitude is not frozen; what matters is that it
  // is still the intro's couple of hundred metres and not the preset's 70 km.
  await page.waitForTimeout(500);
  await expect(page.locator('[data-testid="readout-altitude-unit"]')).toHaveText('M');

  await page.locator('[data-testid="menu-clear"]').click();
  await expect(page.locator('[data-testid="field-altitude"]')).toHaveValue('');
});

test('Configure starts the new flight and closes the menu', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  await page.locator('[data-testid="preset-booster-sep"]').click();
  await page.locator('[data-testid="menu-configure"]').click();

  await expect(page.locator('[data-testid="menu"]')).toHaveCount(0);

  // 70 km, so the altitude readout switches to kilometres.
  const altitude = page.locator('[data-testid="readout-altitude"]');
  await expect(altitude.locator('.unit')).toHaveText('KM', { timeout: 5_000 });
  await expect
    .poll(async () => Number(await altitude.locator('.value').textContent()), { timeout: 5_000 })
    .toBeGreaterThan(65);

  // And the tanks are the preset's 500 t, not what the intro left behind.
  await expect
    .poll(async () => Number(await page.locator('[data-testid="readout-propellant-value"]').textContent()))
    .toBe(500);
});

test('typing in the editor does not fire the engines', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  // eventListener.js:3 — `if (!showedMenuView)`. Every one of these characters
  // is bound to something in flight: r is RCS, f is fins, 1-3 are Raptors.
  //
  // The engines are lit during the intro, so "is it off" is the wrong question.
  // The right one is whether typing moved anything, and the fins and RCS are the
  // clean signals: the intro touches neither.
  const ids = ['rcs', 'fins', 'raptor-0', 'raptor-1', 'raptor-2'];
  const lit = async () =>
    Promise.all(
      ids.map(async (id) =>
        ((await page.locator(`[data-testid="${id}"]`).getAttribute('class')) ?? '').includes(
          'is-on',
        ),
      ),
    );

  const before = await lit();
  await page.locator('[data-testid="field-altitude"]').fill('31337');
  await page.keyboard.type('rf123');
  await page.waitForTimeout(400);

  expect(await lit()).toEqual(before);

  // And the keystrokes went where they were aimed: the field still has focus,
  // so the digits land in it and the letters are dropped by the number input.
  await expect(page.locator('[data-testid="field-altitude"]')).toHaveValue('31337123');
});

test('time warp changes how fast the flight runs', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  const rate = page.locator('[data-testid="menu-time-rate"]');
  await expect(rate).toHaveAttribute('min', '1');
  await expect(rate).toHaveAttribute('max', '9');

  await rate.fill('8');
  await expect(page.locator('[data-menu-readout="timeRate"]')).toHaveText('8x');

  await page.locator('[data-testid="menu-time-direction"]').click();
  await expect(page.locator('[data-menu-readout="timeRate"]')).toHaveText('1/8x');
});

test('the random-failure toggle lights and persists into a new flight', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  const toggle = page.locator('[data-testid="menu-random-failure"]');
  await expect(toggle).not.toHaveClass(/is-on/);
  await toggle.click();
  await expect(toggle).toHaveClass(/is-on/);

  await page.locator('[data-testid="preset-landing-burn"]').click();
  await page.locator('[data-testid="menu-configure"]').click();
  await page.locator('[data-testid="open-menu"]').click();

  // A configured flight is a fresh state; the setting must survive it.
  await expect(page.locator('[data-testid="menu-random-failure"]')).toHaveClass(/is-on/);
});
