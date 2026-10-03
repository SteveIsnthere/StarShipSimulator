# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: emissive-bell.spec.ts >> one healthy landing engine renders gas without inventing failed mounts
- Location: tests/e2e/emissive-bell.spec.ts:54:1

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 360
Received:   298

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
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
        - generic [ref=e12]: 00:00:03
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
                - text: 0–1KM
            - generic [ref=e68]:
              - generic [ref=e69]: "934"
              - generic [ref=e70]: M
          - generic [ref=e71]:
            - generic [ref=e72]: Vertical speed
            - generic [ref=e75]:
              - generic [ref=e76]: "-6"
              - generic [ref=e77]: M/S
          - generic [ref=e78]:
            - generic [ref=e79]:
              - generic [ref=e80]: Speed
              - generic [ref=e81]:
                - generic [ref=e82]: Dial range
                - text: 0–200M/S
            - generic [ref=e87]:
              - generic [ref=e88]: "10"
              - generic [ref=e89]: M/S
        - generic [ref=e90]:
          - generic [ref=e92]:
            - generic [ref=e93]: Propellant
            - generic [ref=e94]:
              - generic [ref=e95]: CH4
              - generic [ref=e99]: LOX
            - generic [ref=e103]:
              - generic [ref=e104]: "17"
              - generic [ref=e105]: T
          - generic [ref=e106]:
            - generic [ref=e107]: Engines
            - generic [ref=e108]: SL
            - generic [ref=e118]: Vac
          - generic [ref=e126]:
            - generic [ref=e127]: Attitude
            - generic [ref=e132]:
              - generic [ref=e133]: "24"
              - generic [ref=e134]: °
        - generic [ref=e135]:
          - generic [ref=e136]:
            - generic "Horizontal speed" [ref=e137]: H/S
            - generic [ref=e138]:
              - generic [ref=e139]: "9"
              - generic [ref=e140]: M/S
          - generic [ref=e141]:
            - generic "Speed as a multiple of the speed of sound" [ref=e142]: Mach
            - generic [ref=e143]: "0.03"
          - generic [ref=e145]:
            - generic "Dynamic pressure" [ref=e146]: Q
            - generic [ref=e147]:
              - generic [ref=e148]: "0.1"
              - generic [ref=e149]: KPA
          - generic [ref=e150]:
            - generic "Acceleration felt on board, in g" [ref=e151]: G
            - generic [ref=e152]: "1.7"
          - generic [ref=e154]:
            - generic "Thrust to weight ratio" [ref=e155]: TWR
            - generic [ref=e156]: "1.7"
          - generic [ref=e158]:
            - generic "Throttle" [ref=e159]
            - generic [ref=e160]:
              - generic [ref=e161]: "100"
              - generic [ref=e162]: "%"
          - generic [ref=e163]:
            - generic "Skin temperature" [ref=e164]: Heat
            - generic [ref=e165]:
              - generic [ref=e166]: "282"
              - generic [ref=e167]: K
          - generic [ref=e168]:
            - generic "Distance to the landing site" [ref=e169]: Range
            - generic [ref=e170]:
              - generic [ref=e171]: "30.0"
              - generic [ref=e172]: KM
    - region "Trajectory map" [ref=e173]:
      - button "Trajectory" [expanded] [ref=e174]
    - generic [ref=e179]:
      - region "Engines" [ref=e180]:
        - button "Engines controls" [expanded] [ref=e182]:
          - generic [ref=e183]: Engines
        - generic [ref=e187]:
          - generic [ref=e188]:
            - button "Engines" [pressed] [ref=e189]:
              - generic [ref=e191]: Space
            - group "Sea-level engines" [ref=e193]:
              - generic [ref=e194]: SL
              - button "Sea-level engine 1" [pressed] [ref=e195]
              - button "Sea-level engine 2" [ref=e197]
              - button "Sea-level engine 3" [ref=e199]
            - group "Vacuum engines" [ref=e201]:
              - generic [ref=e202]: Vac
              - button "Vacuum engine 1" [ref=e203]
              - button "Vacuum engine 2" [ref=e205]
              - button "Vacuum engine 3" [ref=e207]
          - generic [ref=e209]:
            - generic [ref=e210]:
              - generic [ref=e211]: Throttle
              - generic [ref=e212]: 100 %
            - slider "Throttle" [ref=e214] [cursor=pointer]: "100"
          - button "Throttle guard" [ref=e215]:
            - generic [ref=e217]: "Off"
          - generic [ref=e218]: Throttles back to keep the speed under the safe dynamic-pressure limit.
      - region "Flight" [ref=e219]:
        - generic [ref=e220]:
          - button "Flight controls" [expanded] [ref=e221]:
            - generic [ref=e222]: Flight
          - button "Zoom out" [ref=e225]:
            - generic [ref=e226]: −
          - button "Zoom in" [ref=e227]:
            - generic [ref=e228]: +
        - generic [ref=e230]:
          - generic [ref=e231]: Ship
          - generic [ref=e232]:
            - generic [ref=e233]:
              - generic [ref=e234]: Attitude
              - generic [ref=e235]: Centre
            - slider "Attitude" [ref=e236] [cursor=pointer]: "0"
          - group "Autopilot" [ref=e237]:
            - button "Manual" [pressed] [ref=e238]
            - button "Lift off" [ref=e239]
            - button "Boost back" [ref=e240]
            - button "Hold attitude" [ref=e241]
            - button "Land" [ref=e242]
            - button "Deorbit" [ref=e243]
          - group "Systems" [ref=e244]:
            - button "Fins" [ref=e245]
            - button "Reaction control" [ref=e246]
            - button "Dump propellant" [ref=e247]
    - note "Getting started":
      - generic:
        - generic: First flight
        - button "Got it" [ref=e248]
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
  17 |     .telemetry()['world.updatedFrameCount']))).toBeGreaterThan(240);
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
> 66 |     .telemetry()['world.updatedFrameCount']))).toBeGreaterThan(360);
     |                                                ^ Error: expect(received).toBeGreaterThan(expected)
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