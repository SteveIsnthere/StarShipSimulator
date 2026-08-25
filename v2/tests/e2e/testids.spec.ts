/**
 * M6.1: the test-id contract is honoured by the page.
 *
 * `src/ui/testids.ts` is a list of promises. This is what checks the page keeps
 * them — every id resolves to exactly one element, across the three surfaces
 * (flight controls, menu, dialogs) they live on.
 *
 * "Exactly one" is the part that matters. A missing id fails loudly wherever it
 * is used; a DUPLICATED id does something worse — every locator that uses it
 * becomes ambiguous, and Playwright's strictness turns an unrelated spec red
 * for a reason nobody will find quickly.
 *
 * This spec is also the capability-parity gate the milestone runs on. M6 retires
 * visual parity with the 2021 build (CLAUDE.md, second amendment) and keeps
 * capability parity in its place: every 2021 control still exists and works.
 * With the ids fixed here, "still exists" survives any amount of restyling.
 */
import { expect, test } from '@playwright/test';
import {
  byTestId,
  CONTROL_TESTIDS,
  DIALOG_TESTIDS,
  MENU_TESTIDS,
  MAP_TESTIDS,
  METRIC_IDS,
  metricSelector,
  READOUT_IDS,
  readoutTestId,
  TIMELINE_TESTIDS,
  readoutUnitTestId,
  readoutValueTestId,
} from '../../src/ui/testids';

async function ready(page: import('@playwright/test').Page) {
  await expect
    .poll(
      async () => (await page.locator(byTestId('readout-altitude-value')).textContent()) !== '',
      { timeout: 15_000 },
    )
    .toBe(true);
}

test('every flight control is present, exactly once @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  for (const id of [...CONTROL_TESTIDS, ...TIMELINE_TESTIDS, ...MAP_TESTIDS]) {
    await expect(page.locator(byTestId(id)), id).toHaveCount(1);
  }
});

test('every readout renders its row, value and unit @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  for (const id of READOUT_IDS) {
    await expect(page.locator(byTestId(readoutTestId(id))), id).toHaveCount(1);
    await expect(page.locator(byTestId(readoutValueTestId(id))), id).toHaveCount(1);
    await expect(page.locator(byTestId(readoutUnitTestId(id))), id).toHaveCount(1);
  }

  // And the binder has filled them: an id that resolves to an empty node would
  // satisfy the count above while telling the pilot nothing.
  const filled = await page.evaluate(
    (ids) => ids.every((id) => (document.querySelector(id)?.textContent ?? '') !== ''),
    READOUT_IDS.map((id) => byTestId(readoutValueTestId(id))),
  );
  expect(filled).toBe(true);
});

test('every drawn readout has an element to be drawn into @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // M6.2's gauges, bars, dots and chevron. They carry no text, so a missing one
  // fails nothing the readout checks above would notice — the page would simply
  // show an arc that never moves.
  for (const id of METRIC_IDS) {
    await expect(page.locator(metricSelector(id)), id).toHaveCount(1);
  }
});

test('every menu control is present once the menu is open @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator(byTestId('open-menu')).click();

  for (const id of MENU_TESTIDS) {
    await expect(page.locator(byTestId(id)), id).toHaveCount(1);
  }
});

test('the black box and the info views carry their ids @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator(byTestId('open-black-box')).click();
  await expect(page.locator(byTestId('black-box'))).toHaveCount(1);
  await page.locator(byTestId('black-box-close')).click();

  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('menu-guide')).click();
  await expect(page.locator(byTestId('info-view'))).toHaveCount(1);
  await page.locator(byTestId('info-close')).click();
  await expect(page.locator(byTestId('info-view'))).toHaveCount(0);

  for (const id of DIALOG_TESTIDS) {
    // Every dialog id has now been exercised; this asserts the list has no
    // entry nothing above touched.
    expect(['black-box', 'black-box-close', 'info-view', 'info-close']).toContain(id);
  }
});
