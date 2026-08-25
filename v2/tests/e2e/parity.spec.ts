/**
 * M4.6: the parity sweep, as tests.
 *
 * docs/PARITY.md is the checklist; this is the half of it a machine can keep
 * honest. Every 2021 `onclick` handler in index.html was enumerated and each
 * one either has a control here or an entry in the document saying why not.
 */
import { expect, test } from '@playwright/test';

async function ready(page: import('@playwright/test').Page) {
  await expect
    .poll(async () => (await page.locator('[data-readout="altitude"] .value').textContent()) !== '', {
      timeout: 10_000,
    })
    .toBe(true);
}

test('every 2021 flight control is present', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // switches.js — the flight controls.
  for (const id of [
    'raptor0',
    'raptor1',
    'raptor2',
    'allRaptors',
    'autoMaxThrust',
    'autoTakeOff',
    'boostBack',
    'pitchHold',
    'autoLand',
    'fins',
    'rcs',
    'dumpFuel',
  ]) {
    await expect(page.locator(`[data-indicator="${id}"]`), id).toBeAttached();
  }

  // The two sliders and the zoom pair.
  await expect(page.locator('[data-control="throttle"]')).toBeAttached();
  await expect(page.locator('[data-control="pitch"]')).toBeAttached();
  await expect(page.getByLabel('Zoom in')).toBeAttached();
  await expect(page.getByLabel('Zoom out')).toBeAttached();
});

test('the panels and the HUD collapse, as they did in 2021', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // dispUpdate.js:156 — show_controlsL / show_controlsR.
  const throttle = page.locator('[data-control="throttle"]');
  await expect(throttle).toBeVisible();
  await page.locator('[data-control="toggleLeft"]').click();
  await expect(throttle).toBeHidden();
  await page.locator('[data-control="toggleLeft"]').click();
  await expect(throttle).toBeVisible();

  const pitch = page.locator('[data-control="pitch"]');
  await page.locator('[data-control="toggleRight"]').click();
  await expect(pitch).toBeHidden();
  await page.locator('[data-control="toggleRight"]').click();
  await expect(pitch).toBeVisible();

  // dispUpdate.js:193 — show_hideFlightParamDispMid. Altitude and speed stay.
  const twr = page.locator('[data-readout="twr"]');
  await expect(twr).toBeVisible();
  await page.locator('[data-hud-control="expand"]').click();
  await expect(twr).toBeHidden();
  await expect(page.locator('[data-readout="altitude"]')).toBeVisible();
  await expect(page.locator('[data-readout="speed"]')).toBeVisible();
});

test('collapsing a panel does not stop the binder writing to it', async ({ page }) => {
  // The panels are hidden, not unmounted, because the indicator binder resolved
  // their nodes once and holds the references. This proves the state kept up.
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const raptor = page.locator('[data-indicator="raptor0"]');
  // The intro flies with all three lit, so the press is a shutdown as often as
  // an ignition. What matters is that the hidden node tracked the change.
  const before = ((await raptor.getAttribute('class')) ?? '').includes('is-on');

  await page.locator('[data-control="toggleLeft"]').click();
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  await page.locator('[data-control="toggleLeft"]').click();

  const after = ((await raptor.getAttribute('class')) ?? '').includes('is-on');
  expect(after).toBe(!before);
});

test('the restart button appears when the flight ends and starts it again', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Fly a landing-burn preset into the ground: cut the engines and wait.
  await page.locator('[data-menu-control="open"]').click();
  await page.locator('[data-preset="landing-burn"]').click();
  await page.locator('[data-menu-control="configure"]').click();

  const restart = page.locator('[data-control="restart"]');
  await expect(restart).toBeVisible({ timeout: 30_000 });

  await restart.click();
  await expect(restart).toHaveCount(0);

  // Back at the preset's 200 m and 20 t.
  await expect
    .poll(async () => Number(await page.locator('[data-readout="propellant"] .value').textContent()), {
      timeout: 5_000,
    })
    .toBe(20);
});

test('the guide and the about screen open from the menu', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator('[data-menu-control="open"]').click();
  await page.locator('[data-menu-control="guide"]').click();

  const guide = page.locator('[data-info="guide"]');
  await expect(guide).toBeVisible();
  // The keybinds are generated from the binding table, so they cannot drift.
  await expect(guide).toContainText('Backspace');
  await expect(guide).toContainText('ArrowLeft');
  await expect(guide).toContainText('toggle all Raptors');

  await page.locator('[data-info-control="close"]').click();
  await expect(guide).toHaveCount(0);

  await page.locator('[data-menu-control="about"]').click();
  await expect(page.locator('[data-info="about"]')).toBeVisible();
});

test('the tilt-control switch is present and on by default', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator('[data-menu-control="open"]').click();
  const tilt = page.locator('[data-menu-control="tiltControl"]');

  // eventListener.js:117 — `let tiltControlOn = true`.
  await expect(tilt).toHaveClass(/is-on/);
  await tilt.click();
  await expect(tilt).not.toHaveClass(/is-on/);
});
