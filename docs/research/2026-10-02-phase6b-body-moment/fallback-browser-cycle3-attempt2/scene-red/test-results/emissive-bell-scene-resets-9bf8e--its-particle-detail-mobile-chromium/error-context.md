# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: emissive-bell.spec.ts >> scene resets, pauses and hides continuous gas with its particle detail @mobile
- Location: tests/e2e/emissive-bell.spec.ts:5:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 3
Received: undefined
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic:
    - banner [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: Starship
        - generic [ref=e8]: Landing Burn
        - generic [ref=e9]: Manual
      - generic [ref=e10]:
        - generic [ref=e11]: T+
        - generic [ref=e12]: 00:00:02
      - generic [ref=e13]:
        - button "Pause" [ref=e14]:
          - text: Pause
          - generic [ref=e15]: P
        - button "Cinematic" [ref=e17]
        - button "Sound" [pressed] [ref=e25]
        - button "Black box" [ref=e32]
        - button "Menu" [ref=e37]:
          - text: Menu
          - generic [ref=e38]: Esc
    - region "Flight data" [ref=e40]:
      - generic [ref=e41]:
        - generic [ref=e42]:
          - list [ref=e43]:
            - listitem [ref=e44]:
              - generic [ref=e45]: LANDING BURN
            - listitem [ref=e49]:
              - generic [ref=e50]: TOUCHDOWN
          - status [ref=e53]: PRE-FLIGHT→ LANDING BURN
        - button "Details" [expanded] [ref=e54]
      - status [ref=e57]:
        - generic [ref=e58]:
          - generic [ref=e59]:
            - generic [ref=e60]:
              - generic [ref=e61]: Altitude
              - generic [ref=e62]:
                - generic [ref=e63]: Dial range
                - text: 0–200KM
            - generic [ref=e68]:
              - generic [ref=e69]: "120.0"
              - generic [ref=e70]: KM
          - generic [ref=e71]:
            - generic [ref=e72]: Vertical speed
            - generic [ref=e75]:
              - generic [ref=e76]: "-11"
              - generic [ref=e77]: M/S
          - generic [ref=e78]:
            - generic [ref=e79]:
              - generic [ref=e80]: Speed
              - generic [ref=e81]:
                - generic [ref=e82]: Dial range
                - text: 0–200M/S
            - generic [ref=e87]:
              - generic [ref=e88]: "11"
              - generic [ref=e89]: M/S
        - generic [ref=e90]:
          - generic [ref=e92]:
            - generic [ref=e93]: Propellant
            - generic [ref=e94]:
              - generic [ref=e95]: CH4
              - generic [ref=e99]: LOX
            - generic [ref=e103]:
              - generic [ref=e104]: "1194"
              - generic [ref=e105]: T
          - generic [ref=e106]:
            - generic [ref=e107]: Engines
            - generic [ref=e108]: SL
            - generic [ref=e116]: Vac
          - generic [ref=e124]:
            - generic [ref=e125]: Attitude
            - generic [ref=e130]:
              - generic [ref=e131]: "-0"
              - generic [ref=e132]: °
        - generic [ref=e133]:
          - generic [ref=e134]:
            - generic "Horizontal speed" [ref=e135]: H/S
            - generic [ref=e136]:
              - generic [ref=e137]: "0"
              - generic [ref=e138]: M/S
          - generic [ref=e139]:
            - generic "Speed as a multiple of the speed of sound" [ref=e140]: Mach
            - generic [ref=e141]: "0.03"
          - generic [ref=e143]:
            - generic "Dynamic pressure" [ref=e144]: Q
            - generic [ref=e145]:
              - generic [ref=e146]: "0.0"
              - generic [ref=e147]: KPA
          - generic [ref=e148]:
            - generic "Acceleration felt on board, in g" [ref=e149]: G
            - generic [ref=e150]: "0.6"
          - generic [ref=e152]:
            - generic "Thrust to weight ratio" [ref=e153]: TWR
            - generic [ref=e154]: "0.6"
          - generic [ref=e156]:
            - generic "Throttle" [ref=e157]
            - generic [ref=e158]:
              - generic [ref=e159]: "100"
              - generic [ref=e160]: "%"
          - generic [ref=e161]:
            - generic "Skin temperature" [ref=e162]: Heat
            - generic [ref=e163]:
              - generic [ref=e164]: "187"
              - generic [ref=e165]: K
          - generic [ref=e166]:
            - generic "Distance to the landing site" [ref=e167]: Range
            - generic [ref=e168]:
              - generic [ref=e169]: "30.0"
              - generic [ref=e170]: KM
    - region "Trajectory map" [ref=e171]:
      - button "Trajectory" [expanded] [ref=e172]
    - generic [ref=e177]:
      - region "Engines" [ref=e178]:
        - button "Engines controls" [expanded] [ref=e180]:
          - generic [ref=e181]: Engines
        - generic [ref=e185]:
          - generic [ref=e186]:
            - button "Engines" [pressed] [ref=e187]:
              - generic [ref=e189]: Space
            - group "Sea-level engines" [ref=e191]:
              - generic [ref=e192]: SL
              - button "Sea-level engine 1" [pressed] [ref=e193]
              - button "Sea-level engine 2" [pressed] [ref=e195]
              - button "Sea-level engine 3" [pressed] [ref=e197]
            - group "Vacuum engines" [ref=e199]:
              - generic [ref=e200]: Vac
              - button "Vacuum engine 1" [ref=e201]
              - button "Vacuum engine 2" [ref=e203]
              - button "Vacuum engine 3" [ref=e205]
          - generic [ref=e207]:
            - generic [ref=e208]:
              - generic [ref=e209]: Throttle
              - generic [ref=e210]: 100 %
            - slider "Throttle" [ref=e212] [cursor=pointer]: "100"
          - button "Throttle guard" [ref=e213]:
            - generic [ref=e215]: "Off"
          - generic [ref=e216]: Throttles back to keep the speed under the safe dynamic-pressure limit.
      - region "Flight" [ref=e217]:
        - generic [ref=e218]:
          - button "Flight controls" [expanded] [ref=e219]:
            - generic [ref=e220]: Flight
          - button "Zoom out" [ref=e223]:
            - generic [ref=e224]: −
          - button "Zoom in" [ref=e225]:
            - generic [ref=e226]: +
        - generic [ref=e228]:
          - generic [ref=e229]:
            - generic [ref=e230]:
              - generic [ref=e231]: Attitude
              - generic [ref=e232]: Centre
            - slider "Attitude" [ref=e233] [cursor=pointer]: "0"
          - group "Autopilot" [ref=e234]:
            - button "Manual" [pressed] [ref=e235]
            - button "Lift off" [ref=e236]
            - button "Boost back" [ref=e237]
            - button "Hold attitude" [ref=e238]
            - button "Land" [ref=e239]
            - button "Deorbit" [ref=e240]
          - group "Systems" [ref=e241]:
            - button "Fins" [ref=e242]
            - button "Reaction control" [ref=e243]
            - button "Dump propellant" [ref=e244]
    - note "Getting started":
      - generic:
        - generic: First flight
        - button "Got it" [ref=e245]
      - paragraph: Take the controls
      - paragraph: Press Engines to light them, then push Throttle up to climb. Menu picks another flight.
      - paragraph:
        - generic:
          - generic: Space
          - text: engines
        - generic:
          - generic: W
          - text: throttle up
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import type { SimDebug } from '../../src/app/debug';
  3  | import { ready } from './helpers';
  4  | 
  5  | test('scene resets, pauses and hides continuous gas with its particle detail @mobile', async ({ page }) => {
  6  |   await page.goto('/?debug=1');
  7  |   await ready(page);
  8  |   await page.evaluate(() => {
  9  |     const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  10 |     debug.setScenario('landing-burn', { altitude: 120000, xPosition: 30000, speedX: 0, speedY: 0, propellant: 200000 });
  11 |     debug.setState({ 'engines.running[0]': true, 'engines.running[1]': true, 'engines.running[2]': true,
  12 |       'vehicle.throttleCurrent': 100, 'vehicle.throttle': 100 });
  13 |     debug.resume();
  14 |   });
  15 |   await expect.poll(() => page.evaluate(() => Number((window as unknown as { __simDebug: SimDebug }).__simDebug
  16 |     .telemetry()['world.updatedFrameCount']))).toBeGreaterThan(240);
  17 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.pause());
  18 |   const painted = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  19 |   await painted();
  20 |   const presentation = () => page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation());
> 21 |   expect((await presentation()).bell?.visibleMounts).toBe(3);
     |                                                      ^ Error: expect(received).toBe(expected) // Object.is equality
  22 |   const first = await page.locator('canvas').first().screenshot();
  23 |   await painted();
  24 |   expect(await page.locator('canvas').first().screenshot()).toEqual(first);
  25 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setParticlesVisible(false));
  26 |   await painted();
  27 |   const hidden = await page.locator('canvas').first().screenshot();
  28 |   expect(hidden.equals(first)).toBe(false);
  29 |   await painted();
  30 |   expect(await page.locator('canvas').first().screenshot()).toEqual(hidden);
  31 |   await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setParticlesVisible(true));
  32 |   await painted();
  33 |   expect(await page.locator('canvas').first().screenshot()).toEqual(first);
  34 |   await page.evaluate(() => {
  35 |     const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  36 |     debug.setScenario('landing-burn', { altitude: 120000, xPosition: 30000, speedX: 0, speedY: 0, propellant: 200000 });
  37 |     debug.pause();
  38 |   });
  39 |   await painted();
  40 |   expect((await presentation()).bell?.visibleMounts).toBe(0);
  41 | });
  42 | 
```