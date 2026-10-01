/**
 * Witness: the engines draw a plume, and the detector can tell when they do not.
 *
 * Set up through `window.__simDebug` (app/debug.ts) rather than through the
 * menu, so the moment measured is the same on every machine: 2 km, at rest,
 * full throttle. The POSITIVE CONTROL is the same moment with the engines off;
 * if the detector also reads fire there, it is measuring the sky, and the test
 * fails on the control rather than passing on the subject.
 */
import { expect, test, type Page } from '@playwright/test';
import { readFrame, type Region } from './pixels';

/** Below the ship, as tests/e2e/plume.spec.ts measures it. */
const BELOW: Region = { x: 0.36, y: 0.52, width: 0.28, height: 0.47 };
/**
 * Fire, not ground: bright, or strongly warm, and red-dominant — plume.spec.ts's
 * query. A plain warm fraction over the same box counts the brown ground band,
 * which fooled the first version of this witness: the control caught it
 * (0.061 "fire" with the engines off).
 */
const PLUME = { region: BELOW, minLuma: 200, orWarmth: 100, warmOnly: true };

type Telemetry = Record<string, number | boolean>;

async function hoverAt2km(page: Page, enginesOn: boolean): Promise<void> {
  await page.goto('./?debug=1', { waitUntil: 'load' });
  await page.waitForFunction(() => '__simDebug' in window);
  await page.waitForFunction(() => {
    try {
      (window as unknown as { __simDebug: { telemetry(): unknown } }).__simDebug.telemetry();
      return true;
    } catch {
      return false;
    }
  });
  await page.evaluate((on) => {
    const debug = (
      window as unknown as {
        __simDebug: {
          setScenario(id: string, o: Record<string, number>): void;
          setState(p: Record<string, number | boolean>): void;
        };
      }
    ).__simDebug;
    // Enough propellant that full thrust is a slow climb, not a departure.
    debug.setScenario('landing-burn', {
      altitude: 2000,
      speedX: 0,
      speedY: 0,
      pitch: 0,
      propellant: 600,
    });
    debug.setState({
      'engines.running[0]': on,
      'engines.running[1]': on,
      'engines.running[2]': on,
      'vehicle.throttle': 100,
      'vehicle.throttleCurrent': 100,
    });
  }, enginesOn);
  // Two seconds of SIMULATED time for the emitters to reach steady state,
  // whatever the frame rate.
  const t0 = await simTime(page);
  await expect
    .poll(() => simTime(page), { timeout: 60_000, intervals: [100] })
    .toBeGreaterThan(t0 + 2);
}

async function simTime(page: Page): Promise<number> {
  return page.evaluate(() => {
    const t = (
      window as unknown as { __simDebug: { telemetry(): Telemetry } }
    ).__simDebug.telemetry();
    return Number(t['world.updatedFrameCount']) / 120;
  });
}

/** Pixels of fire below the ship. */
async function fireBelow(page: Page): Promise<number> {
  const frame = await readFrame(page, { extents: { plume: PLUME } });
  const plume = frame.extents.plume!;
  return plume.found ? plume.count : 0;
}

test('engines lit draw fire below the ship, and engines off do not @smoke', async ({ page }) => {
  test.setTimeout(120_000);

  await hoverAt2km(page, false);
  const control = await fireBelow(page);

  await hoverAt2km(page, true);
  const subject = await fireBelow(page);

  const report = `fire pixels below the ship: engines off ${control}, engines lit ${subject}`;
  console.log(`[witness-plume] ${report}`);
  // The control must read (nearly) no fire, or the detector is not measuring the plume.
  expect(control, report).toBeLessThan(20);
  expect(subject, report).toBeGreaterThan(100);
});
