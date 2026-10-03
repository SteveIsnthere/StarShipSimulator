# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: booster-catch.spec.ts >> rtls actually returns to an airborne tower catch @mobile
- Location: tests/e2e/booster-catch.spec.ts:9:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-testid="restart"]')
    - locator resolved to <button data-testid="restart" data-variant="primary" data-control="restart" class="ui-target inline-flex items-center justify-center rounded-ui-control depress transition-colors duration-100 select-none px-3.5 text-[12px] gap-2 border border-ui-line bg-ui-selected text-ui-on-selected hover:bg-ui-muted font-semibold absolute top-[calc(var(--hud-bottom,220px)+12px)] left-1/2 -translate-x-1/2">Fly again</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button data-variant="ghost" aria-expanded="false" aria-controls="_r_1_" data-testid="map-toggle" class="ui-target inline-flex items-center rounded-ui-control depress transition-colors duration-100 select-none px-2.5 text-[11px] border-transparent bg-transparent hover:border-ui-line hover:text-ui-fg justify-between gap-3 border-0 font-tight font-semibold uppercase tracking-[0.14em] text-ui-muted">…</button> from <section aria-label="Trajectory map" data-testid="trajectory-map" class="ui-safe-margins absolute z-10 flex flex-col border border-flight-backing-line bg-flight-backing left-1/2 -translate-x-1/2 top-[calc(var(--hud-bottom,220px)+8px)]">…</section> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button data-variant="ghost" aria-expanded="false" aria-controls="_r_1_" data-testid="map-toggle" class="ui-target inline-flex items-center rounded-ui-control depress transition-colors duration-100 select-none px-2.5 text-[11px] border-transparent bg-transparent hover:border-ui-line hover:text-ui-fg justify-between gap-3 border-0 font-tight font-semibold uppercase tracking-[0.14em] text-ui-muted">…</button> from <section aria-label="Trajectory map" data-testid="trajectory-map" class="ui-safe-margins absolute z-10 flex flex-col border border-flight-backing-line bg-flight-backing left-1/2 -translate-x-1/2 top-[calc(var(--hud-bottom,220px)+8px)]">…</section> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    48 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <button data-variant="ghost" aria-expanded="false" aria-controls="_r_1_" data-testid="map-toggle" class="ui-target inline-flex items-center rounded-ui-control depress transition-colors duration-100 select-none px-2.5 text-[11px] border-transparent bg-transparent hover:border-ui-line hover:text-ui-fg justify-between gap-3 border-0 font-tight font-semibold uppercase tracking-[0.14em] text-ui-muted">…</button> from <section aria-label="Trajectory map" data-testid="trajectory-map" class="ui-safe-margins absolute z-10 flex flex-col border border-flight-backing-line bg-flight-backing left-1/2 -translate-x-1/2 top-[calc(var(--hud-bottom,220px)+8px)]">…</section> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic:
      - banner [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: Starship
          - generic [ref=e8]: RTLS
          - generic [ref=e9]:
            - generic [ref=e10]: Autopilot ·
            - text: Catch
        - generic [ref=e11]:
          - generic [ref=e12]: T+
          - generic [ref=e13]: 00:02:00
        - generic [ref=e14]:
          - button "Pause" [ref=e15]:
            - text: Pause
            - generic [ref=e16]: P
          - button "Cinematic" [ref=e18]
          - button "Sound" [pressed] [ref=e25]
          - button "Black box" [ref=e31]
          - button "Menu" [ref=e35]:
            - text: Menu
            - generic [ref=e36]: Esc
      - region "Flight data" [ref=e38]:
        - generic [ref=e39]:
          - status [ref=e41]:
            - generic [ref=e42]: CAUGHT
          - button "Details" [ref=e43]
        - status [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: Altitude
              - generic [ref=e52]:
                - generic [ref=e53]: "91"
                - generic [ref=e54]: M
            - generic [ref=e58]:
              - generic [ref=e59]: V/S
              - generic [ref=e62]:
                - generic [ref=e63]: "0"
                - generic [ref=e64]: M/S
            - generic [ref=e65]:
              - generic [ref=e66]: Speed
              - generic [ref=e69]:
                - generic [ref=e70]: "0"
                - generic [ref=e71]: M/S
          - generic [ref=e74]:
            - generic [ref=e76]:
              - generic [ref=e77]: Propellant
              - generic [ref=e78]:
                - generic [ref=e79]: CH4
                - generic [ref=e84]: LOX
              - generic [ref=e89]:
                - generic [ref=e90]: "90"
                - generic [ref=e91]: T
            - generic [ref=e92]:
              - generic [ref=e93]: Attitude
              - generic [ref=e98]:
                - generic [ref=e99]: "0"
                - generic [ref=e100]: °
          - generic [ref=e101]:
            - generic [ref=e102]:
              - generic [ref=e103]: Centre · 3
              - generic [ref=e104]: 0 lit · 0 start · 0 fail
            - generic [ref=e105]:
              - generic [ref=e106]: Inner · 10
              - generic [ref=e107]: 0 lit · 0 start · 0 fail
            - generic [ref=e108]:
              - generic [ref=e109]: Outer · 20
              - generic [ref=e110]: 0 lit · 0 start · 0 fail
      - region "Trajectory map" [ref=e111]:
        - button "Trajectory" [ref=e112]
      - generic [ref=e115]:
        - region "Engines" [ref=e116]:
          - button "Engines controls" [ref=e118]:
            - generic [ref=e119]: Engines
        - region "Flight" [ref=e122]:
          - generic [ref=e123]:
            - button "Flight controls" [expanded] [ref=e124]:
              - generic [ref=e125]: Flight
            - button "Zoom out" [ref=e128]:
              - generic [ref=e129]: −
            - button "Zoom in" [ref=e130]:
              - generic [ref=e131]: +
          - generic [ref=e133]:
            - generic [ref=e134]: Super Heavy
            - generic [ref=e135]:
              - generic [ref=e136]:
                - generic [ref=e137]: Attitude
                - generic [ref=e138]: Centre
              - slider "Attitude" [ref=e139] [cursor=pointer]: "0"
            - group "Autopilot" [ref=e140]:
              - button "Manual" [ref=e141]
              - button "Lift off" [ref=e142]
              - button "Boost back" [ref=e143]
              - button "Hold attitude" [ref=e144]
              - button "Catch" [pressed] [ref=e145]
              - button "Deorbit" [disabled] [ref=e146]
            - group "Systems" [ref=e147]:
              - button "Fins" [pressed] [ref=e148]
              - button "Reaction control" [pressed] [ref=e149]
              - button "Dump propellant" [ref=e150]
      - button "Fly again" [ref=e151]
  - button "select to enable accessibility for this content" [ref=e152]
```

# Test source

```ts
  1  | /** Original scenario flights use real selected-model fixed steps, without overrides. */
  2  | import { expect, test } from '@playwright/test';
  3  | import type { Deg } from '../../src/core/units';
  4  | import type { SimDebug } from '../../src/app/debug';
  5  | import { byTestId } from '../../src/ui/testids';
  6  | import { ready, tap } from './helpers';
  7  | 
  8  | for (const id of ['booster-sep', 'rtls']) {
  9  |   test(`${id} actually returns to an airborne tower catch @mobile`, async ({ page }, info) => {
  10 |     await page.goto('/?debug=1'); await ready(page);
  11 |     await page.evaluate(id => {
  12 |       const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  13 |       debug.pause(); debug.setScenario(id);
  14 |     }, id);
  15 |     await tap(page, 'auto-land');
  16 |     // Existing900s flight bound; every step follows the canonical controller.
  17 |     // No synthetic terminal state or success retry.
  18 |     const result = await page.evaluate(() => {
  19 |       const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  20 |       let ticks = 0;
  21 |       for (; ticks < 108000; ticks++) {
  22 |         debug.step(1);
  23 |         const values = debug.telemetry();
  24 |         if (values['status.landed'] || values['failures.crashed'] || values['failures.inFlightBreakUp']) break;
  25 |       }
  26 |       return { ticks: ticks + 1, values: debug.telemetry() };
  27 |     });
  28 |     expect(result.ticks).toBeLessThan(108000);
  29 |     expect(result.values['status.landed']).toBe(true);
  30 |     expect(result.values['status.onTheGround']).toBe(false);
  31 |     expect(result.values['failures.crashed']).toBe(false);
  32 |     expect(result.values['failures.inFlightBreakUp']).toBe(false);
  33 |     expect(result.values['vehicle.propellantMass']).toBeGreaterThan(0);
  34 |     await expect(page.locator(byTestId('debrief'))).toHaveAttribute('data-outcome', 'CAUGHT');
  35 |     await expect(page.locator(byTestId('debrief-outcome'))).toHaveText('Caught');
  36 |     await expect(page.locator(byTestId('debrief-vertical'))).toHaveCount(0);
  37 |     await expect(page.locator(byTestId('debrief-propellant'))).toContainText('3400 t');
  38 |     await expect(page.locator(byTestId('event-now'))).toHaveText('CAUGHT');
  39 |     await page.screenshot({ path: info.outputPath(`${id}-caught.png`) });
  40 |     await info.attach('real-catch-telemetry', { body: JSON.stringify(result), contentType: 'application/json' });
  41 |     await page.locator(byTestId('debrief-close')).click();
  42 |     await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  43 |     // Wait for a real RAF: the dismissed report must remain closed.
  44 |     await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  45 |     await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  46 |     await page.screenshot({ path: info.outputPath(`${id}-caught-dismissed.png`) });
> 47 |     await page.locator(byTestId('restart')).click();
     |                                             ^ Error: locator.click: Test timeout of 60000ms exceeded.
  48 |     const restarted = await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry());
  49 |     expect(restarted['status.landed']).toBe(false);
  50 |     expect(restarted['engines.running[32]']).toBe(false);
  51 |     expect(restarted['vehicle.propellantMass']).toBe(id === 'booster-sep' ? 500000 : 200000);
  52 |     await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  53 |   });
  54 | }
  55 | 
  56 | test('a lug beyond the catch box cannot announce a caught booster @mobile', async ({ page }) => {
  57 |   await page.goto('/?debug=1'); await ready(page);
  58 |   const values = await page.evaluate(() => {
  59 |     const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  60 |     debug.pause();
  61 |     debug.setScenario('rtls', { altitude: 90.501, xPosition: 3, speedX: 0, speedY: -1, pitch: 0 as Deg });
  62 |     debug.step(1);
  63 |     return debug.telemetry();
  64 |   });
  65 |   expect(values['status.landed']).toBe(false);
  66 |   await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  67 |   await expect(page.locator(byTestId('event-now'))).not.toHaveText('CAUGHT');
  68 | });
  69 | 
```