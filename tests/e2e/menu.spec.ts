/**
 * M4.4: the menu in a browser.
 */
import { expect, test } from '@playwright/test';
import { ready } from './helpers';

async function openMenu(page: import('@playwright/test').Page) {
  await expect
    .poll(async () => (await page.locator('[data-testid="readout-altitude-value"]').textContent()) !== '', {
      timeout: 10_000,
    })
    .toBe(true);
  await page.locator('[data-testid="open-menu"]').click();
  await expect(page.locator('[data-testid="menu"]')).toBeVisible();
}

test('the menu opens, offers every preset, and closes', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  for (const id of [
    // M12.2. The pad is what `initBackEnd()` produces with no preset applied,
    // and until now the only ways to it were finishing the intro or reloading.
    'launch-pad',
    'booster-sep',
    'rtls',
    'reentry',
    'before-flip',
    'landing-burn',
    'circularize',
    'deorbit',
  ]) {
    await expect(page.locator(`[data-testid="preset-${id}"]`), id).toBeVisible();
  }

  await page.locator('[data-testid="menu-close"]').click();
  await expect(page.locator('[data-testid="menu"]')).toHaveCount(0);
});

test('a preset fills the form without flying it', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  await page.locator('[data-testid="preset-booster-sep"]').click();
  await expect(page.locator('[data-testid="field-altitude"]')).toHaveValue('70000');
  await expect(page.locator('[data-testid="field-speedX"]')).toHaveValue('1130');

  // tools.js:230 — the button fills the form. Nothing has flown yet. The intro
  // is still descending, so the altitude is not frozen; what matters is that it
  // is still the intro's couple of hundred metres and not the preset's 70 km.
  await page.waitForTimeout(500);
  await expect(page.locator('[data-testid="readout-altitude-unit"]')).toHaveText('M');

  await page.locator('[data-testid="menu-clear"]').click();
  await expect(page.locator('[data-testid="field-altitude"]')).toHaveValue('');
});

test('Configure starts the new flight and closes the menu', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  await page.locator('[data-testid="preset-booster-sep"]').click();
  await page.locator('[data-testid="menu-configure"]').click();

  await expect(page.locator('[data-testid="menu"]')).toHaveCount(0);

  // 70 km, so the altitude readout switches to kilometres.
  const altitude = page.locator('[data-testid="readout-altitude"]');
  await expect(altitude.locator('.unit')).toHaveText('KM', { timeout: 5_000 });
  await expect
    .poll(async () => Number(await altitude.locator('.value').textContent()), { timeout: 5_000 })
    .toBeGreaterThan(65);

  // And the tanks are the preset's 500 t, not what the intro left behind.
  await expect
    .poll(async () => Number(await page.locator('[data-testid="readout-propellant-value"]').textContent()))
    .toBe(500);
});

test('typing in the editor does not fire the engines', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  // eventListener.js:3 — `if (!showedMenuView)`. Every one of these characters
  // is bound to something in flight: r is RCS, f is fins, 1-3 are Raptors.
  //
  // The engines are lit during the intro, so "is it off" is the wrong question.
  // The right one is whether typing moved anything, and the fins and RCS are the
  // clean signals: the intro touches neither.
  const ids = ['rcs', 'fins', 'raptor-0', 'raptor-1', 'raptor-2'];
  const lit = async () =>
    Promise.all(
      ids.map(async (id) =>
        ((await page.locator(`[data-testid="${id}"]`).getAttribute('class')) ?? '').includes(
          'is-on',
        ),
      ),
    );

  const before = await lit();
  await page.locator('[data-testid="field-altitude"]').fill('31337');
  await page.keyboard.type('rf123');
  await page.waitForTimeout(400);

  expect(await lit()).toEqual(before);

  // And the keystrokes went where they were aimed: the field still has focus,
  // so the digits land in it and the letters are dropped by the number input.
  await expect(page.locator('[data-testid="field-altitude"]')).toHaveValue('31337123');
});

test('time warp changes how fast the flight runs', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  const rate = page.locator('[data-testid="menu-time-rate"]');
  await expect(rate).toHaveAttribute('min', '1');
  await expect(rate).toHaveAttribute('max', '9');

  await rate.fill('8');
  await expect(page.locator('[data-menu-readout="timeRate"]')).toHaveText('8x');

  await page.locator('[data-testid="menu-time-direction"]').click();
  await expect(page.locator('[data-menu-readout="timeRate"]')).toHaveText('1/8x');
});

test('the random-failure toggle lights and persists into a new flight', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  const toggle = page.locator('[data-testid="menu-random-failure"]');
  await expect(toggle).not.toHaveClass(/is-on/);
  await toggle.click();
  await expect(toggle).toHaveClass(/is-on/);

  await page.locator('[data-testid="preset-landing-burn"]').click();
  await page.locator('[data-testid="menu-configure"]').click();
  await page.locator('[data-testid="open-menu"]').click();

  // A configured flight is a fresh state; the setting must survive it.
  await expect(page.locator('[data-testid="menu-random-failure"]')).toHaveClass(/is-on/);
});

test('a hand-typed flight configures and flies @mobile', async ({ page }) => {
  /*
    M6.7. The editor's whole purpose is typing values into an empty form, and
    that path threw `e.trim is not a function` from M4.4 until it was found —
    `bind:value` on `<input type="number">` returns a NUMBER, and
    `fieldsToPreset` trimmed it. `onConfigure` died before `menuOpen = false`,
    so the symptom was a menu that would not close and a flight that did not
    change, with nothing said about why.

    Every existing configure test pressed a PRESET first, which fills the boxes
    with real strings — so the suite covered the path that worked and not the
    one that did not. This is that path, and it asserts the two things the bug
    took away: the menu closes, and the vehicle is where it was asked to be.
  */
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await page.locator('[data-testid="open-menu"]').click();

  await page.locator('[data-testid="field-altitude"]').fill('9000');
  await page.locator('[data-testid="field-speedY"]').fill('-40');
  await page.locator('[data-testid="field-propellant"]').fill('120');
  await page.locator('[data-testid="menu-configure"]').click();

  // The menu closes, which it could not do while onConfigure was throwing.
  await expect(page.locator('[data-testid="menu"]')).toHaveCount(0);

  // And the flight is the one that was asked for: 9 km, falling, 120 tonnes.
  await expect
    .poll(
      async () =>
        Number(await page.locator('[data-testid="readout-altitude-value"]').textContent()),
      { timeout: 5_000 },
    )
    .toBeGreaterThan(8);
  await expect
    .poll(async () =>
      Number(await page.locator('[data-testid="readout-propellant-value"]').textContent()),
    )
    .toBe(120);

  expect(errors, 'configuring must not throw').toEqual([]);
});


/* ── M12.2: the two the simulation had and the form did not ─────────────── */

test('the Launch Pad preset flies the flight the game starts you on', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  await page.locator('[data-testid="preset-launch-pad"]').click();
  /*
    350 tonnes and 25 metres. Both numbers are the vehicle rather than anything
    typed: the altitude is `vehicleHeight / 2`, which is a Starship standing on
    its own feet, and 350 t is `constants.propellantMass`, the load it spawns
    with and the one the propellant bar draws as a full tank. (It is not the
    1200 t the editor will accept — that is `PROPELLANT_CAPACITY`, the tanks'
    geometric volume from M11.8. Two different fulls, and this is the ship's.)
  */
  await expect(page.locator('[data-testid="field-propellant"]')).toHaveValue('350');
  await expect(page.locator('[data-testid="field-altitude"]')).toHaveValue('25');

  await page.locator('[data-testid="menu-configure"]').click();
  await expect(page.locator('[data-testid="menu"]')).toHaveCount(0);

  await expect
    .poll(async () => Number(await page.locator('[data-testid="readout-propellant-value"]').textContent()), {
      timeout: 10_000,
    })
    .toBe(350);
  // Standing still on the pad, which is the point of the button.
  expect(Number(await page.locator('[data-testid="readout-altitude-value"]').textContent())).toBeLessThan(30);
});

test('a preset leaves wind and hour blank, and they survive a Clear', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await openMenu(page);

  await page.locator('[data-testid="preset-landing-burn"]').click();
  // Blank means "as this scenario has it" — calm air, and the hour the sun
  // table gives. A preset that printed 0 and 9.5 here would make the default
  // something the player has to clear.
  await expect(page.locator('[data-testid="field-wind"]')).toHaveValue('');
  await expect(page.locator('[data-testid="field-launchHour"]')).toHaveValue('');

  await page.locator('[data-testid="field-wind"]').fill('10');
  await page.locator('[data-testid="menu-clear"]').click();
  await expect(page.locator('[data-testid="field-wind"]')).toHaveValue('');
});

test('the headwind flight is reachable from the menu, and the air knows', async ({ page }) => {
  /*
    M11.1 wired the wind through every aerodynamic term and left it reachable
    only from a test: `landing-burn-headwind` is a golden fixture no player
    could fly. This is that flight, typed.

    THE OBSERVABLE IS THE HORIZONTAL SPEED, and picking it took a measurement.
    Dynamic pressure was the obvious choice and is the wrong one: the first
    version asserted that a headwind raises it, and the simulation says it FALLS
    — 1.75 kPa against 1.69 at two seconds — because the extra drag also slows
    the descent, and the readout's one decimal place swallowed what was left.

    H/S is unambiguous. This vehicle starts with no downrange speed and nothing
    in calm air can give it any; drag from moving air can, and does, monotonically
    — 0.00 m/s throughout with no wind, against 0.68, 1.45, 2.22, 2.96 at each
    half second with ten. Read off the HUD at a matched moment of the
    SIMULATION's clock, because two runs of the same descent are only comparable
    at the same time of flight.

    THE READOUT CANNOT SHOW A ZERO, which is worth knowing before reading the
    assertion below. `readouts.ts` renders H/S as `Math.ceil(speedX)` — 2021's
    own rounding, ported deliberately — so the calm flight's residual of about
    1e-15 m/s displays as 1, not 0. The comparison is therefore between the two
    numbers rather than against zero, and the gap is wide enough that the
    rounding cannot manufacture it: 1 against 4.
  */
  const driftAt = async (wind: string): Promise<number> => {
    await page.goto('/', { waitUntil: 'load' });
    await ready(page);
    await openMenu(page);
    await page.locator('[data-testid="preset-landing-burn"]').click();
    if (wind !== '') await page.locator('[data-testid="field-wind"]').fill(wind);
    await page.locator('[data-testid="menu-configure"]').click();
    await expect(page.locator('[data-testid="menu"]')).toHaveCount(0);

    const clock = page.locator('[data-testid="readout-clock-value"]');
    const seconds = async () => {
      const text = (await clock.textContent()) ?? '';
      return text
        .trim()
        .split(':')
        .map(Number)
        .reduce((total, part) => total * 60 + (Number.isFinite(part) ? part : 0), 0);
    };
    /*
      WAIT FOR THE NEW FLIGHT'S CLOCK, NOT JUST A BIG ONE. The intro has been
      running since the page loaded, so by the time Configure is pressed the
      readout already says eight seconds or more — and a poll for "at least two"
      is satisfied by that stale value before the restart has even reached the
      DOM. The first version of this read the INTRO's horizontal speed and
      reported 1 m/s of drift in air that was not moving.
    */
    await expect.poll(seconds, { timeout: 30_000, intervals: [100] }).toBeLessThan(2);
    await expect.poll(seconds, { timeout: 30_000, intervals: [100] }).toBeGreaterThanOrEqual(2);
    return Number(await page.locator('[data-testid="readout-speedX-value"]').textContent());
  };

  const calm = await driftAt('');
  const headwind = await driftAt('10');
  const report = `calm ${calm} m/s vs headwind ${headwind} m/s`;
  expect(calm, report).toBeLessThanOrEqual(1);
  expect(headwind, report).toBeGreaterThanOrEqual(calm + 2);
});
