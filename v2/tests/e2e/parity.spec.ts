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
    .poll(async () => (await page.locator('[data-testid="readout-altitude-value"]').textContent()) !== '', {
      timeout: 10_000,
    })
    .toBe(true);
}

test('every 2021 flight control is present', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // switches.js — the flight controls.
  for (const id of [
    'raptor-0',
    'raptor-1',
    'raptor-2',
    'all-raptors',
    'auto-max-thrust',
    'auto-take-off',
    'boost-back',
    'pitch-hold',
    'auto-land',
    'fins',
    'rcs',
    'dump-fuel',
  ]) {
    await expect(page.locator(`[data-testid="${id}"]`), id).toBeAttached();
  }

  // The two sliders and the zoom pair.
  await expect(page.locator('[data-testid="throttle"]')).toBeAttached();
  await expect(page.locator('[data-testid="yoke-pitch"]')).toBeAttached();
  await expect(page.locator('[data-testid="zoom-in"]')).toBeAttached();
  await expect(page.locator('[data-testid="zoom-out"]')).toBeAttached();
});

test('the panels and the HUD collapse, as they did in 2021', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // dispUpdate.js:156 — show_controlsL / show_controlsR.
  const throttle = page.locator('[data-testid="throttle"]');
  await expect(throttle).toBeVisible();
  await page.locator('[data-testid="engine-panel-toggle"]').click();
  await expect(throttle).toBeHidden();
  await page.locator('[data-testid="engine-panel-toggle"]').click();
  await expect(throttle).toBeVisible();

  const pitch = page.locator('[data-testid="yoke-pitch"]');
  await page.locator('[data-testid="yoke-panel-toggle"]').click();
  await expect(pitch).toBeHidden();
  await page.locator('[data-testid="yoke-panel-toggle"]').click();
  await expect(pitch).toBeVisible();

  // dispUpdate.js:193 — show_hideFlightParamDispMid. Altitude and speed stay.
  const twr = page.locator('[data-testid="readout-twr"]');
  await expect(twr).toBeVisible();
  await page.locator('[data-testid="hud-toggle"]').click();
  await expect(twr).toBeHidden();
  await expect(page.locator('[data-testid="readout-altitude"]')).toBeVisible();
  await expect(page.locator('[data-testid="readout-speed"]')).toBeVisible();
});

test('collapsing a panel does not stop the binder writing to it', async ({ page }) => {
  // The panels are hidden, not unmounted, because the indicator binder resolved
  // their nodes once and holds the references. This proves the state kept up.
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const raptor = page.locator('[data-testid="raptor-0"]');
  // The intro flies with all three lit, so the press is a shutdown as often as
  // an ignition. What matters is that the hidden node tracked the change.
  const before = ((await raptor.getAttribute('class')) ?? '').includes('is-on');

  await page.locator('[data-testid="engine-panel-toggle"]').click();
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  await page.locator('[data-testid="engine-panel-toggle"]').click();

  const after = ((await raptor.getAttribute('class')) ?? '').includes('is-on');
  expect(after).toBe(!before);
});

test('the restart button appears when the flight ends and starts it again', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Fly a landing-burn preset into the ground: cut the engines and wait.
  await page.locator('[data-testid="open-menu"]').click();
  await page.locator('[data-testid="preset-landing-burn"]').click();
  await page.locator('[data-testid="menu-configure"]').click();

  /*
    THE DEBRIEF COMES FIRST NOW (M12.1). A flight that ends on the ground raises
    the debrief card, which carries "Fly again" and hides this button while it
    is up — they are the same action, centred on the same point, and stacking
    them was the bug M12.1's first browser run found. The capability being
    checked here is unchanged: the flight ends, and there is a way to start it
    again. Both are exercised — the card's, and this one behind it.
  */
  const card = page.locator('[data-testid="debrief"]');
  await expect(card).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator('[data-testid="debrief-restart"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);

  const restart = page.locator('[data-testid="restart"]');
  await expect(restart).toBeVisible({ timeout: 30_000 });

  await restart.click();
  await expect(restart).toHaveCount(0);

  // Back at the preset's 200 m and 20 t.
  await expect
    .poll(async () => Number(await page.locator('[data-testid="readout-propellant-value"]').textContent()), {
      timeout: 5_000,
    })
    .toBe(20);
});

test('the guide and the about screen open from the menu', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator('[data-testid="open-menu"]').click();
  await page.locator('[data-testid="menu-guide"]').click();

  const guide = page.locator('[data-testid="info-view"]');
  await expect(guide).toBeVisible();
  // The keybinds are generated from the binding table, so they cannot drift.
  await expect(guide).toContainText('Backspace');
  await expect(guide).toContainText('ArrowLeft');
  await expect(guide).toContainText('toggle all Raptors');

  await page.locator('[data-testid="info-close"]').click();
  await expect(guide).toHaveCount(0);

  await page.locator('[data-testid="menu-about"]').click();
  await expect(page.locator('[data-testid="info-view"]')).toBeVisible();
});

test('the tilt-control switch is present and on by default', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator('[data-testid="open-menu"]').click();
  const tilt = page.locator('[data-testid="menu-tilt-control"]');

  // eventListener.js:117 — `let tiltControlOn = true`.
  await expect(tilt).toHaveClass(/is-on/);
  await tilt.click();
  await expect(tilt).not.toHaveClass(/is-on/);
});
