# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: short-landscape-hud.spec.ts >> short booster strip leaves a usable world and expanded rails below readable instruments @mobile
- Location: tests/e2e/short-landscape-hud.spec.ts:11:1

# Error details

```
Error: folded strip height follows the declared instrument geometry budget

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 152
Received:    159.5
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic:
      - banner [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: Starship
          - generic [ref=e8]: Booster Sep
          - generic [ref=e9]: Manual
        - generic [ref=e10]:
          - generic [ref=e11]: T+
          - generic [ref=e12]: 00:00:00
        - generic [ref=e13]:
          - button "Pause" [ref=e14]:
            - text: Pause
            - generic [ref=e15]: P
          - button "Cinematic" [ref=e17]
          - button "Sound" [pressed] [ref=e24]
          - button "Black box" [ref=e30]
          - button "Menu" [ref=e34]:
            - text: Menu
            - generic [ref=e35]: Esc
      - region "Flight data" [ref=e37]:
        - generic [ref=e38]:
          - status [ref=e40]:
            - generic [ref=e41]: PRE-FLIGHT
            - generic [ref=e42]: → BOOSTBACK
          - button "Details" [ref=e43]
        - status [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: Altitude
              - generic [ref=e52]:
                - generic [ref=e53]: "70.0"
                - generic [ref=e54]: KM
            - generic [ref=e58]:
              - generic [ref=e59]: V/S
              - generic [ref=e62]:
                - generic [ref=e63]: "1130"
                - generic [ref=e64]: M/S
            - generic [ref=e65]:
              - generic [ref=e66]: Speed
              - generic [ref=e69]:
                - generic [ref=e70]: "1.6"
                - generic [ref=e71]: KM/S
          - generic [ref=e75]:
            - generic [ref=e77]:
              - generic [ref=e78]: Propellant
              - generic [ref=e79]:
                - generic [ref=e80]: CH4
                - generic [ref=e85]: LOX
              - generic [ref=e90]:
                - generic [ref=e91]: "500"
                - generic [ref=e92]: T
            - generic [ref=e93]:
              - generic [ref=e94]: Attitude
              - generic [ref=e99]:
                - generic [ref=e100]: "45"
                - generic [ref=e101]: °
          - generic [ref=e103]:
            - generic [ref=e104]:
              - generic [ref=e105]: Centre · 3
              - generic [ref=e106]: 0 lit · 0 start · 0 fail
            - generic [ref=e107]:
              - generic [ref=e108]: Inner · 10
              - generic [ref=e109]: 0 lit · 0 start · 0 fail
            - generic [ref=e110]:
              - generic [ref=e111]: Outer · 20
              - generic [ref=e112]: 0 lit · 0 start · 0 fail
      - region "Trajectory map" [ref=e113]:
        - button "Trajectory" [ref=e114]
      - generic [ref=e117]:
        - region "Engines" [ref=e118]:
          - button "Engines controls" [ref=e120]:
            - generic [ref=e121]: Engines
        - region "Flight" [ref=e124]:
          - generic [ref=e125]:
            - button "Flight controls" [ref=e126]:
              - generic [ref=e127]: Flight
            - button "Zoom out" [ref=e130]:
              - generic [ref=e131]: −
            - button "Zoom in" [ref=e132]:
              - generic [ref=e133]: +
  - button "select to enable accessibility for this content" [ref=e134]
```

# Test source

```ts
  1  | /** Narrow Phase9 bring-forward: actual booster instrument/rail/world zones. */
  2  | import { expect, test } from '@playwright/test';
  3  | import type { SimDebug } from '../../src/app/debug';
  4  | import { SHORT_LANDSCAPE } from '../../src/ui/shell/layout-queries';
  5  | 
  6  | // Declared geometry before implementation:44px header +56px instruments +20px
  7  | // engine status +16px row gaps +16px vertical padding. No measured-pass fit.
  8  | const FOLDED_STRIP_BUDGET = 152;
  9  | const RAIL_CLEARANCE = 16;
  10 | 
  11 | test('short booster strip leaves a usable world and expanded rails below readable instruments @mobile', async ({ page }, info) => {
  12 |   await page.goto('/?debug=1');
  13 |   test.skip(!await page.evaluate(q => window.matchMedia(q).matches, SHORT_LANDSCAPE), 'short landscape layout only');
  14 |   await page.waitForFunction(() => '__simDebug' in window);
  15 |   await page.evaluate(() => {
  16 |     const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  17 |     debug.pause(); debug.setScenario('booster-sep');
  18 |   });
  19 |   const hud = page.getByRole('region', { name: 'Flight data' });
  20 |   await expect(hud.getByTestId('hud-toggle')).toHaveAttribute('aria-expanded', 'false');
  21 |   await expect(hud.getByTestId('readout-altitude-value')).not.toHaveText('');
  22 |   for (const id of ['altitude', 'speedY', 'speed', 'propellant', 'pitch']) {
  23 |     await expect(hud.getByTestId(`readout-${id}`)).toBeVisible();
  24 |     await expect(hud.getByTestId(`readout-${id}-value`)).not.toHaveText('');
  25 |   }
  26 |   for (const label of ['Centre · 3', 'Inner · 10', 'Outer · 20']) await expect(hud.getByText(label, { exact: true })).toBeVisible();
  27 |   for (const group of ['centre', 'inner', 'outer']) {
  28 |     const status = hud.locator(`[data-engine-group="${group}"]`);
  29 |     await expect(status).toBeVisible();
  30 |     await expect(status).toContainText('lit');
  31 |     await expect(status).toContainText('start');
  32 |     await expect(status).toContainText('fail');
  33 |   }
  34 |   const zone = await hud.boundingBox();
> 35 |   expect(zone!.height, 'folded strip height follows the declared instrument geometry budget').toBeLessThanOrEqual(FOLDED_STRIP_BUDGET);
     |                                                                                               ^ Error: folded strip height follows the declared instrument geometry budget
  36 |   const world = await page.getByTestId('world-canvas').boundingBox();
  37 |   expect(world!.y, 'world remains below every primary instrument').toBeGreaterThanOrEqual(zone!.y + zone!.height - 1);
  38 |   expect(world!.height, 'world gets remaining viewport below the declared strip budget').toBeGreaterThanOrEqual(page.viewportSize()!.height - zone!.y - FOLDED_STRIP_BUDGET - 1);
  39 |   for (const [toggle, name] of [['engine-panel-toggle', 'Engines'], ['yoke-panel-toggle', 'Flight']] as const) {
  40 |     await page.getByTestId(toggle).click();
  41 |     const rail = page.getByRole('region', { name, exact: true });
  42 |     const box = await rail.boundingBox();
  43 |     expect(box!.y, `${name} rail clears the whole HUD`).toBeGreaterThanOrEqual(zone!.y + zone!.height + RAIL_CLEARANCE - 1);
  44 |     expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  45 |     if (name === 'Engines') for (const group of ['centre', 'inner', 'outer']) {
  46 |       const button = page.getByTestId(`engine-group-${group}`);
  47 |       await button.scrollIntoViewIfNeeded(); await expect(button).toBeVisible();
  48 |       const bounds = await button.boundingBox();
  49 |       const touch = await page.evaluate(() => window.matchMedia('(any-pointer: coarse), (any-pointer: none)').matches);
  50 |       expect(bounds!.height).toBeGreaterThanOrEqual(touch ? 43.5 : 31.5);
  51 |     }
  52 |     await page.getByTestId(toggle).click();
  53 |   }
  54 |   await page.screenshot({ path: info.outputPath('short-flight-strip.png') });
  55 | });
  56 | 
```