import { expect, test } from '@playwright/test';
import type { SimDebug } from '../../src/app/debug';
import { ready } from './helpers';
import { byTestId } from '../../src/ui/testids';

test('scene resets, pauses and hides continuous gas with its particle detail @mobile', async ({ page }) => {
  await page.goto('/?debug=1');
  await ready(page);
  await page.evaluate(() => {
    const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
    debug.setScenario('landing-burn', { altitude: 120000, xPosition: 30000, speedX: 0, speedY: 0, propellant: 200000 });
    debug.setState({ 'engines.running[0]': true, 'engines.running[1]': true, 'engines.running[2]': true,
      'vehicle.throttleCurrent': 100, 'vehicle.throttle': 100 });
    debug.resume();
  });
  await expect.poll(() => page.evaluate(() => Number((window as unknown as { __simDebug: SimDebug }).__simDebug
    .telemetry()['world.updatedFrameCount']))).toBeGreaterThan(240);
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.pause());
  const painted = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await painted();
  const presentation = () => page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation());
  expect((await presentation()).bell?.visibleMounts).toBe(3);
  const first = await page.locator(byTestId('world-canvas')).screenshot();
  await painted();
  expect(await page.locator(byTestId('world-canvas')).screenshot()).toEqual(first);
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setParticlesVisible(false));
  await painted();
  expect((await presentation()).bell?.visibleMounts).toBe(0);
  const hidden = await page.locator(byTestId('world-canvas')).screenshot();
  expect(hidden.equals(first)).toBe(false);
  await painted();
  expect(await page.locator(byTestId('world-canvas')).screenshot()).toEqual(hidden);
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setParticlesVisible(true));
  await painted();
  expect((await presentation()).bell?.visibleMounts).toBe(3);
  expect(await page.locator(byTestId('world-canvas')).screenshot()).toEqual(first);
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setState({ 'engines.failed[1]': true }));
  await painted();
  expect((await presentation()).bell?.visibleMounts).toBe(2);
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setState({
    'engines.running[0]': false, 'engines.running[2]': false,
  }));
  await painted();
  expect((await presentation()).bell?.visibleMounts).toBe(0);
  await page.evaluate(() => {
    const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
    debug.setScenario('landing-burn', { altitude: 120000, xPosition: 30000, speedX: 0, speedY: 0, propellant: 200000 });
    debug.pause();
  });
  await painted();
  expect((await presentation()).bell?.visibleMounts).toBe(0);
});
