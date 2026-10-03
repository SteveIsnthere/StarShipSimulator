# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: emissive-bell.spec.ts >> scene resets, pauses and hides continuous gas with its particle detail @mobile
- Location: tests/e2e/emissive-bell.spec.ts:6:1

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 240
Received:   237

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic:
      - banner [ref=e5]:
        - generic [ref=e6]: Manual
        - generic [ref=e8]:
          - generic [ref=e9]: T+
          - generic [ref=e10]: 00:00:03
        - generic [ref=e11]:
          - button "Pause" [ref=e12]
          - button "Cinematic" [ref=e17]
          - button "Sound" [pressed] [ref=e24]
          - button "Black box" [ref=e30]
          - button "Menu" [ref=e34]
      - region "Flight data" [ref=e37]:
        - generic [ref=e38]:
          - status [ref=e40]:
            - generic [ref=e41]: PRE-FLIGHT
            - generic [ref=e42]: → LANDING BURN
          - button "Details" [ref=e43]
        - status [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: Altitude
              - generic [ref=e52]:
                - generic [ref=e53]: "120.1"
                - generic [ref=e54]: KM
            - generic [ref=e58]:
              - generic [ref=e59]: V/S
              - generic [ref=e62]:
                - generic [ref=e63]: "43"
                - generic [ref=e64]: M/S
            - generic [ref=e65]:
              - generic [ref=e66]: Speed
              - generic [ref=e69]:
                - generic [ref=e70]: "42"
                - generic [ref=e71]: M/S
          - generic [ref=e75]:
            - generic [ref=e77]:
              - generic [ref=e78]: Propellant
              - generic [ref=e79]:
                - generic [ref=e80]: CH4
                - generic [ref=e85]: LOX
              - generic [ref=e90]:
                - generic [ref=e91]: "193"
                - generic [ref=e92]: T
            - generic [ref=e93]: Engines
            - generic [ref=e109]:
              - generic [ref=e110]: Attitude
              - generic [ref=e115]:
                - generic [ref=e116]: "-0"
                - generic [ref=e117]: °
      - region "Trajectory map" [ref=e118]:
        - button "Trajectory" [ref=e119]
      - navigation "Controls" [ref=e123]:
        - button "Engines controls" [ref=e124]: Engines
        - button "Flight controls" [ref=e125]: Flight
        - button "Zoom out" [ref=e126]:
          - generic [ref=e127]: −
        - button "Zoom in" [ref=e128]:
          - generic [ref=e129]: +
      - note "Getting started":
        - generic:
          - generic: First flight
          - button "Got it" [ref=e130]
        - paragraph: Take the controls
        - paragraph: Press Engines to light them, then push Throttle up to climb. Menu picks another flight.
  - button "select to enable accessibility for this content" [ref=e131]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import type { SimDebug } from '../../src/app/debug';
  3  | import { ready } from './helpers';
  4  | import { byTestId } from '../../src/ui/testids';
  5  | 
  6  | test('scene resets, pauses and hides continuous gas with its particle detail @mobile', async ({ page }) => {
  7  |   await page.goto('/?debug=1');
  8  |   await ready(page);
  9  |   await page.evaluate(() => {
  10 |     const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  11 |     debug.setScenario('landing-burn', { altitude: 120000, xPosition: 30000, speedX: 0, speedY: 0, propellant: 200 });
  12 |     debug.setState({ 'engines.running[0]': true, 'engines.running[1]': true, 'engines.running[2]': true,
  13 |       'vehicle.throttleCurrent': 100, 'vehicle.throttle': 100 });
  14 |     debug.resume();
  15 |   });
  16 |   await expect.poll(() => page.evaluate(() => Number((window as unknown as { __simDebug: SimDebug }).__simDebug
> 17 |     .telemetry()['world.updatedFrameCount']))).toBeGreaterThan(240);
     |                                                ^ Error: expect(received).toBeGreaterThan(expected)
  18 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.pause());
  19 |   const painted = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  20 |   await painted();
  21 |   const presentation = () => page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation());
  22 |   expect((await presentation()).bell?.visibleMounts).toBe(3);
  23 |   const first = await page.locator(byTestId('world-canvas')).screenshot();
  24 |   await painted();
  25 |   expect(await page.locator(byTestId('world-canvas')).screenshot()).toEqual(first);
  26 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setParticlesVisible(false));
  27 |   await painted();
  28 |   expect((await presentation()).bell?.visibleMounts).toBe(0);
  29 |   const hidden = await page.locator(byTestId('world-canvas')).screenshot();
  30 |   expect(hidden.equals(first)).toBe(false);
  31 |   await painted();
  32 |   expect(await page.locator(byTestId('world-canvas')).screenshot()).toEqual(hidden);
  33 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setParticlesVisible(true));
  34 |   await painted();
  35 |   expect((await presentation()).bell?.visibleMounts).toBe(3);
  36 |   expect(await page.locator(byTestId('world-canvas')).screenshot()).toEqual(first);
  37 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setState({ 'engines.failed[1]': true }));
  38 |   await painted();
  39 |   expect((await presentation()).bell?.visibleMounts).toBe(2);
  40 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setState({
  41 |     'engines.running[0]': false, 'engines.running[2]': false,
  42 |   }));
  43 |   await painted();
  44 |   expect((await presentation()).bell?.visibleMounts).toBe(0);
  45 |   await page.evaluate(() => {
  46 |     const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  47 |     debug.setScenario('landing-burn', { altitude: 120000, xPosition: 30000, speedX: 0, speedY: 0, propellant: 200 });
  48 |     debug.pause();
  49 |   });
  50 |   await painted();
  51 |   expect((await presentation()).bell?.visibleMounts).toBe(0);
  52 | });
  53 | 
  54 | test('one healthy landing engine renders gas without inventing failed mounts', async ({ page }) => {
  55 |   await page.goto('/?debug=1');
  56 |   await ready(page);
  57 |   await page.evaluate(() => {
  58 |     const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  59 |     debug.setScenario('landing-burn', { altitude: 1000, xPosition: 30000, speedX: 0, speedY: -30,
  60 |       propellant: 20, wind: 0 });
  61 |     debug.setState({ 'engines.running[0]': true, 'engines.failed[1]': true, 'engines.failed[2]': true,
  62 |       'vehicle.throttleCurrent': 100, 'vehicle.throttle': 100 });
  63 |     debug.resume();
  64 |   });
  65 |   await expect.poll(() => page.evaluate(() => Number((window as unknown as { __simDebug: SimDebug }).__simDebug
  66 |     .telemetry()['world.updatedFrameCount']))).toBeGreaterThan(360);
  67 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.pause());
  68 |   await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  69 |   const actual = await page.evaluate(() => {
  70 |     const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  71 |     return { presentation: debug.presentation(), thrust: debug.telemetry()['forces.thrust'],
  72 |       propellant: debug.telemetry()['vehicle.propellantMass'] };
  73 |   });
  74 |   expect(actual.presentation.bell?.visibleMounts).toBe(1);
  75 |   expect(Number(actual.thrust)).toBeGreaterThan(0);
  76 |   expect(Number(actual.propellant), 'the intended20t landing fixture must not clamp to a full tank').toBeLessThan(20000);
  77 |   expect(Number(actual.propellant)).toBeGreaterThan(0);
  78 |   await test.info().attach('single-engine-landing', { body: await page.locator(byTestId('world-canvas')).screenshot(), contentType: 'image/png' });
  79 |   await test.info().attach('single-engine-state', { body: JSON.stringify(actual), contentType: 'application/json' });
  80 | });
  81 | 
```