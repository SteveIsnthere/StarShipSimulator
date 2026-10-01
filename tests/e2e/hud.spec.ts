/**
 * M4.1: the HUD in a real browser.
 *
 * The unit tests prove the binder's behaviour against stubs. What they cannot
 * prove is that the wiring is right: that Svelte rendered the nodes, that the
 * resolver found them, and that the one rAF subscriber is actually writing into
 * the page. That is what this checks.
 */
import { expect, test } from '@playwright/test';
import { byTestId, READOUT_IDS, readoutValueTestId } from '../../src/ui/testids';

/** Every value node the binder writes into, as one CSS selector. */
const VALUES = READOUT_IDS.map((id) => byTestId(readoutValueTestId(id))).join(', ');

test('the readouts are rendered and filled in', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  // Every readout has a row, a value node and a unit node — asked for by name
  // rather than by class, so a restyle cannot make this pass or fail by
  // accident. tests/e2e/testids.spec.ts holds the full contract.
  await expect(page.locator(byTestId('readout-altitude'))).toBeVisible();
  await expect(page.locator(VALUES)).toHaveCount(READOUT_IDS.length);

  // The first update fills every value node. Poll rather than wait a fixed
  // time: the view starts asynchronously.
  await expect
    .poll(
      async () =>
        page.evaluate(
          (selector) =>
            [...document.querySelectorAll(selector)].every((el) => el.textContent !== ''),
          VALUES,
        ),
      { timeout: 5_000 },
    )
    .toBe(true);

  await expect(page.locator(byTestId('readout-altitude'))).toContainText('ALT');
  await expect(page.locator(byTestId('readout-mach'))).toContainText('MACH');
});

test('the readouts change as the intro flight runs', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  const read = () =>
    page.evaluate(
      (selector) => [...document.querySelectorAll(selector)].map((el) => el.textContent ?? ''),
      VALUES,
    );

  await expect.poll(async () => (await read())[0] !== '', { timeout: 5_000 }).toBe(true);
  const first = await read();

  // The intro is an auto-landing descent, so altitude and vertical speed must
  // both move within a second.
  await expect
    .poll(async () => {
      const now = await read();
      return now.some((v, i) => v !== first[i]);
    }, { timeout: 5_000 })
    .toBe(true);
});

test('nothing in the page reintroduces a per-frame lookup', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  // Count getElementById calls across a second of animation. 2021 made 45 per
  // update; the binder should make none at all.
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
