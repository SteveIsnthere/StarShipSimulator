# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-scenes.spec.ts >> actual landing has drawn vehicle structure with a same-state absence control @mobile
- Location: tests/e2e/visual-scenes.spec.ts:12:3

# Error details

```
Error: starship top edge

expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   -1.485658040813398
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic:
      - banner [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: Starship
          - generic [ref=e8]: Landing Burn
          - generic [ref=e9]:
            - generic [ref=e10]: Autopilot ·
            - text: Land
        - generic [ref=e11]:
          - generic [ref=e12]: T+
          - generic [ref=e13]: 00:00:01
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
            - generic [ref=e42]: LANDING BURN
            - generic [ref=e43]: → TOUCHDOWN
          - button "Details" [ref=e44]
        - status [ref=e47]:
          - generic [ref=e48]:
            - generic [ref=e49]:
              - generic [ref=e50]: Altitude
              - generic [ref=e53]:
                - generic [ref=e54]: "146"
                - generic [ref=e55]: M
            - generic [ref=e59]:
              - generic [ref=e60]: V/S
              - generic [ref=e63]:
                - generic [ref=e64]: "-29"
                - generic [ref=e65]: M/S
            - generic [ref=e66]:
              - generic [ref=e67]: Speed
              - generic [ref=e70]:
                - generic [ref=e71]: "30"
                - generic [ref=e72]: M/S
          - generic [ref=e76]:
            - generic [ref=e78]:
              - generic [ref=e79]: Propellant
              - generic [ref=e80]:
                - generic [ref=e81]: CH4
                - generic [ref=e85]: LOX
              - generic [ref=e89]:
                - generic [ref=e90]: "19"
                - generic [ref=e91]: T
            - generic [ref=e92]: Engines
            - generic [ref=e108]:
              - generic [ref=e109]: Attitude
              - generic [ref=e114]:
                - generic [ref=e115]: "1"
                - generic [ref=e116]: °
      - region "Trajectory map" [ref=e117]:
        - button "Trajectory" [ref=e118]
      - generic [ref=e121]:
        - region "Engines" [ref=e122]:
          - button "Engines controls" [ref=e124]:
            - generic [ref=e125]: Engines
        - region "Flight" [ref=e128]:
          - generic [ref=e129]:
            - button "Flight controls" [active] [ref=e130]:
              - generic [ref=e131]: Flight
            - button "Zoom out" [ref=e134]:
              - generic [ref=e135]: −
            - button "Zoom in" [ref=e136]:
              - generic [ref=e137]: +
  - button "select to enable accessibility for this content" [ref=e138]
```

# Test source

```ts
  1  | /** Six actual production scenes; the identical state without bodies is the
  2  |  * pixel detector's negative control. No image-golden or fabricated flight. */
  3  | import { expect, test } from '@playwright/test';
  4  | import { writeFile } from 'node:fs/promises';
  5  | import type { SimDebug } from '../../src/app/debug';
  6  | import { starBaseXPos } from '../../src/core/constants';
  7  | import { SUPER_HEAVY, CATCH } from '../../src/core/vehicles/super-heavy';
  8  | import { captureCanvas, HULL_SILHOUETTE, readFrame } from './pixels';
  9  | import { painted, visualScene, VISUAL_SCENES } from './visual-scene-setup';
  10 | 
  11 | for (const scene of VISUAL_SCENES) {
  12 |   test(`actual ${scene} has drawn vehicle structure with a same-state absence control @mobile`, async ({ page }, info) => {
  13 |     await visualScene(page, scene);
  14 |     const state = await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry());
  15 |     const presentation = await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation());
  16 |     expect(presentation.bodies?.map(body => body.id)).toEqual(scene === 'staging'
  17 |       ? ['starship', 'super-heavy'] : [scene === 'catch' ? 'super-heavy' : 'starship']);
  18 |     for (const body of presentation.bodies!) {
  19 |       expect(body.width).toBeGreaterThan(0); expect(body.height).toBeGreaterThan(0);
  20 |       expect(Number.isFinite(body.x + body.y + body.rotation)).toBe(true);
  21 |       {
  22 |         // Presentation dimensions are local-axis extents. Project the actual
  23 |         // rotated hull/fin bounds before asking whether the whole body fits.
  24 |         const c = Math.abs(Math.cos(body.rotation)), s = Math.abs(Math.sin(body.rotation));
  25 |         const halfX = (c * body.width + s * body.height) / 2;
  26 |         const halfY = (s * body.width + c * body.height) / 2;
  27 |         expect(body.x - halfX, `${body.id} left edge`).toBeGreaterThan(0);
  28 |         expect(body.x + halfX, `${body.id} right edge`).toBeLessThan(presentation.width);
> 29 |         expect(body.y - halfY, `${body.id} top edge`).toBeGreaterThan(0);
     |                                                       ^ Error: starship top edge
  30 |         expect(body.y + halfY, `${body.id} bottom edge`).toBeLessThan(presentation.height);
  31 |       }
  32 |     }
  33 |     if (scene === 'catch') {
  34 |       const pitch = Number(state['kinematics.pitch']);
  35 |       const lugX = Number(state['kinematics.downRangeDistance'])
  36 |         + Math.sin(pitch) * (CATCH.lugStation - SUPER_HEAVY.height / 2);
  37 |       expect(Math.abs(lugX - starBaseXPos)).toBeLessThanOrEqual(CATCH.halfWidth);
  38 |     }
  39 |     await writeFile(info.outputPath(`${scene}-state.json`), JSON.stringify({ state, presentation }, null, 2));
  40 |     await info.attach(`${scene}-state`, { body: JSON.stringify({ state, presentation }), contentType: 'application/json' });
  41 |     await writeFile(info.outputPath(`${scene}.png`), await captureCanvas(page));
  42 |     await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setVehiclesVisible(false));
  43 |     await painted(page);
  44 |     expect(await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation().bodies)).toEqual([]);
  45 |     const absent = await captureCanvas(page);
  46 |     // The existing cold silhouette rejects incandescent entry pixels.
  47 |     // Entry uses the established warm detector, with the same cause-off frame.
  48 |     const probe = { extents: { vehicle: scene === 'entry' ? { minLuma: 0, warmOnly: true } : HULL_SILHOUETTE } };
  49 |     expect((await readFrame(page, probe, absent)).extents['vehicle']!.count).toBe(0);
  50 |     await writeFile(info.outputPath(`${scene}-without-vehicles.png`), absent);
  51 |     await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setVehiclesVisible(true));
  52 |     await painted(page);
  53 |     const visible = await readFrame(page, probe, absent);
  54 |     expect(visible.extents['vehicle']!.count, 'removing actual bodies must remove measurable image structure').toBeGreaterThan(0);
  55 |     expect(await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry())).toEqual(state);
  56 |     await info.attach(`${scene}-pixels`, { body: JSON.stringify(visible.extents), contentType: 'application/json' });
  57 |   });
  58 | }
  59 | 
```