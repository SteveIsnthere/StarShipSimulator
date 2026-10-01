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
import { byTestId, readoutUnitTestId, readoutValueTestId } from '../../src/ui/testids';
import { PHONE_PORTRAIT, SHORT_LANDSCAPE } from '../../src/ui/shell/layout-queries';

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
  return page.evaluate((q) => window.matchMedia(q).matches, PHONE_PORTRAIT);
}

/**
 * True when the layout is COMPACT — a phone in either orientation.
 *
 * A different question from `isPhoneLayout`. A landscape phone is over 600 px
 * wide, so it keeps rails like a desktop; what it lacks is height, so the
 * cluster is the compact one and the rails start folded (`short` in
 * src/ui/shell/layout.ts).
 */
export async function isCompactLayout(page: Page): Promise<boolean> {
  return page.evaluate(
    ([phone, short]) => window.matchMedia(phone).matches || window.matchMedia(short).matches,
    [PHONE_PORTRAIT, SHORT_LANDSCAPE] as const,
  );
}

/** A readout's value and unit, as the HUD shows them; NaN until its first frame. */
export async function readout(page: Page, id: string): Promise<{ value: number; unit: string }> {
  const text = (await page.locator(byTestId(readoutValueTestId(id))).textContent()) ?? '';
  const unit = ((await page.locator(byTestId(readoutUnitTestId(id))).textContent()) ?? '').trim().toLowerCase();
  // Empty until the HUD's first frame: unread, not zero.
  return { value: text.trim() === '' ? NaN : Number(text), unit };
}

/**
 * Altitude in metres. The readout switches unit at 1 km, so the unit has to be
 * read too — otherwise a climb past 1000 m looks like a fall to 1.0.
 */
export async function altitudeMetres(page: Page): Promise<number> {
  const { value, unit } = await readout(page, 'altitude');
  return unit === 'km' ? value * 1000 : value;
}

/**
 * A point where the world canvas itself is on top, for a click that has to
 * land on the world (a gesture) and not on the chrome over it. Scans a grid
 * rather than assuming a corner: which corners are free depends on the layout.
 */
export async function worldPoint(page: Page): Promise<{ x: number; y: number }> {
  const point = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="world-canvas"]');
    const box = canvas?.getBoundingClientRect();
    if (!canvas || !box) return null;
    for (let fy = 0.5; fy <= 0.9; fy += 0.1) {
      for (let fx = 0.3; fx <= 0.7; fx += 0.1) {
        const x = Math.round(box.width * fx);
        const y = Math.round(box.height * fy);
        if (document.elementFromPoint(box.x + x, box.y + y) === canvas) return { x, y };
      }
    }
    return null;
  });
  expect(point, 'some of the world must be uncovered').not.toBeNull();
  return point!;
}
