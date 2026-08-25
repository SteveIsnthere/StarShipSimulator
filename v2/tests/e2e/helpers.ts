/**
 * Things every spec needs, once the layout stopped being one layout.
 *
 * M6.6 made the flight-control panels bottom SHEETS on a phone, and sheets
 * start closed — a rail can sit open beside the world indefinitely, a sheet
 * covers half a 390px screen. So "is the Auto-Land button visible" stopped
 * having one answer, and a spec that runs in both the desktop project and the
 * phone projects has to ask for the controls rather than assume them.
 *
 * That is not a workaround for the test. It is the capability-parity question
 * asked correctly: every 2021 control still exists and works, reachable in at
 * most one tap.
 */
import { expect, type Page } from '@playwright/test';
import { byTestId, readoutValueTestId } from '../../src/ui/testids';

/** Wait until the first frame has written a readout — the app is live. */
export async function ready(page: Page): Promise<void> {
  await expect
    .poll(
      async () => (await page.locator(byTestId(readoutValueTestId('altitude'))).textContent()) !== '',
      { timeout: 20_000 },
    )
    .toBe(true);
}

/**
 * Make the engine and yoke controls reachable.
 *
 * A no-op on a rail layout, where both panels are already open. On a phone it
 * opens each sheet in turn — and because only one may be open at a time there,
 * it checks the control it wants rather than assuming a sheet stayed open.
 */
export async function openControls(page: Page): Promise<void> {
  const throttle = page.locator(byTestId('throttle'));
  if (!(await throttle.isVisible())) {
    await page.locator(byTestId('engine-panel-toggle')).click();
    await expect(throttle).toBeVisible();
  }
}

/** The same, for the yoke and autopilot panel on the other side. */
export async function openYoke(page: Page): Promise<void> {
  const pitch = page.locator(byTestId('yoke-pitch'));
  if (!(await pitch.isVisible())) {
    await page.locator(byTestId('yoke-panel-toggle')).click();
    await expect(pitch).toBeVisible();
  }
}

/**
 * Which panel each control lives in.
 *
 * index.html:72 and :92 — the split is 2021's and has not moved. Written out
 * because on a phone it decides which sheet has to be open, and a spec that
 * guessed wrong would fail in a way that looks like a broken control.
 */
const ENGINE_PANEL = new Set([
  'raptor-0',
  'raptor-1',
  'raptor-2',
  'all-raptors',
  'auto-max-thrust',
  'throttle',
]);

/**
 * Make one control visible, whichever panel it is in.
 *
 * On a rail layout this is a no-op — both panels are already open. On a phone
 * ONLY ONE SHEET MAY BE OPEN AT A TIME, which is a deliberate design rule (two
 * sheets stacked over a 390px screen leave nothing of the flight) and which
 * makes "assert every control is visible" an impossible question there rather
 * than a failing one. The right question, and the one capability parity
 * actually asks, is whether each control can be reached — so a spec reveals the
 * control it is about to use.
 */
export async function reveal(page: Page, id: string): Promise<void> {
  const control = page.locator(byTestId(id));
  if (await control.isVisible()) return;
  await page
    .locator(byTestId(ENGINE_PANEL.has(id) ? 'engine-panel-toggle' : 'yoke-panel-toggle'))
    .click();
  await expect(control, `${id} should be reachable in one tap`).toBeVisible();
}

/** Reveal a control and click it. */
export async function tap(page: Page, id: string): Promise<void> {
  await reveal(page, id);
  await page.locator(byTestId(id)).click();
}

/** True when the layout is the phone one — sheets rather than rails. */
export async function isPhoneLayout(page: Page): Promise<boolean> {
  return page.evaluate(() => window.matchMedia('(width < 37.5rem)').matches);
}

/**
 * True when the lower third is COMPRESSED — narrow, or short and landscape.
 *
 * A different question from `isPhoneLayout`, and the difference is the whole
 * point. A landscape phone is over 600px wide, so it gets rails and dials like
 * a desktop; what it does not have is height, so the lower third is squeezed
 * and its text sits higher up the scrim. Anything reasoning about that band has
 * to ask THIS, not about width.
 */
export async function isCompactLayout(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      window.matchMedia('(width < 37.5rem)').matches ||
      window.matchMedia('(height < 31.25rem) and (orientation: landscape)').matches,
  );
}
