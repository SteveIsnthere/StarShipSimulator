/**
 * M6.8: the accessibility gate.
 *
 * Three things, each of which the design could plausibly have got wrong and
 * none of which is visible by looking:
 *
 *   THE BACKING. `tests/ui/contrast.test.ts` certifies that the interface's
 *   text clears AA on the flight backing over a noon sky. That is a claim about
 *   the STYLESHEET. This is the other half: a claim about the LAYOUT, that every
 *   live number actually sits on that backing (or on an opaque surface) rather
 *   than on the bare sky. Neither test means much alone.
 *
 *   FOCUS. The 2021 build had no focus styling at all and was mouse-only in
 *   practice. Every control is a real button now, so the keyboard already
 *   works; what has to be true is that you can SEE where it is.
 *
 *   MOTION. State is drawn by shape, never by motion alone: an engine reads
 *   off · igniting · lit · failed as an empty, centred, solid or crossed
 *   square (design-system.md §9). And under `prefers-reduced-motion` every
 *   transition in the interface collapses to an instant.
 */
import { expect, test } from '@playwright/test';
import { byTestId, READOUT_IDS, readoutValueTestId } from '../../src/ui/testids';
import { ready } from './helpers';

/**
 * The shallowest background a live number may sit on. Below the flight
 * backing's 0.68 (src/ui/shell/index.css) by a margin, so a deliberate deepening
 * never trips it; the bare sky (no background at all) always does.
 */
const BACKED_ALPHA = 0.6;

test('every live number sits on the backing, not on the bare sky @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Every readout the binder writes into, plus the timeline's narration.
  const ids = [...READOUT_IDS.map(readoutValueTestId), 'event-now'];

  const offenders: string[] = [];
  for (const id of ids) {
    const locator = page.locator(byTestId(id));
    if ((await locator.count()) === 0 || !(await locator.first().isVisible())) continue;
    const backed = await locator.first().evaluate((el, floor) => {
      // Walk up to the first ancestor that paints a background, and require it
      // to be at least as deep as the backing contrast.test certifies.
      for (let node: HTMLElement | null = el as HTMLElement; node; node = node.parentElement) {
        const match = /rgba?\(([^)]+)\)/.exec(getComputedStyle(node).backgroundColor);
        const parts = match ? match[1]!.split(/[ ,/]+/).filter(Boolean) : [];
        const alpha = parts.length === 4 ? Number(parts[3]) : parts.length === 3 ? 1 : 0;
        if (alpha > 0) return alpha >= floor;
      }
      return false;
    }, BACKED_ALPHA);
    if (!backed) offenders.push(id);
  }
  expect(offenders).toEqual([]);
});

test('every control can be reached and seen by keyboard @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Tab from the top of the document and collect what receives focus. The
  // 2021 build had no focus ring anywhere; the point here is that focus both
  // lands on real controls and is visible when it does.
  const seen: string[] = [];
  let ringed = 0;
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return {
        id: el.dataset['testid'] ?? el.tagName.toLowerCase(),
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
      };
    });
    if (!info) continue;
    seen.push(info.id);
    // :focus-visible fires for keyboard focus, so the ring must be painted.
    if (info.outlineStyle !== 'none' && parseFloat(info.outlineWidth) > 0) ringed += 1;
  }

  expect(seen.length, 'tabbing should reach controls').toBeGreaterThan(3);
  expect(ringed, `${ringed} of ${seen.length} focused elements showed a ring`).toBe(seen.length);
});

test('a control operated by keyboard actually does something @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Focus is worth nothing if Enter does not work. Cinematic mode is the
  // cleanest to assert: it is one of the first things in the tab order and its
  // effect is unambiguous.
  const toggle = page.locator(byTestId('cinematic-toggle'));
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('engine state is drawn by shape, not by motion', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const dot = page.locator('[data-metric="engine-0"]');
  await expect(dot).toBeVisible();
  await expect(dot).toHaveAttribute('data-state', /off|igniting|lit|failed/);
  // Nothing on the mark animates: the state is in its shape, which reduced
  // motion cannot take away.
  const animated = await page.evaluate(() =>
    [...document.querySelectorAll('[data-metric^="engine-"], [data-metric^="engine-"] *')].some(
      (el) => getComputedStyle(el).animationName !== 'none',
    ),
  );
  expect(animated).toBe(false);
});

test('reduced motion makes every transition instant, and adds none', async ({ page }) => {
  const duration = async () =>
    page.locator(byTestId('pause-toggle')).evaluate((el) => getComputedStyle(el).transitionDuration);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  // The positive control: by default the button does transition.
  expect(parseFloat(await duration())).toBeGreaterThan(0.01);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  // 0s (the kit's motion.css): no transition at all, so nothing lags a frame.
  expect(parseFloat(await duration())).toBe(0);

  // And an element with no transition of its own does not get one: hiding a
  // panel must take effect in the very next frame (the shell once forced a
  // 0.01ms transition on everything, and a hidden HUD stayed painted).
  const property = await page
    .locator(byTestId('readout-altitude-value'))
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(parseFloat(property)).toBe(0);
});

test('the overlay announces itself sensibly to a screen reader @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // `aria-live="off"` on the readouts is deliberate: a HUD that announced every
  // altitude change would be unusable. The timeline's narration is the opposite
  // — it changes seven times a flight and each one is worth hearing.
  const readouts = page.locator('[role="status"][aria-live="off"]');
  await expect(readouts).toHaveCount(1);

  const narration = page.locator(byTestId('event-now')).locator('xpath=..');
  await expect(narration).toHaveAttribute('aria-live', 'polite');
});
