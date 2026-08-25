/**
 * M6.4: cinematic mode.
 *
 * The deliberate departure from the reference, and its reversal. SpaceX never
 * shows a button because a broadcast viewer cannot press anything; this is a
 * cockpit, so the controls exist as a second layer in the same visual language.
 * Turning that layer off leaves exactly the broadcast.
 *
 * Three things have to hold, and only a browser can show any of them: the
 * controls actually go away, they come back working (not frozen at whatever
 * state they left in — the binder holds those nodes), and the choice survives a
 * reload.
 */
import { expect, test } from '@playwright/test';
import { byTestId, readoutValueTestId } from '../../src/ui/testids';
import { openControls, ready } from './helpers';

test('it defaults off — this is a cockpit first', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await openControls(page);
  await expect(page.locator(byTestId('all-raptors'))).toBeVisible();
  await expect(page.locator(byTestId('cinematic-toggle'))).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('it hides the controls layer and leaves the broadcast', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator(byTestId('cinematic-toggle')).click();

  // The controls layer is gone…
  await expect(page.locator(byTestId('all-raptors'))).not.toBeVisible();
  await expect(page.locator(byTestId('yoke-pitch'))).not.toBeVisible();

  // …and everything that IS the broadcast stays.
  await expect(page.locator(byTestId('readout-speed'))).toBeVisible();
  await expect(page.locator(byTestId('readout-altitude'))).toBeVisible();
  await expect(page.locator(byTestId('timeline'))).toBeVisible();
  await expect(page.locator(byTestId(readoutValueTestId('clock')))).toBeVisible();
});

test('the hidden controls keep tracking the simulation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Hidden, not unmounted. The indicator binder resolved these nodes once and
  // holds them; unmounting would leave it writing into orphans and the panel
  // would come back frozen at whatever state it left in.
  const raptor = page.locator(byTestId('raptor-0'));
  const litNow = async () =>
    ((await raptor.getAttribute('class')) ?? '').includes('is-on');

  await page.locator(byTestId('cinematic-toggle')).click();
  await expect(raptor).not.toBeVisible();

  // The intro shuts engines off and on all the way down, so the hidden node's
  // state must change while it is out of sight.
  const before = await litNow();
  await expect.poll(litNow, { timeout: 20_000, intervals: [100] }).toBe(!before);

  await page.locator(byTestId('cinematic-toggle')).click();
  await expect(raptor).toBeVisible();
});

test('a hidden control cannot be clicked, by keyboard or by pointer', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator(byTestId('cinematic-toggle')).click();

  // `visibility: hidden` plus `inert`: out of hit-testing, out of the tab
  // order, out of the accessibility tree. A layer that is invisible but still
  // focusable is a trap — you tab into a panel you cannot see.
  await expect(page.locator(byTestId('all-raptors'))).not.toBeVisible();
  const focusable = await page.locator(byTestId('all-raptors')).evaluate((el) => {
    el.focus();
    return document.activeElement === el;
  });
  expect(focusable).toBe(false);
});

test('the choice is remembered across a reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator(byTestId('cinematic-toggle')).click();
  await expect(page.locator(byTestId('all-raptors'))).not.toBeVisible();

  await page.reload({ waitUntil: 'load' });
  await ready(page);

  await expect(page.locator(byTestId('cinematic-toggle'))).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(byTestId('all-raptors'))).not.toBeVisible();

  // And back off again, so the test leaves no residue for whatever runs next
  // in this browser context.
  await page.locator(byTestId('cinematic-toggle')).click();
  await expect(page.locator(byTestId('all-raptors'))).toBeVisible();
});

test('it survives a browser that refuses site data', async ({ page, context }) => {
  // A private window, or a browser set to block storage, THROWS on
  // localStorage access rather than returning null. A simulator that will not
  // start because it could not remember a preference would be a poor trade.
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator(byTestId('cinematic-toggle')).click();
  await expect(page.locator(byTestId('all-raptors'))).not.toBeVisible();

  expect(errors, 'blocked storage must not throw into the page').toEqual([]);
});
