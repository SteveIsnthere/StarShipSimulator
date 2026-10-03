# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sun.spec.ts >> the sun lights the flank it faces, and the other one in the afternoon @mobile
- Location: tests/e2e/sun.spec.ts:126:1

# Error details

```
Error: morning L 62.9 R 40.3 · afternoon L 149.9 R 22.3
frame 2265x945 @2.62x  altitude 25 m  vehicle 263 px
  left       mean   62.9  spread  35.98  tones  8  bright 0.047  dark 0.651  warm 0.0000  top #333333:0.34 #555555:0.13 #444444:0.13 #222222:0.12 #111111:0.11
  right      mean   40.3  spread  38.55  tones  6  bright 0.048  dark 0.868  warm 0.0000  top #111111:0.60 #222222:0.16 #333333:0.08 #444444:0.05 #aaccdd:0.04
  bottomLeft mean  123.0  spread  56.84  tones 13  bright 0.263  dark 0.179  warm 0.0081  top #777788:0.29 #ccddee:0.19 #333333:0.04 #444444:0.04 #222222:0.03
  bottomRight mean  143.6  spread  62.75  tones  7  bright 0.479  dark 0.137  warm 0.0001  top #ccddee:0.46 #667788:0.10 #333344:0.07 #444455:0.06 #334444:0.03
  |+++++**####*+++++****##**+++++*****+****++++++++++++========|
  |+*******##**+++++++++***+++****###**+++++++++**********+++++|
  |*####**++++++++*****+++++++*********++++++**####****#***++++|
  |*###***+++++++*******++++++++++++++++++++***####****++++++++|
  |+++++++++++++++*****++++++++++++++++++++++********++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |************************************************************|
  |************************************************************|
  |************************************************************|
  |****************%*******************************************|
  |**********#*****%%******************************************|
  |#########@@#####%%##########################################|
  |#########%%#####@%##########################################|
  |#########%%#####@%%##%######################################|
  |#########%%#####@%%#%%######################################|
  |#########%#%####@#%#%%#################=####################|
  |#@@######%#%###@@#%%%##################%#####%##%#%#########|
  |%%%%%%%%%%%%%%%@@%%%%+%%%%%%%%%%%%%%%%%#%%%%%%#+%%%*%%%%%%%%|

expect(received).toBeGreaterThan(expected)

Expected: > 1.25
Received:   0.6404277829174231
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic:
      - banner [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: Starship
          - generic [ref=e8]: Landing Burn, edited
          - generic [ref=e9]: Manual
        - generic [ref=e10]:
          - generic [ref=e11]: T+
          - generic [ref=e12]: 00:00:13
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
      - generic [ref=e37]:
        - region "Engines" [ref=e38]:
          - button "Engines controls" [ref=e40]:
            - generic [ref=e41]: Engines
        - region "Flight" [ref=e44]:
          - generic [ref=e45]:
            - button "Flight controls" [expanded] [ref=e46]:
              - generic [ref=e47]: Flight
            - button "Zoom out" [ref=e50]:
              - generic [ref=e51]: −
            - button "Zoom in" [ref=e52]:
              - generic [ref=e53]: +
          - generic [ref=e55]:
            - generic [ref=e56]: Ship
            - generic [ref=e57]:
              - generic [ref=e58]:
                - generic [ref=e59]: Attitude
                - generic [ref=e60]: Right 8 %
              - slider "Attitude" [ref=e61] [cursor=pointer]: "8"
            - group "Autopilot" [ref=e62]:
              - button "Manual" [pressed] [ref=e63]
              - button "Lift off" [ref=e64]
              - button "Boost back" [ref=e65]
              - button "Hold attitude" [ref=e66]
              - button "Land" [ref=e67]
              - button "Deorbit" [ref=e68]
            - group "Systems" [ref=e69]:
              - button "Fins" [ref=e70]
              - button "Reaction control" [ref=e71]
              - button "Dump propellant" [pressed] [ref=e72]
      - region "Flight debrief":
        - generic:
          - generic:
            - generic: Custom
            - heading "Landed" [level=2]
          - button "Close debrief" [ref=e73]:
            - generic [ref=e74]: ×
        - generic [ref=e75]:
          - generic [ref=e76]:
            - generic [ref=e77]: Touchdown
            - generic [ref=e78]: 1.2m/s
            - generic [ref=e79]: Limit 10
          - generic [ref=e80]:
            - generic [ref=e81]: Drift
            - generic [ref=e82]: 0.21m/s
            - generic [ref=e83]: Limit 2
          - generic [ref=e84]:
            - generic [ref=e85]: Tilt
            - generic [ref=e86]: 0.0°
            - generic [ref=e87]: Limit 5.2°
          - generic [ref=e88]:
            - generic [ref=e89]: From the pad
            - generic [ref=e90]: 1m
            - generic [ref=e91]: On the pad
          - generic [ref=e92]:
            - generic [ref=e93]: Flight time
            - generic [ref=e94]: 00:00:13
          - generic [ref=e96]:
            - generic [ref=e97]: Propellant
            - generic [ref=e98]: 13t
            - generic [ref=e99]: left of 1200 t
          - generic [ref=e100]:
            - generic [ref=e101]: Peak Q
            - generic [ref=e102]: 0.9kPa
            - generic [ref=e103]: Limit 50
          - generic [ref=e104]:
            - generic [ref=e105]: Peak skin temperature
            - generic [ref=e106]: 288K
            - generic [ref=e107]: Limit 1533
          - generic [ref=e108]:
            - generic [ref=e109]: Peak g
            - generic [ref=e110]: 3.4g
            - generic [ref=e111]: Limit 13
        - generic:
          - button "Black box" [ref=e112]
          - button "Change scenario" [ref=e113]
          - button "Fly again" [ref=e114]
  - button "select to enable accessibility for this content" [ref=e115]
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
      |                                                                       ^ Error: morning L 62.9 R 40.3 · afternoon L 149.9 R 22.3
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