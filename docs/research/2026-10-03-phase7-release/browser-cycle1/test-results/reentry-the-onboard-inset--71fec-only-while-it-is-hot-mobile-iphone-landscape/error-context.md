# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: reentry.spec.ts >> the onboard inset shows the vehicle in its sheath, and only while it is hot @mobile
- Location: tests/e2e/reentry.spec.ts:48:1

# Error details

```
Error: something is drawn in the inset on a cold flight
frame 2250x141 @3.00x  altitude 71600 m  vehicle 60 px
  inset      mean   44.4  spread  27.60  tones  8  bright 0.016  dark 0.884  warm 0.0000  top #112233:0.82 #222233:0.03 #223333:0.01 #778888:0.01 #556666:0.01
  |...........................*.----...........................|
  |...........................*.---............................|
  |...........................-.-+=............................|
  |...........................=.-+=-...........................|
  |...........................++::*-...........................|
  |...........................+*:.*............................|
  |...........................+#--++...........................|
  |...........................=:@*-#...........................|
  |...........................#*@=-#...........................|
  |...........................%%%===...........................|
  |............:::::::--------=@%*=#--------:::::::............|
  |....:::::--===++**++++++**+%%@##%+**++++++**++===--:::::....|
  |:--==+++*+++*+++**=-:::::::##%::::::::::-=**+++*+++*+++==--:|
  |++*++*++=-:::::::::::::::::%%#::::::::::::::::::::-=++*++*++|
  |*+=::::::::::::::::::::::::+@#:::::::::::::::::::::::::::=+*|
  |:::::::::::::::::::::::::::+%%::::::::::::::::::::::::::::::|
  |:::::::::::::::::::::::::::++#::::::::::::::::::::::::::::::|
  |:::::::::::::::::::::::::::=::::::::::::::::::::::::::::::::|
  |::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::|
  |::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::|

expect(received).toBeLessThan(expected)

Expected: < 13.621976036037646
Received:   27.60347685367897
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic:
      - banner [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: Starship
          - generic [ref=e8]: Booster Sep, edited
          - generic [ref=e9]: Manual
        - generic [ref=e10]:
          - generic [ref=e11]: T+
          - generic [ref=e12]: 00:00:02
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
                - generic [ref=e53]: "72.3"
                - generic [ref=e54]: KM
            - generic [ref=e58]:
              - generic [ref=e59]: V/S
              - generic [ref=e62]:
                - generic [ref=e63]: "1111"
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
          - generic [ref=e102]:
            - generic [ref=e103]:
              - generic [ref=e104]: Centre · 3
              - generic [ref=e105]: 0 lit · 0 start · 0 fail
            - generic [ref=e106]:
              - generic [ref=e107]: Inner · 10
              - generic [ref=e108]: 0 lit · 0 start · 0 fail
            - generic [ref=e109]:
              - generic [ref=e110]: Outer · 20
              - generic [ref=e111]: 0 lit · 0 start · 0 fail
      - region "Trajectory map" [ref=e112]:
        - button "Trajectory" [ref=e113]
      - generic [ref=e116]:
        - region "Engines" [ref=e117]:
          - button "Engines controls" [ref=e119]:
            - generic [ref=e120]: Engines
        - region "Flight" [ref=e123]:
          - generic [ref=e124]:
            - button "Flight controls" [ref=e125]:
              - generic [ref=e126]: Flight
            - button "Zoom out" [ref=e129]:
              - generic [ref=e130]: −
            - button "Zoom in" [ref=e131]:
              - generic [ref=e132]: +
  - button "select to enable accessibility for this content" [ref=e133]
```

# Test source

```ts
  1  | /**
  2  |  * M11.5 — re-entry, measured.
  3  |  *
  4  |  * The re-entry preset starts at 80 km and 7.3 km/s with HEAT at a third of
  5  |  * the limit, so the sheath is on from the first frame and so is the inset.
  6  |  * Two claims, each a number the harness can produce:
  7  |  *
  8  |  *   THE INSET is there, and it is the vehicle: its square at the top-left has
  9  |  *   a luma spread no patch of night sky has, and warm pixels — the sheath —
  10 |  *   that no patch of sky has at all. On a cold flight the same square is sky.
  11 |  *
  12 |  *   THE SHEATH is on the vehicle in the main view too: warm pixels inside the
  13 |  *   subject region, where before M11.5 the only warmth was the trail's dots.
  14 |  */
  15 | import { expect, test } from '@playwright/test';
  16 | import { byTestId } from '../../src/ui/testids';
  17 | import { insetLayout } from '../../src/view/reentry';
  18 | import { ready } from './helpers';
  19 | import { describeFrame, metrePixels, readFrame, type Region } from './pixels';
  20 | 
  21 | type Page = import('@playwright/test').Page;
  22 | 
  23 | async function preset(page: Page, id: string, settleMs: number): Promise<void> {
  24 |   await page.locator(byTestId('open-menu')).click();
  25 |   await page.locator(byTestId(`preset-${id}`)).click();
  26 |   await page.locator(byTestId('menu-configure')).click();
  27 |   await expect(page.locator(byTestId('menu'))).toBeHidden();
  28 |   await page.waitForTimeout(settleMs);
  29 | }
  30 | 
  31 | /** The inset's square, as a fraction of the image, from the same layout rule the view uses. */
  32 | async function insetRegion(page: Page): Promise<Region> {
  33 |   const box = await page.locator(byTestId('world-canvas')).boundingBox();
  34 |   if (!box) throw new Error('no canvas');
  35 |   const layout = { x: 0, y: 0, size: 0 };
  36 |   insetLayout({ width: box.width, height: box.height }, layout);
  37 |   // Inside the frame line, so the hairline is not in the numbers.
  38 |   return {
  39 |     x: (layout.x + 2) / box.width,
  40 |     y: (layout.y + 2) / box.height,
  41 |     width: (layout.size - 4) / box.width,
  42 |     height: (layout.size - 4) / box.height,
  43 |   };
  44 | }
  45 | 
  46 | const SUBJECT: Region = { x: 0.3, y: 0.2, width: 0.4, height: 0.6 };
  47 | 
  48 | test('the onboard inset shows the vehicle in its sheath, and only while it is hot @mobile', async ({
  49 |   page,
  50 | }) => {
  51 |   test.setTimeout(120_000);
  52 |   await page.goto('/', { waitUntil: 'load' });
  53 |   await ready(page);
  54 | 
  55 |   await preset(page, 'reentry', 1_500);
  56 |   const inset = await insetRegion(page);
  57 |   const hot = await readFrame(page, { regions: { inset, subject: SUBJECT }, map: { cols: 60, rows: 20 } });
  58 |   const scale = await metrePixels(page);
  59 |   const message = describeFrame(hot, scale);
  60 |   const window = hot.regions['inset']!;
  61 |   // The vehicle: many tones, not the two or three a night sky with stars has.
  62 |   expect(window.lumaSpread, `the inset is flat — no vehicle in it\n${message}`).toBeGreaterThan(12);
  63 |   expect(window.toneBuckets, `the inset has too few tones to be a lit hull\n${message}`).toBeGreaterThan(3);
  64 |   // The sheath: warm, saturated pixels wrapped on the windward side.
  65 |   expect(window.warmFraction, `no sheath in the inset\n${message}`).toBeGreaterThan(0.01);
  66 |   // And in the main view, on the vehicle itself.
  67 |   expect(hot.regions['subject']!.warmFraction, `no sheath on the vehicle\n${message}`).toBeGreaterThan(
  68 |     0.0005,
  69 |   );
  70 | 
  71 |   // A cold flight: the same square is sky — no warmth, and no vehicle.
  72 |   await preset(page, 'booster-sep', 1_200);
  73 |   const cold = await readFrame(page, { regions: { inset }, map: { cols: 60, rows: 20 } });
  74 |   const sky = cold.regions['inset']!;
  75 |   const coldMessage = describeFrame(cold, await metrePixels(page));
  76 |   expect(sky.warmFraction, `the inset is still showing on a cold flight\n${coldMessage}`).toBeLessThan(
  77 |     0.002,
  78 |   );
> 79 |   expect(sky.lumaSpread, `something is drawn in the inset on a cold flight\n${coldMessage}`).toBeLessThan(
     |                                                                                              ^ Error: something is drawn in the inset on a cold flight
  80 |     window.lumaSpread * 0.5,
  81 |   );
  82 | });
  83 | 
```