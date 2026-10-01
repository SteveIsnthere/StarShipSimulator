/**
 * M6.8: the accessibility gate.
 *
 * Three things, each of which the design could plausibly have got wrong and
 * none of which is visible by looking:
 *
 *   THE CONTRAST BAND. `tests/ui/contrast.test.ts` certifies that white ink
 *   over the scrim over a noon sky clears AA — but only up to three quarters
 *   of the scrim's height, because above that the gradient has faded and
 *   nothing would pass. That is a claim about the STYLESHEET. This is the other
 *   half: a claim about the LAYOUT, that no text is actually up there. Neither
 *   test means much alone.
 *
 *   FOCUS. The 2021 build had no focus styling at all and was mouse-only in
 *   practice. Every control is a real button now, so the keyboard already
 *   works; what has to be true is that you can SEE where it is.
 *
 *   MOTION. Two things blink — the engine dots during ignition, the current
 *   timeline event — and both are genuine signals rather than decoration, so
 *   under `prefers-reduced-motion` they hold still rather than disappearing.
 */
import { expect, test } from '@playwright/test';
import { byTestId, READOUT_IDS, readoutValueTestId } from '../../src/ui/testids';
import { isCompactLayout, ready } from './helpers';

/**
 * Must match TEXT_BAND_TOP and PHONE_BAND_TOP in tests/ui/contrast.test.ts.
 *
 * Two numbers because there are two scrims, and which one applies is decided by
 * COMPRESSION rather than by width: a compressed lower third — narrow, or short
 * and landscape — puts text higher up its own ramp, so `--scrim-phone` holds
 * its depth further up to carry the same contrast budget.
 *
 * That distinction was learned twice. The two portrait projects failed first
 * and were fixed with a width query; the two landscape ones then failed the
 * same way, because a landscape phone is over 600px wide and had been treated
 * as a desktop. Which is the argument for running all four.
 */
const TEXT_BAND_TOP = 0.75;
const COMPACT_BAND_TOP = 0.9;

test('no text sits above the part of the scrim that was certified @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const lower = await page.locator(byTestId('readout-speed')).evaluate((el) => {
    // Walk up to the element that paints the scrim.
    let node: HTMLElement | null = el as HTMLElement;
    while (node && !getComputedStyle(node).backgroundImage.includes('linear-gradient')) {
      node = node.parentElement;
    }
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { top: rect.top, height: rect.height };
  });
  expect(lower, 'the lower third should paint a gradient').not.toBeNull();

  // Every readout the binder writes into, plus the timeline's narration.
  const ids = [
    ...READOUT_IDS.filter((id) => id !== 'clock').map(readoutValueTestId),
    'event-now',
  ];

  const bandTop = (await isCompactLayout(page)) ? COMPACT_BAND_TOP : TEXT_BAND_TOP;

  const offenders: string[] = [];
  for (const id of ids) {
    const locator = page.locator(byTestId(id));
    if ((await locator.count()) === 0) continue;
    const box = await locator.boundingBox();
    if (!box) continue;
    // 0 at the bottom of the scrim, 1 at its top — the same axis the contrast
    // model uses. The TOP of the text box is what matters: that is its
    // thinnest-scrim edge.
    const height = lower!.height;
    const fromBottom = (lower!.top + height - box.y) / height;
    if (fromBottom > bandTop) {
      offenders.push(`${id} at ${(fromBottom * 100).toFixed(0)}% up the scrim`);
    }
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

test('reduced motion holds the blink still without hiding it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const duration = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--blink-duration').trim(),
  );
  expect(duration).toBe('0s');

  // The dot is still THERE, and still reports its state — the signal survives,
  // only the motion goes. A reduced-motion rule that hid the engine dots would
  // be removing information, not animation.
  const dot = page.locator('[data-metric="engine-0"]');
  await expect(dot).toBeVisible();
  await expect(dot).toHaveAttribute('data-state', /off|igniting|lit|failed/);
});

test('motion is on by default, or the rule above proves nothing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const duration = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--blink-duration').trim(),
  );
  expect(duration).not.toBe('0s');
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
