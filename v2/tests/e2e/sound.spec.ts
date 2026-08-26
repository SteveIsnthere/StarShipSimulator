/**
 * M8.1: the audio layer, in a browser.
 *
 * WHAT A HEADLESS BROWSER CAN ACTUALLY TELL US about sound, which is the whole
 * design problem SOUND-PLAN § 6 sets out. It cannot tell us anything is
 * audible: there is no device, and no assertion here claims one. What it CAN
 * tell us is whether the context reached the state the autoplay policy and the
 * mute switch say it should — which is exactly the pair of claims that would
 * silently break.
 */
import { expect, test } from '@playwright/test';
import { byTestId } from '../../src/ui/testids';
import { ready } from './helpers';

const TOGGLE = byTestId('mute-toggle');

test('the sound control is present and reports its state @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  // Default is ON — but suspended until a gesture, which is the next test.
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'true');
});

test('nothing is constructed before the first gesture @mobile', async ({ page }) => {
  /*
    The autoplay policy, asserted rather than assumed. The intro demo plays
    before the player has touched anything, so this is the state the first
    twenty seconds of every session are in — and § 3.4 argues that is correct
    rather than a compromise.

    Counted by patching the constructor before the app loads: an AudioContext
    that is never built cannot be caught by inspecting one.
  */
  await page.addInitScript(() => {
    const w = window as unknown as { __audioContexts: number };
    w.__audioContexts = 0;
    const Original = window.AudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = class extends Original {
      constructor(...args: unknown[]) {
        // @ts-expect-error — passing through to the real constructor.
        super(...args);
        w.__audioContexts += 1;
      }
    };
  });
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  // Several seconds of intro, with no interaction at all.
  await page.waitForTimeout(1_500);
  const built = await page.evaluate(
    () => (window as unknown as { __audioContexts: number }).__audioContexts,
  );
  expect(built, 'an AudioContext was built before any gesture').toBe(0);
});

test('a gesture brings the context to running, and mute suspends it @mobile', async ({ page }) => {
  /*
    The two states that matter, read from the browser's own report rather than
    claimed. Nothing here asserts anything was AUDIBLE — there is no device, and
    SOUND-PLAN § 6 is explicit that this is the honest limit of what a headless
    browser can be asked.

    The context is captured by patching the constructor before the app loads,
    for the same reason the previous test counts them that way: the app holds
    its context privately, which is correct, so the only place to observe one is
    where it is built.
  */
  await page.addInitScript(() => {
    const w = window as unknown as { __ctx: AudioContext | null };
    w.__ctx = null;
    const Original = window.AudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = class extends Original {
      constructor(...args: unknown[]) {
        // @ts-expect-error — passing through to the real constructor.
        super(...args);
        w.__ctx = this as unknown as AudioContext;
      }
    };
  });
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const state = () =>
    page.evaluate(() => (window as unknown as { __ctx: AudioContext | null }).__ctx?.state ?? null);

  // Before any gesture there is no context at all.
  expect(await state()).toBeNull();

  // A click on the world is a gesture, and the commonest one.
  await page.locator(byTestId('world-canvas')).click({ position: { x: 10, y: 10 } });
  await expect.poll(state, { timeout: 5_000 }).toBe('running');

  // Muting SUSPENDS it — SOUND-PLAN § 3.4 — rather than zeroing a gain, so a
  // muted simulator does no audio work at all.
  await page.locator(TOGGLE).click();
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(state, { timeout: 5_000 }).toBe('suspended');

  // And unmuting brings it back.
  await page.locator(TOGGLE).click();
  await expect.poll(state, { timeout: 5_000 }).toBe('running');
});

test('the mute choice survives a reload @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator(TOGGLE).click();
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'false');

  await page.reload({ waitUntil: 'load' });
  await ready(page);
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'false');
});
