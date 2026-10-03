/** Canonical scene moments shared by capture and performance witnesses. */
import { expect, type Page } from '@playwright/test';
import { byTestId } from '../../src/ui/testids';
import type { SimDebug } from '../../src/app/debug';
import { isCompactLayout, ready, tap } from './helpers';

export const VISUAL_SCENES = ['launch', 'staging', 'belly-flop', 'entry', 'landing', 'catch'] as const;
export type VisualScene = typeof VISUAL_SCENES[number];

export async function visualScene(page: Page, scene: VisualScene): Promise<void> {
  await page.goto('/?debug=1'); await ready(page);
  const id = { launch: 'launch-pad', staging: 'hot-stage', 'belly-flop': 'before-flip',
    entry: 'reentry', landing: 'landing-burn', catch: 'rtls' }[scene];
  await page.evaluate(id => {
    const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
    debug.pause(); debug.setScenario(id); debug.pause();
  }, id);
  if (scene === 'launch') await tap(page, 'auto-take-off');
  if (scene === 'staging') await tap(page, 'stage');
  if (scene === 'landing' || scene === 'catch') await tap(page, 'auto-land');
  // Capture the unobstructed cockpit: input on compact layouts opens a sheet
  // and changes the actual canvas size. Fold it before canonical stepping so
  // the camera follows the same flight in the intended capture viewport.
  if (await isCompactLayout(page)) {
    for (const [control, toggle] of [['yoke-pitch', 'yoke-panel-toggle'], ['throttle', 'engine-panel-toggle']]) {
      if (await page.locator(byTestId(control!)).isVisible()) await page.locator(byTestId(toggle!)).click();
    }
  }
  await painted(page);
  const result = await page.evaluate(scene => {
    const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
    let steps = scene === 'launch' ? 360 : scene === 'staging' || scene === 'landing' ? 180 : scene === 'entry' ? 120 : 1;
    if (scene === 'catch') {
      // The unchanged900s flight cap, genuine guidance and physical catch.
      for (steps = 0; steps < 108000; steps++) {
        debug.step(1);
        const state = debug.telemetry();
        if (state['status.landed'] || state['failures.crashed'] || state['failures.inFlightBreakUp']) break;
      }
    } else debug.step(steps);
    return { steps, state: debug.telemetry() };
  }, scene);
  expect(result.state['failures.crashed']).toBe(false);
  expect(result.state['failures.inFlightBreakUp']).toBe(false);
  if (scene === 'catch') {
    expect(result.steps).toBeLessThan(108000);
    expect(result.state['status.landed']).toBe(true);
    expect(result.state['status.onTheGround']).toBe(false);
    expect(Number(result.state['vehicle.propellantMass'])).toBeGreaterThan(0);
  }
  if (scene === 'launch') expect(Number(result.state['kinematics.altitude'])).toBeGreaterThan(25);
  if (scene === 'launch' || scene === 'staging' || scene === 'landing') expect(Number(result.state['forces.thrust'])).toBeGreaterThan(0);
  if (scene === 'entry') expect(Number(result.state['forces.thermalPower'])).toBeGreaterThan(0);
  await painted(page);
}

export function painted(page: Page): Promise<void> {
  return page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
