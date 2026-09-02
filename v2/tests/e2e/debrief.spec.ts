/**
 * M12.1, in a browser: the card the flight ends on.
 *
 * `tests/hud/debrief.test.ts` proves the model — the outcome, the reasons, the
 * peaks against the recorder's own series. What it cannot prove is that any of
 * it reaches a screen, which is the same gap M9.3's shake bug lived in for
 * three milestones: wired correctly end to end, wrong by a constant, and every
 * unit test passing.
 *
 * So this flies the intro, which lands itself, and reads the numbers off the
 * card. It asserts them against the readouts the HUD was showing on the way
 * down where it can, and against the physics where it cannot — a card that
 * agrees with itself is not evidence.
 *
 * ONE OF THE THREE IS TAGGED @mobile, and the split is a cost decision. The
 * intro takes about forty seconds of flight to land, and it has to be flown
 * once per test; running all three on all five projects would add a quarter of
 * an hour to a suite that already takes an hour. The first test is the one
 * about the CARD — its numbers and its layout — so it runs everywhere the
 * layout differs. The other two are about wiring two buttons, which is the same
 * wiring at every viewport.
 */
import { expect, test } from '@playwright/test';
import { byTestId, readoutValueTestId } from '../../src/ui/testids';
import { ready, reveal } from './helpers';

type Page = import('@playwright/test').Page;

/** The intro lands itself in about forty seconds of flight. */
async function flyTheIntroDown(page: Page): Promise<void> {
  const altitude = page.locator(byTestId(readoutValueTestId('altitude')));
  await expect
    .poll(async () => (await altitude.textContent()) !== '', { timeout: 20_000 })
    .toBe(true);
  await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  await expect(page.locator(byTestId('debrief'))).toHaveCount(1, { timeout: 90_000 });
}

/** The numeral out of one of the card's cells, without its unit. */
async function figure(page: Page, id: string): Promise<number> {
  const text = (await page.locator(`${byTestId(id)} .value`).textContent()) ?? '';
  return Number(text.replace(/[^0-9.-]/g, ''));
}

/** The whole cell text, unit included — for the figures whose unit varies. */
async function reading(page: Page, id: string): Promise<string> {
  return ((await page.locator(`${byTestId(id)} .value`).textContent()) ?? '').trim();
}

test('the intro lands and says how it went @mobile', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await flyTheIntroDown(page);

  // CLAUDE.md's soul: the intro auto-landing sequence lands. If this ever reads
  // CRASH the demo is broken, and the card is how anyone would now find out.
  await expect(page.locator(byTestId('debrief-outcome'))).toHaveText('TOUCHDOWN');
  await expect(page.locator(byTestId('debrief-reason'))).toHaveCount(0);

  // The three gates, all inside their limits — which is what TOUCHDOWN means,
  // asserted independently rather than taken from the word above it.
  expect(await figure(page, 'debrief-vertical')).toBeLessThan(10);
  expect(await figure(page, 'debrief-horizontal')).toBeLessThan(2);
  expect(await figure(page, 'debrief-attitude')).toBeLessThan(5.2); // 0.09 rad

  /*
    It lands ON the pad: the intro starts at x = 0 and comes straight down.

    THE UNIT IS PART OF THE ASSERTION. The miss cell switches to kilometres
    above a thousand metres, and the first version of this test stripped the
    unit before comparing — so "40 KM" read as 40 and passed a bound of 100 that
    was meant to mean a hundred metres. Asserting the text is what makes the
    number mean something.
  */
  expect(await reading(page, 'debrief-miss')).toMatch(/^\d+ M$/);
  expect(await figure(page, 'debrief-miss')).toBeLessThan(100);

  // A landing burn from 500 m is subsonic in thick air and gentle: no heating
  // worth the name, and nowhere near the structural limits.
  expect(await figure(page, 'debrief-peak-heat')).toBeLessThan(10);
  expect(await figure(page, 'debrief-peak-g')).toBeLessThan(13);

  // And the events it flew through are on the card, in order.
  const events = page.locator(`${byTestId('debrief-events')} li`);
  expect(await events.count()).toBeGreaterThan(0);
  await expect(events.last()).toContainText('TOUCHDOWN');

  /*
    THE OUTCOME AND THE WAY OUT ARE ON SCREEN, on every viewport — which is the
    assertion this test was missing when the card was first built and the reason
    it exists on all five projects. The card is a scroll container; on
    `iphone-landscape`, 390 CSS pixels tall, the eleven figures filled it and
    both buttons sat below the fold, reachable only by scrolling something that
    does not look scrollable. Nothing failed. The head and the actions are
    sticky now, and this is what says so.
  */
  await expect(page.locator(byTestId('debrief-outcome'))).toBeInViewport();
  await expect(page.locator(byTestId('debrief-restart'))).toBeInViewport();
  await expect(page.locator(byTestId('debrief-black-box'))).toBeInViewport();
  await expect(page.locator(byTestId('debrief-close'))).toBeInViewport();
  // The last cell of the grid, because the card cannot scroll: if it does not
  // fit, this is what says so rather than a figure quietly off the bottom.
  await expect(page.locator(byTestId('debrief-propellant'))).toBeInViewport();

  /*
    AND IT GETS OUT OF THE WAY OF THE FLIGHT.

    The card is a large fixed panel with no scrim, and the first full browser
    run failed ten tests across four specs with the same sentence — "<div
    data-testid=\"debrief\"> intercepts pointer events" — on `all-raptors`,
    `cinematic-toggle` and the old `restart` button. It is a summary, not a
    dialog, and now it behaves like one: everything but its three buttons is
    transparent to the pointer, and the first touch anywhere else dismisses it
    in the capture phase without preventing anything. Both halves are asserted,
    because dismissing while swallowing the press would be a different bug
    wearing this one's clothes.

    `reveal` is what makes this the same claim on every project: on a phone the
    engine controls live in a sheet that opens on a tap, so the gesture that
    clears the card there is the tab rather than the Raptor. Either way the card
    goes and the control works.
  */
  await reveal(page, 'all-raptors');
  const raptors = page.locator(byTestId('all-raptors'));
  await expect(raptors).not.toHaveClass(/is-on/);
  await raptors.click();
  await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  await expect(raptors).toHaveClass(/is-on/, { timeout: 5_000 });
});

test('the card is dismissible, and both its buttons work', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await flyTheIntroDown(page);

  // Black Box opens over the card rather than replacing it: reading the plots
  // and then going back to the summary is one thought, not two.
  await page.locator(byTestId('debrief-black-box')).click();
  await expect(page.locator(byTestId('black-box'))).toHaveCount(1);

  /*
    AND IT IS ON TOP, which counting elements does not check.

    The card carried `z-index: 4` — the only stacking index in the application —
    so it painted OVER the full-screen Black Box its own button opens and ate
    the clicks meant for the plots. Every assertion in this test passed anyway,
    because a covered element is still in the DOM. So this asks the browser what
    is actually under the pointer at the card's own centre: it must be the black
    box, not the card.
  */
  const box = await page.locator(byTestId('debrief')).boundingBox();
  expect(box, 'the card is laid out').not.toBeNull();
  const onTop = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x as number, y as number);
      return {
        inCard: el?.closest('[data-debrief]') !== null && el?.closest('[data-debrief]') !== undefined,
        inBlackBox: el?.closest('[data-blackbox]') !== null && el?.closest('[data-blackbox]') !== undefined,
      };
    },
    [box!.x + box!.width / 2, box!.y + box!.height / 2],
  );
  expect(onTop.inBlackBox, 'the black box covers the card').toBe(true);
  expect(onTop.inCard, 'the card is not on top of the black box').toBe(false);

  await page.locator(byTestId('black-box-close')).click();
  await expect(page.locator(byTestId('debrief'))).toHaveCount(1);

  await page.locator(byTestId('debrief-close')).click();
  await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
});

test('and Escape closes it, which a dialog-shaped thing owes the keyboard', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await flyTheIntroDown(page);

  await page.keyboard.press('Escape');
  await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
});

test('and flying again clears it', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await flyTheIntroDown(page);

  await page.locator(byTestId('debrief-restart')).click();
  // The new flight has not ended, so there is nothing to debrief.
  await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  // And the clock has gone back to the start of a flight.
  await expect
    .poll(async () =>
      Number(
        ((await page.locator(byTestId(readoutValueTestId('altitude'))).textContent()) ?? '0').replace(
          /[^0-9.]/g,
          '',
        ),
      ),
    )
    .toBeGreaterThan(100);
});
