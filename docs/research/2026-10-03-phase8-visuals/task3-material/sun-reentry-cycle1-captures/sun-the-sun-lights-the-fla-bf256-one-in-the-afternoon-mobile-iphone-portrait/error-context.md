# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sun.spec.ts >> the sun lights the flank it faces, and the other one in the afternoon @mobile
- Location: tests/e2e/sun.spec.ts:126:1

# Error details

```
Error: morning L 62.5 R 38.6 · afternoon L 150.1 R 22.4
frame 1170x1824 @3.00x  altitude 25 m  vehicle 456 px
  left       mean   62.5  spread  38.44  tones  8  bright 0.059  dark 0.684  warm 0.0000  top #333333:0.35 #444444:0.12 #222222:0.11 #111111:0.11 #555555:0.10
  right      mean   38.6  spread  37.27  tones  5  bright 0.046  dark 0.891  warm 0.0000  top #111111:0.63 #222222:0.13 #333333:0.08 #444444:0.04 #aaccdd:0.04
  bottomLeft mean  123.5  spread  46.99  tones 13  bright 0.185  dark 0.115  warm 0.0000  top #777788:0.51 #ccddee:0.13 #444444:0.03 #333333:0.02 #222222:0.02
  bottomRight mean  143.7  spread  69.06  tones  6  bright 0.535  dark 0.209  warm 0.0020  top #ccddee:0.52 #333344:0.09 #444455:0.06 #334444:0.05 #223333:0.04
  |+++===+++++++****#####***++++++===++++**++++****#****+++++++|
  |***#####****++**********++++++++++++++++++++++++++++++++++++|
  |***#####****++++++++++++++++++++++*********+++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |************************************************************|
  |************************************************************|
  |************************************************************|
  |************************************************************|
  |************************************************************|
  |############################################################|
  |############################################################|
  |############################################################|
  |%%###########################=-#############################|
  |%%##########################++-:############################|
  |#%##########################++-:############################|
  |++=+=%%%%%%%%%%%%%%%%%%%%%%%+==-%%%%%%%%%%%%%%%%%%%%%%--::%#|

expect(received).toBeGreaterThan(expected)

Expected: > 1.25
Received:   0.6185220085441974
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
          - generic [ref=e10]: 00:00:12
        - generic [ref=e11]:
          - button "Pause" [ref=e12]
          - button "Cinematic" [ref=e17]
          - button "Sound" [pressed] [ref=e24]
          - button "Black box" [ref=e30]
          - button "Menu" [ref=e34]
      - generic [ref=e37]:
        - region "Flight" [ref=e38]:
          - generic [ref=e40]:
            - generic [ref=e41]: Ship
            - generic [ref=e42]:
              - generic [ref=e43]:
                - generic [ref=e44]: Attitude
                - generic [ref=e45]: Right 8 %
              - slider "Attitude" [ref=e46] [cursor=pointer]: "8"
            - group "Autopilot" [ref=e47]:
              - button "Manual" [pressed] [ref=e48]
              - button "Lift off" [ref=e49]
              - button "Boost back" [ref=e50]
              - button "Hold attitude" [ref=e51]
              - button "Land" [ref=e52]
              - button "Deorbit" [ref=e53]
            - group "Systems" [ref=e54]:
              - button "Fins" [ref=e55]
              - button "Reaction control" [ref=e56]
              - button "Dump propellant" [pressed] [ref=e57]
        - navigation "Controls" [ref=e58]:
          - button "Engines controls" [ref=e59]: Engines
          - button "Flight controls" [expanded] [ref=e60]: Flight
          - button "Zoom out" [ref=e61]:
            - generic [ref=e62]: −
          - button "Zoom in" [ref=e63]:
            - generic [ref=e64]: +
      - region "Flight debrief":
        - generic:
          - generic:
            - generic: Custom
            - heading "Landed" [level=2]
          - button "Close debrief" [ref=e65]:
            - generic [ref=e66]: ×
        - generic [ref=e67]:
          - generic [ref=e68]:
            - generic [ref=e69]: Touchdown
            - generic [ref=e70]: 1.2m/s
            - generic [ref=e71]: Limit 10
          - generic [ref=e72]:
            - generic [ref=e73]: Drift
            - generic [ref=e74]: 0.26m/s
            - generic [ref=e75]: Limit 2
          - generic [ref=e76]:
            - generic [ref=e77]: Tilt
            - generic [ref=e78]: 0.0°
            - generic [ref=e79]: Limit 5.2°
          - generic [ref=e80]:
            - generic [ref=e81]: From the pad
            - generic [ref=e82]: 2m
            - generic [ref=e83]: On the pad
          - generic [ref=e84]:
            - generic [ref=e85]: Flight time
            - generic [ref=e86]: 00:00:12
          - generic [ref=e88]:
            - generic [ref=e89]: Propellant
            - generic [ref=e90]: 13t
            - generic [ref=e91]: left of 1200 t
          - generic [ref=e92]:
            - generic [ref=e93]: Peak Q
            - generic [ref=e94]: 1.3kPa
            - generic [ref=e95]: Limit 50
          - generic [ref=e96]:
            - generic [ref=e97]: Peak skin temperature
            - generic [ref=e98]: 289K
            - generic [ref=e99]: Limit 1533
          - generic [ref=e100]:
            - generic [ref=e101]: Peak g
            - generic [ref=e102]: 4.6g
            - generic [ref=e103]: Limit 13
        - list "Events":
          - listitem: 00:00:00Flip
          - listitem: 00:00:00Landing burn
          - listitem: 00:00:12Touchdown
        - generic:
          - button "Black box" [ref=e104]
          - button "Change scenario" [ref=e105]
          - button "Fly again" [ref=e106]
  - button "select to enable accessibility for this content" [ref=e107]
```

# Test source

```ts
  40  |  * a bare `Number()` of the value node would call 15 km "15" and pass at once.
  41  |  */
  42  | async function landed(page: Page): Promise<void> {
  43  |   await expect
  44  |     .poll(async () => (await metrePixels(page)).altitude, { timeout: 90_000, intervals: [500] })
  45  |     .toBeLessThan(26);
  46  |   // Let the camera settle on the landed vehicle.
  47  |   await page.waitForTimeout(2_500);
  48  | }
  49  | 
  50  | /**
  51  |  * Select a preset and fly it down on the autopilot. The intro lands itself;
  52  |  * a preset from the menu does not, and without AUTO-LAND the landing burn is
  53  |  * a fall — the first run of this measured a crash.
  54  |  */
  55  | async function presetLanded(page: Page, id: string): Promise<void> {
  56  |   await page.locator(byTestId('open-menu')).click();
  57  |   await page.locator(byTestId(`preset-${id}`)).click();
  58  |   await page.locator(byTestId('menu-configure')).click();
  59  |   await expect(page.locator(byTestId('menu'))).toBeHidden();
  60  |   await tap(page, 'auto-land');
  61  |   await landed(page);
  62  | }
  63  | 
  64  | interface PadFrame {
  65  |   readonly report: FrameReport;
  66  |   readonly message: string;
  67  |   readonly left: number;
  68  |   readonly right: number;
  69  |   readonly bottomLeft: number;
  70  |   readonly bottomRight: number;
  71  | }
  72  | 
  73  | /**
  74  |  * Measure the landed vehicle: its two flanks, and the ground line either side
  75  |  * of its base. The vehicle stands on the bottom edge at the frame's centre —
  76  |  * the camera's floor and its horizontal follow put it there — and its drawn
  77  |  * size follows from the viewport, so every region is computed, not guessed.
  78  |  */
  79  | async function measurePad(page: Page): Promise<PadFrame> {
  80  |   const scale = await metrePixels(page);
  81  |   const canvas = await page.locator(byTestId('world-canvas')).boundingBox();
  82  |   if (!canvas) throw new Error('no canvas');
  83  |   const imageScale = scale.imagePerMetre / scale.cssPerMetre;
  84  |   const widthPx = canvas.width * imageScale;
  85  |   const heightPx = canvas.height * imageScale;
  86  |   const vh = scale.vehicleHeightPx;
  87  |   const vw = vh * (vehicleDiameter / vehicleHeight);
  88  |   const cx = widthPx / 2;
  89  |   // The clean hull: below the nose cone, above the aft fins.
  90  |   const top = heightPx - 0.88 * vh;
  91  |   const bandH = 0.33 * vh;
  92  |   const flank = (side: -1 | 1): Region => ({
  93  |     x: (cx + side * 0.3 * (vw / 2) + (side < 0 ? -0.6 * (vw / 2) : 0)) / widthPx,
  94  |     y: top / heightPx,
  95  |     width: (0.6 * (vw / 2)) / widthPx,
  96  |     height: bandH / heightPx,
  97  |   });
  98  |   // The ground line's strip, out to where the longest shadow reaches.
  99  |   const stripH = Math.max(6, 8 * imageScale);
  100 |   const reach = 1.6 * vh;
  101 |   const bottom = (side: -1 | 1): Region => ({
  102 |     x: (side < 0 ? cx - reach : cx + 0.6 * vw) / widthPx,
  103 |     y: (heightPx - stripH) / heightPx,
  104 |     width: (reach - 0.6 * vw) / widthPx,
  105 |     height: stripH / heightPx,
  106 |   });
  107 |   const report = await readFrame(page, {
  108 |     regions: {
  109 |       left: flank(-1),
  110 |       right: flank(1),
  111 |       bottomLeft: bottom(-1),
  112 |       bottomRight: bottom(1),
  113 |     },
  114 |     map: { cols: 60, rows: 20 },
  115 |   });
  116 |   return {
  117 |     report,
  118 |     message: describeFrame(report, scale),
  119 |     left: report.regions['left']!.meanLuma,
  120 |     right: report.regions['right']!.meanLuma,
  121 |     bottomLeft: report.regions['bottomLeft']!.meanLuma,
  122 |     bottomRight: report.regions['bottomRight']!.meanLuma,
  123 |   };
  124 | }
  125 | 
  126 | test('the sun lights the flank it faces, and the other one in the afternoon @mobile', async ({
  127 |   page,
  128 | }) => {
  129 |   test.setTimeout(240_000);
  130 |   await page.goto('/', { waitUntil: 'load' });
  131 |   await ready(page);
  132 |   await landed(page);
  133 |   const morning = await measurePad(page);
  134 | 
  135 |   await presetLanded(page, 'landing-burn');
  136 |   const afternoon = await measurePad(page);
  137 | 
  138 |   const note = `morning L ${morning.left.toFixed(1)} R ${morning.right.toFixed(1)} · afternoon L ${afternoon.left.toFixed(1)} R ${afternoon.right.toFixed(1)}`;
  139 |   // Morning: sun in the east, the right flank lit.
> 140 |   expect(morning.right / morning.left, `${note}\n${morning.message}`).toBeGreaterThan(FLANK_RATIO);
      |                                                                       ^ Error: morning L 62.5 R 38.6 · afternoon L 150.1 R 22.4
  141 |   // Afternoon: sun in the west, the LEFT flank lit — the art alone cannot do this.
  142 |   expect(afternoon.left / afternoon.right, `${note}\n${afternoon.message}`).toBeGreaterThan(
  143 |     FLANK_RATIO,
  144 |   );
  145 | });
  146 | 
  147 | test('the shadow falls away from the sun, and moves with it @mobile', async ({ page }) => {
  148 |   test.setTimeout(240_000);
  149 |   await page.goto('/', { waitUntil: 'load' });
  150 |   await ready(page);
  151 |   await landed(page);
  152 |   const morning = await measurePad(page);
  153 | 
  154 |   await presetLanded(page, 'landing-burn');
  155 |   const afternoon = await measurePad(page);
  156 | 
  157 |   // Left minus right along the ground line. The morning shadow is on the
  158 |   // left (west of the vehicle), so the morning figure is the smaller; the
  159 |   // scenery is the same in both frames and cancels.
  160 |   const morningLR = morning.bottomLeft - morning.bottomRight;
  161 |   const afternoonLR = afternoon.bottomLeft - afternoon.bottomRight;
  162 |   const note = `morning L-R ${morningLR.toFixed(1)} (L ${morning.bottomLeft.toFixed(1)} R ${morning.bottomRight.toFixed(1)}) · afternoon L-R ${afternoonLR.toFixed(1)} (L ${afternoon.bottomLeft.toFixed(1)} R ${afternoon.bottomRight.toFixed(1)})`;
  163 |   expect(afternoonLR - morningLR, `${note}\n${morning.message}\n${afternoon.message}`).toBeGreaterThan(
  164 |     SHADOW_MARGIN,
  165 |   );
  166 | });
  167 | 
```