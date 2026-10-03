# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staging.spec.ts >> both real staging bodies render and selection preserves the shared paused clock @mobile
- Location: tests/e2e/staging.spec.ts:12:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('status').filter({ hasText: /^Attached$/ })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('status').filter({ hasText: /^Attached$/ })

```

```yaml
- banner:
  - text: Starship Hot staging Manual T+ 00:00:01
  - button "Pause"
  - button "Cinematic"
  - button "Sound" [pressed]
  - button "Black box"
  - button "Menu"
- region "Flight data":
  - status: SEPARATION→ MECO
  - button "Details" [expanded]
  - status: Altitude Dial range 100KM 72.0 KM Vertical speed 1120 M/S Speed Dial range 2KM/S 1.6 KM/S Propellant 1197 T Engines Attitude 45 ° H/S 1136 M/S Mach 5.43 Q 0.1 KPA G 1.1 TWR 1.1 Throttle 100 % Heat 487 K Range 47.0 KM
- region "Trajectory map":
  - button "Trajectory" [expanded]
- region "Engines":
  - button "Engines controls" [expanded]: Engines
  - button "Engines" [pressed]
  - group "Sea-level engines":
    - button "Sea-level engine 1" [pressed]
    - button "Sea-level engine 2" [pressed]
    - button "Sea-level engine 3" [pressed]
  - group "Vacuum engines":
    - button "Vacuum engine 1" [pressed]
    - button "Vacuum engine 2" [pressed]
    - button "Vacuum engine 3" [pressed]
  - text: Throttle
  - slider "Throttle": "100"
  - button "Throttle guard"
  - text: Throttles back to keep the speed under the safe dynamic-pressure limit.
- region "Flight":
  - button "Flight controls" [expanded]: Flight
  - button "Zoom out"
  - button "Zoom in"
  - tablist "Vehicle to fly":
    - tab "Ship" [selected]
    - tab "Super Heavy"
  - status: Separated
  - text: Attitude
  - slider "Attitude": "0"
  - group "Autopilot":
    - button "Manual" [pressed]
    - button "Lift off"
    - button "Boost back"
    - button "Hold attitude"
    - button "Land"
    - button "Deorbit"
  - group "Systems":
    - button "Fins"
    - button "Reaction control" [pressed]
    - button "Dump propellant"
```

# Test source

```ts
  1  | /** Actual production scene and canonical two-body clock, on all five viewports. */
  2  | import { expect, test, type Page } from '@playwright/test';
  3  | import type { SimDebug } from '../../src/app/debug';
  4  | import { byTestId } from '../../src/ui/testids';
  5  | import { ready, tap, openYoke } from './helpers';
  6  | 
  7  | const presentation = (page: Page) => page.evaluate(() =>
  8  |   (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation());
  9  | const telemetry = (page: Page) => page.evaluate(() =>
  10 |   (window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry());
  11 | 
  12 | test('both real staging bodies render and selection preserves the shared paused clock @mobile', async ({ page }, info) => {
  13 |   await page.goto('/?debug=1');
  14 |   await ready(page);
  15 |   await page.locator(byTestId('open-menu')).click();
  16 |   await page.locator(byTestId('start-hot-stage')).click();
  17 |   await expect(page.locator(byTestId('menu'))).toBeHidden();
  18 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.pause());
  19 |   await openYoke(page);
  20 |   await expect(page.getByRole('status').filter({ hasText: /^Attached$/ })).toBeVisible();
  21 |   await expect.poll(async () => (await presentation(page)).bodies?.map(body => body.id)).toEqual(['starship', 'super-heavy']);
  22 |   // No Stage is a positive negative control: real fixed steps keep attachment
  23 |   // and do not manufacture Ship ignition or separation.
  24 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.step(32));
  25 |   await expect(page.getByRole('status').filter({ hasText: /^Attached$/ })).toBeVisible();
  26 |   expect((await telemetry(page))['engines.running[0]']).toBe(false);
  27 |   await tap(page, 'stage');
  28 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.step(180));
  29 |   await expect(page.getByRole('status').filter({ hasText: /^Separated$/ })).toBeVisible();
  30 |   await expect.poll(async () => (await presentation(page)).bell?.visibleMounts).toBe(6);
  31 |   const ship = await telemetry(page);
  32 |   const renderedShip = (await presentation(page)).bodies!.find(body => body.id === 'starship')!;
  33 |   await tap(page, 'select-super-heavy');
  34 |   await expect.poll(async () => (await presentation(page)).bell?.visibleMounts).toBe(3);
  35 |   const booster = await telemetry(page);
  36 |   expect(booster['world.environmentTime']).toBe(ship['world.environmentTime']);
  37 |   expect(booster['kinematics.altitude']).not.toBe(ship['kinematics.altitude']);
  38 |   expect(booster['vehicle.propellantMass']).not.toBe(ship['vehicle.propellantMass']);
  39 |   expect(booster['engines.running[32]']).toBe(false);
  40 |   // Group readouts have their own row and stay within the HUD on a phone.
  41 |   const groupBounds = await page.getByRole('region', { name: 'Flight data' }).locator('[data-engine-group]').evaluateAll(nodes =>
  42 |     nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; }));
  43 |   expect(groupBounds).toHaveLength(3);
  44 |   for (let i = 1; i < groupBounds.length; i++) expect(groupBounds[i]!.left).toBeGreaterThanOrEqual(groupBounds[i - 1]!.right);
  45 |   const rendered = await presentation(page);
  46 |   expect(rendered.bodies).toHaveLength(2);
  47 |   expect(rendered.bodies!.find(body => body.id === 'super-heavy')!.y).not.toBe(rendered.bodies!.find(body => body.id === 'starship')!.y);
  48 |   expect(renderedShip.height).toBeGreaterThan(0);
  49 |   const clearFrame = await page.locator(byTestId('world-canvas')).boundingBox();
  50 |   const hud = await page.getByRole('region', { name: 'Flight data' }).boundingBox();
  51 |   expect(clearFrame!.y).toBeGreaterThanOrEqual(hud!.y + hud!.height - 1);
  52 |   for (const body of rendered.bodies!) {
  53 |     expect(body.y).toBeGreaterThan(0);
  54 |     expect(body.y).toBeLessThan(rendered.height);
  55 |   }
  56 |   // Selection itself cannot step either body. The actual fixed clock remains
  57 |   // paused through repeated input and a real browser frame.
  58 |   await page.screenshot({ path: info.outputPath('staged-both-bodies.png') });
  59 |   expect(await telemetry(page)).toEqual(booster);
  60 |   await tap(page, 'select-ship');
  61 |   expect(await telemetry(page)).toEqual(ship);
  62 |   await expect(page.locator(byTestId('event-now'))).toHaveText('SEPARATION');
  63 |   await page.keyboard.press('R');
> 64 |   await expect(page.getByRole('status').filter({ hasText: /^Attached$/ })).toBeVisible();
     |                                                                            ^ Error: expect(locator).toBeVisible() failed
  65 |   await expect.poll(async () => (await presentation(page)).bell?.visibleMounts).toBe(0);
  66 |   const restarted = await telemetry(page);
  67 |   expect(restarted['world.environmentTime']).toBe(0);
  68 |   expect(restarted['engines.running[0]']).toBe(false);
  69 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setScenario('rtls'));
  70 |   await expect.poll(async () => (await presentation(page)).bodies?.map(body => body.id)).toEqual(['super-heavy']);
  71 |   await expect(page.locator(byTestId('select-ship'))).toHaveCount(0);
  72 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setScenario('landing-burn'));
  73 |   await expect.poll(async () => (await presentation(page)).bodies?.map(body => body.id)).toEqual(['starship']);
  74 |   await expect.poll(async () => (await presentation(page)).bell?.visibleMounts).toBe(0);
  75 | });
  76 | 
```