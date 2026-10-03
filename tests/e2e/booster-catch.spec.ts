/** Original scenario flights use real selected-model fixed steps, without overrides. */
import { expect, test } from '@playwright/test';
import type { SimDebug } from '../../src/app/debug';
import { byTestId } from '../../src/ui/testids';
import { ready, tap } from './helpers';

for (const id of ['booster-sep', 'rtls']) {
  test(`${id} actually returns to an airborne tower catch @mobile`, async ({ page }, info) => {
    await page.goto('/?debug=1'); await ready(page);
    await page.evaluate(id => {
      const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
      debug.pause(); debug.setScenario(id);
    }, id);
    await tap(page, 'auto-land');
    // Existing900s flight bound; every step follows the canonical controller.
    // No synthetic terminal state or success retry.
    const result = await page.evaluate(() => {
      const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
      let ticks = 0;
      for (; ticks < 108000; ticks++) {
        debug.step(1);
        const values = debug.telemetry();
        if (values['status.landed'] || values['failures.crashed'] || values['failures.inFlightBreakUp']) break;
      }
      return { ticks: ticks + 1, values: debug.telemetry() };
    });
    expect(result.ticks).toBeLessThan(108000);
    expect(result.values['status.landed']).toBe(true);
    expect(result.values['status.onTheGround']).toBe(false);
    expect(result.values['failures.crashed']).toBe(false);
    expect(result.values['failures.inFlightBreakUp']).toBe(false);
    expect(result.values['vehicle.propellantMass']).toBeGreaterThan(0);
    await expect(page.locator(byTestId('debrief'))).toHaveAttribute('data-outcome', 'CAUGHT');
    await expect(page.locator(byTestId('debrief-outcome'))).toHaveText('Caught');
    await expect(page.locator(byTestId('debrief-vertical'))).toHaveCount(0);
    await expect(page.locator(byTestId('debrief-propellant'))).toContainText('3400 t');
    await expect(page.locator(byTestId('event-now'))).toHaveText('CAUGHT');
    await page.screenshot({ path: info.outputPath(`${id}-caught.png`) });
    await info.attach('real-catch-telemetry', { body: JSON.stringify(result), contentType: 'application/json' });
    await page.locator(byTestId('debrief-restart')).click();
    const restarted = await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry());
    expect(restarted['status.landed']).toBe(false);
    expect(restarted['engines.running[32]']).toBe(false);
    expect(restarted['vehicle.propellantMass']).toBe(id === 'booster-sep' ? 500000 : 200000);
    await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  });
}

test('a lug beyond the catch box cannot announce a caught booster @mobile', async ({ page }) => {
  await page.goto('/?debug=1'); await ready(page);
  const values = await page.evaluate(() => {
    const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
    debug.pause();
    debug.setScenario('rtls', { altitude: 90.501, xPosition: 3, speedX: 0, speedY: -1, pitch: 0 });
    debug.step(1);
    return debug.telemetry();
  });
  expect(values['status.landed']).toBe(false);
  await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  await expect(page.locator(byTestId('event-now'))).not.toHaveText('CAUGHT');
});
