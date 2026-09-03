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

type Page = import('@playwright/test').Page;
import { byTestId } from '../../src/ui/testids';
import { ready } from './helpers';

const TOGGLE = byTestId('mute-toggle');
const MENU = byTestId('open-menu');
const VOLUME = byTestId('menu-volume');

/**
 * The master gain's value, read off the real node.
 *
 * THE ACCEPTANCE LINE FOR M12.5, and the reason it is done by patching
 * `createGain` rather than by exposing anything: the claim is that a settings
 * control REACHES THE MIXER, and the only honest witness to that is the gain
 * node the browser actually built. The master is the one connected straight to
 * `context.destination` — the buses connect to it, not to the destination — so
 * patching `connect` identifies it without the page having to say which it is.
 */
async function watchMasterGain(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __masterGain: GainNode | null };
    w.__masterGain = null;
    const connect = GainNode.prototype.connect as (
      this: GainNode,
      target: AudioNode,
    ) => AudioNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GainNode.prototype as any).connect = function (this: GainNode, target: AudioNode) {
      if (target === this.context.destination) w.__masterGain = this;
      // eslint-disable-next-line prefer-rest-params
      return connect.apply(this, arguments as never);
    };
  });
}

const masterGain = (page: Page): Promise<number | null> =>
  page.evaluate(
    () => (window as unknown as { __masterGain: GainNode | null }).__masterGain?.gain.value ?? null,
  );

/** Drag the level slider to a percentage and read back what it says. */
async function setLevel(page: Page, percent: number): Promise<void> {
  await page.locator(MENU).click();
  await page.locator(VOLUME).fill(String(percent));
  // `fill` on a range input does not fire `input` in every engine; dispatching
  // it is what a drag would do and is what the component listens for.
  await page.locator(VOLUME).dispatchEvent('input');
  await page.locator(byTestId('menu-close')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();
}

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

test('the level reaches the master gain, and is remembered @mobile', async ({ page }) => {
  await watchMasterGain(page);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // A gesture, so there is a graph at all — before one there is no gain to read
  // and the autoplay policy says there must not be.
  await page.locator(byTestId('world-canvas')).click({ position: { x: 10, y: 10 } });
  await expect.poll(() => masterGain(page), { timeout: 5_000 }).toBeCloseTo(1, 5);

  await setLevel(page, 30);
  await expect.poll(() => masterGain(page), { timeout: 5_000 }).toBeCloseTo(0.3, 5);

  // And it survives the reload, which is the half of "remembered" that a
  // component's own state cannot fake.
  await page.reload({ waitUntil: 'load' });
  await ready(page);
  await page.locator(byTestId('world-canvas')).click({ position: { x: 10, y: 10 } });
  await expect.poll(() => masterGain(page), { timeout: 5_000 }).toBeCloseTo(0.3, 5);
  await page.locator(MENU).click();
  await expect(page.locator(byTestId('menu-volume-readout'))).toHaveText('30%');
  await page.locator(byTestId('menu-close')).click();
});

test('the level is not a mute, and mute is not a level @mobile', async ({ page }) => {
  await watchMasterGain(page);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await page.locator(byTestId('world-canvas')).click({ position: { x: 10, y: 10 } });
  await expect.poll(() => masterGain(page), { timeout: 5_000 }).toBeCloseTo(1, 5);

  // Muting suspends and leaves the gain where the settings left it.
  await page.locator(TOGGLE).click();
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'false');
  expect(await masterGain(page)).toBeCloseTo(1, 5);
  await page.locator(MENU).click();
  await expect(page.locator(byTestId('menu-volume-readout'))).toHaveText('Muted');
  // And the switch in the menu is the SAME state as the one in the top strip,
  // under the opposite name: "Mute", pressed when sound is off.
  await expect(page.locator(byTestId('menu-mute'))).toHaveAttribute('aria-pressed', 'true');
  await page.locator(byTestId('menu-mute')).click();
  await expect(page.locator(byTestId('menu-mute'))).toHaveAttribute('aria-pressed', 'false');
  await page.locator(byTestId('menu-close')).click();
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'true');

  // And a level of zero leaves the switch on: it is quiet, not off.
  await setLevel(page, 0);
  await expect.poll(() => masterGain(page), { timeout: 5_000 }).toBe(0);
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'true');
});

test('restore defaults puts back every remembered preference @mobile', async ({ page }) => {
  await watchMasterGain(page);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Move four of the five, on four different surfaces. The camera mode is the
  // fifth and is only reachable in cinematic mode, which is one of the four.
  const map = page.locator(byTestId('map-toggle'));
  const foldedToStart = (await map.getAttribute('aria-expanded')) === 'false';
  await map.click();
  await expect(map).toHaveAttribute('aria-expanded', String(foldedToStart));
  await page.locator(byTestId('cinematic-toggle')).click();
  await expect(page.locator(byTestId('cinematic-toggle'))).toHaveAttribute('aria-pressed', 'true');
  await page.locator(byTestId('camera-chase')).click();
  await expect(page.locator(byTestId('camera-chase'))).toHaveAttribute('aria-pressed', 'true');
  await page.locator(TOGGLE).click();
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'false');
  await setLevel(page, 15);

  await page.locator(MENU).click();
  await page.locator(byTestId('menu-restore-defaults')).click();
  await page.locator(byTestId('menu-close')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();

  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(byTestId('cinematic-toggle'))).toHaveAttribute('aria-pressed', 'false');
  /*
    THE MAP, NOW, not on the next load. It belongs to another component, so
    clearing its key is only half the job — without the reset broadcast it would
    hold the fold for the rest of the session and then silently change on the
    next visit, which is the worst thing this button could do.
  */
  await expect(map).toHaveAttribute('aria-expanded', String(!foldedToStart));
  await page.locator(byTestId('world-canvas')).click({ position: { x: 10, y: 10 } });
  await expect.poll(() => masterGain(page), { timeout: 5_000 }).toBeCloseTo(1, 5);

  // And it is the STORAGE that was cleared, not just the live state: a reload
  // is the only thing that tells those two apart.
  await page.reload({ waitUntil: 'load' });
  await ready(page);
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(byTestId('cinematic-toggle'))).toHaveAttribute('aria-pressed', 'false');
  await expect(map).toHaveAttribute('aria-expanded', String(!foldedToStart));
  await page.locator(MENU).click();
  await expect(page.locator(byTestId('menu-volume-readout'))).toHaveText('100%');
});
