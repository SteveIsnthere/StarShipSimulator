/** Narrow Phase9 bring-forward: actual booster instrument/rail/world zones. */
import { expect, test } from '@playwright/test';
import type { SimDebug } from '../../src/app/debug';
import { SHORT_LANDSCAPE } from '../../src/ui/shell/layout-queries';

// Declared geometry before implementation:44px header +56px instruments +20px
// engine status +16px row gaps +16px vertical padding. No measured-pass fit.
const FOLDED_STRIP_BUDGET = 152;
const RAIL_CLEARANCE = 16;

test('short booster strip leaves a usable world and expanded rails below readable instruments @mobile', async ({ page }, info) => {
  await page.goto('/?debug=1');
  test.skip(!await page.evaluate(q => window.matchMedia(q).matches, SHORT_LANDSCAPE), 'short landscape layout only');
  await page.waitForFunction(() => '__simDebug' in window);
  await page.evaluate(() => {
    const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
    debug.pause(); debug.setScenario('booster-sep');
  });
  const hud = page.getByRole('region', { name: 'Flight data' });
  await expect(hud.getByTestId('hud-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(hud.getByTestId('readout-altitude-value')).not.toHaveText('');
  for (const id of ['altitude', 'speedY', 'speed', 'propellant', 'pitch']) {
    await expect(hud.getByTestId(`readout-${id}`)).toBeVisible();
    await expect(hud.getByTestId(`readout-${id}-value`)).not.toHaveText('');
  }
  for (const label of ['Centre · 3', 'Inner · 10', 'Outer · 20']) await expect(hud.getByText(label, { exact: true })).toBeVisible();
  for (const group of ['centre', 'inner', 'outer']) {
    const status = hud.locator(`[data-engine-group="${group}"]`);
    await expect(status).toBeVisible();
    await expect(status).toContainText('lit');
    await expect(status).toContainText('start');
    await expect(status).toContainText('fail');
  }
  const zone = await hud.boundingBox();
  expect(zone!.height, 'folded strip height follows the declared instrument geometry budget').toBeLessThanOrEqual(FOLDED_STRIP_BUDGET);
  const world = await page.getByTestId('world-canvas').boundingBox();
  expect(world!.y, 'world remains below every primary instrument').toBeGreaterThanOrEqual(zone!.y + zone!.height - 1);
  expect(world!.height, 'world gets remaining viewport below the declared strip budget').toBeGreaterThanOrEqual(page.viewportSize()!.height - zone!.y - FOLDED_STRIP_BUDGET - 1);
  for (const [toggle, name] of [['engine-panel-toggle', 'Engines'], ['yoke-panel-toggle', 'Flight']] as const) {
    await page.getByTestId(toggle).click();
    const rail = page.getByRole('region', { name, exact: true });
    const box = await rail.boundingBox();
    expect(box!.y, `${name} rail clears the whole HUD`).toBeGreaterThanOrEqual(zone!.y + zone!.height + RAIL_CLEARANCE - 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    if (name === 'Engines') for (const group of ['centre', 'inner', 'outer']) {
      const button = page.getByTestId(`engine-group-${group}`);
      await button.scrollIntoViewIfNeeded(); await expect(button).toBeVisible();
      const bounds = await button.boundingBox();
      const touch = await page.evaluate(() => window.matchMedia('(any-pointer: coarse), (any-pointer: none)').matches);
      expect(bounds!.height).toBeGreaterThanOrEqual(touch ? 43.5 : 31.5);
    }
    await page.getByTestId(toggle).click();
  }
  await page.screenshot({ path: info.outputPath('short-flight-strip.png') });
});
