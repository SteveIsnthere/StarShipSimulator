/**
 * M6.3: the event track, in a real browser.
 *
 * The unit tests prove the derivation over the seven goldens and the binder
 * against stubs. What only a browser shows is the wiring: that the track
 * rendered, that the binder found its dots, that `observe` is being called from
 * the frame loop at all — and, the case with the most moving parts, that
 * changing scenario re-renders the dots AND re-points the binder at them.
 */
import { expect, test } from '@playwright/test';
import { byTestId, readoutValueTestId } from '../../src/ui/testids';

async function ready(page: import('@playwright/test').Page) {
  await expect
    .poll(
      async () => (await page.locator(byTestId(readoutValueTestId('altitude'))).textContent()) !== '',
      { timeout: 15_000 },
    )
    .toBe(true);
}

const dot = (page: import('@playwright/test').Page, event: string) =>
  page.locator(`[data-metric="event-${event}"]`);

test('the intro track is drawn and reaches touchdown', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // The intro's expected track is short: it starts already in the final
  // descent. Both dots must exist before anything happens to them.
  await expect(dot(page, 'LANDING BURN')).toHaveCount(1);
  await expect(dot(page, 'TOUCHDOWN')).toHaveCount(1);

  // The demo lands itself in about ten seconds. TOUCHDOWN is the last thing
  // that happens, so it ends `current`.
  await expect
    .poll(async () => dot(page, 'TOUCHDOWN').getAttribute('data-state'), {
      timeout: 40_000,
      intervals: [250],
    })
    .toBe('current');

  // And the one before it is reached, not still pending — which is what proves
  // the binder is writing states rather than one state.
  await expect(dot(page, 'LANDING BURN')).toHaveAttribute('data-state', 'reached');
});

test('the narration says where the flight is and what is next', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const now = page.locator(byTestId('event-now'));
  const next = page.locator(byTestId('event-next'));

  // Something is always said, from the very first frame.
  await expect(now).not.toBeEmpty();

  await expect
    .poll(async () => now.textContent(), { timeout: 40_000, intervals: [250] })
    .toBe('TOUCHDOWN');

  // Nothing outstanding on the intro's track once it has landed.
  await expect(next).toHaveText('');
});

test('configuring a new scenario redraws the track and rebinds it', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // The intro's track is two dots — it starts already in the final descent.
  // Booster Sep's is six, and includes an ENTRY the intro has no idea about.
  await expect(dot(page, 'ENTRY')).toHaveCount(0);

  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('preset-booster-sep')).click();
  await page.locator(byTestId('menu-configure')).click();

  await expect(dot(page, 'ENTRY')).toHaveCount(1);
  await expect(dot(page, 'MECO')).toHaveCount(1);

  // A fresh flight is a fresh story: the new dots start pending rather than
  // carrying the previous flight's states over.
  await expect(dot(page, 'ENTRY')).toHaveAttribute('data-state', 'pending');
  await expect(page.locator(byTestId('event-now'))).toHaveText('PRE-FLIGHT');

  // Now the half that actually needs the rebind to have worked. Configure a
  // landing, fly it with the autopilot, and watch the dots light. If the binder
  // were still pointed at the elements the re-render replaced, these would sit
  // pending forever while it wrote into orphans — which is precisely the bug
  // that looks like "the timeline stopped working after I changed scenario".
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('preset-landing-burn')).click();
  await page.locator(byTestId('menu-configure')).click();

  await expect(dot(page, 'TOUCHDOWN')).toHaveAttribute('data-state', 'pending');
  await page.locator(byTestId('auto-land')).click();

  await expect
    .poll(async () => dot(page, 'TOUCHDOWN').getAttribute('data-state'), {
      timeout: 40_000,
      intervals: [250],
    })
    .toBe('current');
});

test('a scenario that never reaches an event leaves it dark', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('preset-before-flip')).click();
  await page.locator(byTestId('menu-configure')).click();

  // A kilometre up, engines off, autopilot off. It is falling, and it has not
  // flipped, has not lit a landing burn, and has certainly not landed. Events
  // are observed, never scripted: a flight that does not happen lights nothing.
  await page.waitForTimeout(3_000);
  for (const event of ['FLIP', 'LANDING BURN', 'TOUCHDOWN']) {
    await expect(dot(page, event), event).toHaveAttribute('data-state', 'pending');
  }
  await expect(page.locator(byTestId('event-now'))).toHaveText('PRE-FLIGHT');
});
