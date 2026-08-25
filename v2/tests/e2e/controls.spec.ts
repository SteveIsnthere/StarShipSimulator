/**
 * M4.2: the panels drive the simulation in a real browser.
 *
 * The unit tests prove the event union does the right thing to SimState. What
 * they cannot prove is that a click on a real button reaches it, and that the
 * indicator lights up afterwards without anyone repainting it by hand.
 */
import { expect, test } from '@playwright/test';

/** A control, by its test id (src/ui/testids.ts). The `is-on` class is the
    indicator binder's output, so this reads what the simulation believes. */
const light = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-testid="${id}"]`);

test('the panels render with every control', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

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
    await expect(light(page, id), id).toBeVisible();
  }

  await expect(page.locator('[data-testid="throttle"]')).toBeVisible();
  await expect(page.locator('[data-testid="yoke-pitch"]')).toBeVisible();
});

test('a toggle lights its button and unlights it again', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  const rcs = light(page, 'rcs');
  await expect(rcs).not.toHaveClass(/is-on/);

  await rcs.click();
  await expect(rcs).toHaveClass(/is-on/);

  await rcs.click();
  await expect(rcs).not.toHaveClass(/is-on/);
});

test('lighting the Raptors changes the flight', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  // This has to start from a known engine state, and mid-intro is not one: the
  // descent controller shuts engines off and on all the way down, so a click
  // there is a shutdown as often as an ignition — and 2021's toggle-all
  // asymmetry means a shutdown makes the vehicle fall FASTER, which is the
  // opposite of what this test asserts. It passed for a long time on luck.
  //
  // The handover is the known state: engines off, tanks full. Fuel returning to
  // 350 t is the signal (see the throttle test below for why not the others).
  const fuel = page.locator('[data-testid="readout-propellant-value"]');
  await expect
    .poll(async () => Number(await fuel.textContent()), { timeout: 40_000, intervals: [250] })
    .toBe(350);

  const allRaptors = light(page, 'all-raptors');
  await expect(allRaptors).not.toHaveClass(/is-on/);

  // Resting on the pad after the demo landed it. Give it a push and it climbs.
  const altitude = page.locator('[data-testid="readout-altitude-value"]');
  const before = Number(await altitude.textContent());

  await allRaptors.click();
  await expect(allRaptors).toHaveClass(/is-on/, { timeout: 5_000 });

  // Three Raptors at full throttle on a full-but-mostly-empty vehicle: it goes
  // up. That is the whole game.
  await expect
    .poll(async () => Number(await altitude.textContent()), { timeout: 15_000 })
    .toBeGreaterThan(before + 5);
});

test('the throttle slider is bounded by the engine limits', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  // Not 0-100. initBackEnd.js:166 put these on the element from
  // throttleLowerLimit / throttleUpperLimit; core clamps to the same numbers.
  const throttle = page.locator('[data-testid="throttle"]');
  await expect(throttle).toHaveAttribute('min', '40');
  await expect(throttle).toHaveAttribute('max', '100');
});

test('the throttle slider commands the engines once the intro hands over', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  // The intro demo owns the throttle while it flies — moving the slider during
  // the descent does nothing, because demoAutoLand recommands it every step.
  // That is the autopilot working, not the slider failing. On touchdown the demo
  // clears itself and hands the vehicle over (autopilot/index.ts:497): engines
  // shut down and the throttle is restored to 100. Measured at about 9.5 s.
  //
  // Detecting the handover takes some care, and two obvious signals are wrong.
  // The engine indicator going dark is not it: the descent controller shuts
  // engines off and on all the way down, so it blinks several times first. Nor
  // is "vertical speed reads 0" — the readout is `Math.ceil(speedY)`, so
  // anything slower than 1 m/s downward already displays as 0 while the demo is
  // still flying.
  //
  // The unambiguous one is fuel. On handover demoAutoLand refills the tanks so
  // the player gets a full vehicle (autopilot/index.ts:499). Nothing else in the
  // simulation puts propellant back.
  const fuel = page.locator('[data-testid="readout-propellant-value"]');
  await expect
    .poll(async () => Number(await fuel.textContent()), { timeout: 40_000, intervals: [250] })
    .toBe(350);

  // Handover also restores the throttle to 100 and shuts the engines down.
  const readout = page.locator('[data-testid="readout-throttle-value"]');
  await expect.poll(async () => Number(await readout.textContent()), { timeout: 10_000 }).toBe(100);

  const allRaptors = light(page, 'all-raptors');
  await expect(allRaptors).not.toHaveClass(/is-on/);
  await allRaptors.click();

  await page.locator('[data-testid="throttle"]').fill('40');

  // The actual throttle slews toward the command at throttleSpeed, so watch the
  // readout settle rather than expecting it to snap.
  await expect.poll(async () => Number(await readout.textContent()), { timeout: 8_000 }).toBe(40);
});

test('the controls add no per-frame document lookups', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await light(page, 'fins').click();

  const calls = await page.evaluate(async () => {
    let count = 0;
    const original = document.getElementById.bind(document);
    document.getElementById = (id: string) => {
      count += 1;
      return original(id);
    };
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    document.getElementById = original;
    return count;
  });

  expect(calls).toBe(0);
});
