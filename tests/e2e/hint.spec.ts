/**
 * M12.6: the first thing to press, and the guide that cannot lie about it.
 *
 * ONCE is the whole claim, and it is a claim about a FRESH PROFILE — which is
 * what makes it an e2e rather than a unit test. Playwright gives each test a
 * clean browser context, so "has never been here before" is the default state
 * here and nowhere else.
 */
import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
import { byTestId, HINT_TESTIDS } from '../../src/ui/testids';
import { AUTOPILOT_MODES, GUIDE_SCENARIOS } from '../../src/ui/guide';
import { ready } from './helpers';

const [HINT_ID, DISMISS_ID] = HINT_TESTIDS;
const HINT = byTestId(HINT_ID);

/**
 * True where the hint is deliberately not shown.
 *
 * A landscape phone has 45 px between the top strip's buttons and the
 * trajectory tab, and the hint's dismiss button alone is the 44 px touch floor.
 * `Broadcast.svelte`'s `hint-slot` records the four placements that were tried
 * and what each one displaced. The hint is a courtesy; the instruments are not.
 */
const noRoom = (page: Page): Promise<boolean> =>
  page.evaluate(() => window.matchMedia('(height < 26rem)').matches);

test('a fresh profile is told what to press, once @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  test.skip(await noRoom(page), 'no room for the hint on a landscape phone');
  await expect(page.locator(HINT)).toBeVisible();

  await page.locator(byTestId(DISMISS_ID)).click();
  await expect(page.locator(HINT)).toBeHidden();

  // The half that a component's own state cannot fake.
  await page.reload({ waitUntil: 'load' });
  await ready(page);
  await expect(page.locator(HINT)).toBeHidden();
});

test('and any input puts it away, without eating the input @mobile', async ({ page }) => {
  /*
    THE POINT OF THE FEATURE, in two halves that need different evidence.

    ONE: the card does not intercept. `pointer-events: none` is what makes the
    tap that clears the hint the same tap that starts the flight, and the only
    honest witness is what the browser says is under the pointer at the card's
    own centre. Asserted directly, because the obvious version of this test —
    click a control and see the hint go — proves nothing about interception on
    a layout where the card was never over that control anyway.

    TWO: any input dismisses, and the input still does its job. The control is
    the cinematic toggle: it is in the top strip on every layout, so no panel
    has to be opened to reach it — and the first version of this test used
    `reveal(page, 'fins')`, which on a phone taps the yoke panel's toggle first
    and dismisses the hint by itself, leaving the assertion vacuous.
  */
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  test.skip(await noRoom(page), 'no room for the hint on a landscape phone');
  const card = page.locator(HINT);
  await expect(card).toBeVisible();

  const box = (await card.boundingBox())!;
  const onTop = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x!, y!);
      return el?.closest('[data-testid]')?.getAttribute('data-testid') ?? null;
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(onTop, 'the card is over its own centre and eats the tap').not.toBe(HINT_ID);

  const cinematic = page.locator(byTestId('cinematic-toggle'));
  await expect(cinematic).toHaveAttribute('aria-pressed', 'false');
  await cinematic.click();
  await expect(card).toBeHidden();
  // And the click did what it was for, rather than only clearing the card.
  await expect(cinematic).toHaveAttribute('aria-pressed', 'true');
});

test('the guide lists every autopilot mode the rail has @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('menu-guide')).click();
  await expect(page.locator(byTestId('info-view'))).toBeVisible();

  /*
    Read from the same table the panel renders, so this cannot be satisfied by
    a guide that describes modes nobody can press. `guide.test.ts` holds the
    other end: that the table matches the testid contract.
  */
  for (const mode of AUTOPILOT_MODES) {
    const row = page.locator(`[data-guide="autopilot"] [data-mode="${mode.testid}"]`);
    await expect(row, mode.label).toContainText(mode.label);
  }
  await expect(page.locator('[data-guide="autopilot"] li')).toHaveCount(AUTOPILOT_MODES.length);
});

test('and every flight the menu offers @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('menu-guide')).click();
  await expect(page.locator(byTestId('info-view'))).toBeVisible();

  await expect(page.locator('[data-guide="scenarios"] tr')).toHaveCount(GUIDE_SCENARIOS.length);
  for (const preset of GUIDE_SCENARIOS) {
    await expect(
      page.locator(`[data-guide="scenarios"] [data-scenario="${preset.id}"]`),
      preset.id,
    ).toContainText(preset.name);
  }
});

test('and a layout with no room for it says so rather than shipping a collision @mobile', async ({
  page,
}) => {
  /*
    THE OTHER HALF OF THE DECISION, asserted so it is a choice rather than a
    bug. On a landscape phone the hint is not shown; everywhere else it is. A
    regression in either direction — a card that reappears and lands on the
    trajectory tab, or a media query that spreads and hides it on a desktop —
    fails here.
  */
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  const expected = !(await noRoom(page));
  await expect(page.locator(HINT)).toBeVisible({ visible: expected });
});
