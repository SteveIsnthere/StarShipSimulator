# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sun.spec.ts >> the sun lights the flank it faces, and the other one in the afternoon @mobile
- Location: tests/e2e/sun.spec.ts:126:1

# Error details

```
Error: morning L 64.6 R 43.6 · afternoon L 149.5 R 24.7
frame 1280x720 @1.00x  altitude 25 m  vehicle 180 px
  left       mean   64.6  spread  39.76  tones  8  bright 0.064  dark 0.636  warm 0.0000  top #333333:0.32 #555555:0.16 #222222:0.12 #444444:0.11 #111111:0.08
  right      mean   43.6  spread  42.47  tones  6  bright 0.064  dark 0.838  warm 0.0000  top #111111:0.55 #222222:0.16 #333333:0.08 #444444:0.06 #aaccdd:0.06
  bottomLeft mean  113.2  spread  47.57  tones 12  bright 0.142  dark 0.168  warm 0.0125  top #777788:0.45 #ccddee:0.10 #444444:0.04 #222222:0.03 #333333:0.03
  bottomRight mean  132.7  spread  64.46  tones  6  bright 0.411  dark 0.197  warm 0.0028  top #ccddee:0.40 #333344:0.08 #667788:0.06 #444455:0.05 #334444:0.04
  |***#####******##*****##*######****++++++++*********###*+++*#|
  |########************####*****########*****##*****+++++++====|
  |*##***+++*******+++****+++***#####***+++++*+++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
  |************************************************************|
  |************************************************************|
  |************************************************************|
  |************************************************************|
  |*************%%*********************************************|
  |#####%#######%%#############################################|
  |#####@#######%%%%###########################################|
  |#####@#######@%%############################################|
  |#####%#######@%%%##@########################################|
  |#####%#######@#%%#%@######################%#################|
  |#####%*@#####@#%%@%%##########################%####%%##%####|
  |%%%%%%%%@%%@@@%%@@***%%%%%%%%%%%%%%%%%%-%#*%%%%%%%*+%%%%=%%%|

expect(received).toBeGreaterThan(expected)

Expected: > 1.25
Received:   0.674969242266463
```

# Page snapshot

```yaml
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
        - button "Sound" [pressed] [ref=e25]
        - button "Black box" [ref=e32]
        - button "Menu" [ref=e37]:
          - text: Menu
          - generic [ref=e38]: Esc
    - region "Trajectory map" [ref=e40]:
      - button "Trajectory" [expanded] [ref=e41]
    - generic [ref=e46]:
      - region "Engines" [ref=e47]:
        - button "Engines controls" [expanded] [ref=e49]:
          - generic [ref=e50]: Engines
        - generic [ref=e54]:
          - generic [ref=e55]:
            - button "Engines" [ref=e56]:
              - generic [ref=e58]: Space
            - group "Sea-level engines" [ref=e60]:
              - generic [ref=e61]: SL
              - button "Sea-level engine 1" [ref=e62]
              - button "Sea-level engine 2" [ref=e64]
              - button "Sea-level engine 3" [ref=e66]
            - group "Vacuum engines" [ref=e68]:
              - generic [ref=e69]: Vac
              - button "Vacuum engine 1" [ref=e70]
              - button "Vacuum engine 2" [ref=e72]
              - button "Vacuum engine 3" [ref=e74]
          - generic [ref=e76]:
            - generic [ref=e77]:
              - generic [ref=e78]: Throttle
              - generic [ref=e79]: "Off"
            - slider "Throttle" [ref=e80] [cursor=pointer]: "40"
          - button "Throttle guard" [ref=e81]:
            - generic [ref=e83]: "Off"
          - generic [ref=e84]: Throttles back to keep the speed under the safe dynamic-pressure limit.
      - region "Flight" [ref=e85]:
        - generic [ref=e86]:
          - button "Flight controls" [expanded] [ref=e87]:
            - generic [ref=e88]: Flight
          - button "Zoom out" [ref=e91]:
            - generic [ref=e92]: −
          - button "Zoom in" [ref=e93]:
            - generic [ref=e94]: +
        - generic [ref=e96]:
          - generic [ref=e97]: Ship
          - generic [ref=e98]:
            - generic [ref=e99]:
              - generic [ref=e100]: Attitude
              - generic [ref=e101]: Right 8 %
            - slider "Attitude" [ref=e102] [cursor=pointer]: "8"
          - group "Autopilot" [ref=e103]:
            - button "Manual" [pressed] [ref=e104]
            - button "Lift off" [ref=e105]
            - button "Boost back" [ref=e106]
            - button "Hold attitude" [ref=e107]
            - button "Land" [ref=e108]
            - button "Deorbit" [ref=e109]
          - group "Systems" [ref=e110]:
            - button "Fins" [ref=e111]
            - button "Reaction control" [ref=e112]
            - button "Dump propellant" [pressed] [ref=e113]
    - region "Flight debrief":
      - generic:
        - generic:
          - generic: Custom
          - heading "Landed" [level=2]
        - button "Close debrief" [ref=e114]:
          - generic [ref=e115]: ×
      - generic [ref=e116]:
        - generic [ref=e117]:
          - generic [ref=e118]: Touchdown
          - generic [ref=e119]: 1.2m/s
          - generic [ref=e120]: Limit 10
        - generic [ref=e121]:
          - generic [ref=e122]: Drift
          - generic [ref=e123]: 0.21m/s
          - generic [ref=e124]: Limit 2
        - generic [ref=e125]:
          - generic [ref=e126]: Tilt
          - generic [ref=e127]: 0.0°
          - generic [ref=e128]: Limit 5.2°
        - generic [ref=e129]:
          - generic [ref=e130]: From the pad
          - generic [ref=e131]: 1m
          - generic [ref=e132]: On the pad
        - generic [ref=e133]:
          - generic [ref=e134]: Flight time
          - generic [ref=e135]: 00:00:13
        - generic [ref=e137]:
          - generic [ref=e138]: Propellant
          - generic [ref=e139]: 13t
          - generic [ref=e140]: left of 1200 t
        - generic [ref=e141]:
          - generic [ref=e142]: Peak Q
          - generic [ref=e143]: 0.9kPa
          - generic [ref=e144]: Limit 50
        - generic [ref=e145]:
          - generic [ref=e146]: Peak skin temperature
          - generic [ref=e147]: 288K
          - generic [ref=e148]: Limit 1533
        - generic [ref=e149]:
          - generic [ref=e150]: Peak g
          - generic [ref=e151]: 3.3g
          - generic [ref=e152]: Limit 13
      - list "Events":
        - listitem: 00:00:00Flip
        - listitem: 00:00:00Landing burn
        - listitem: 00:00:13Touchdown
      - generic:
        - button "Black box" [ref=e153]
        - button "Change scenario" [ref=e154]
        - button "Fly again" [ref=e155]
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
      |                                                                       ^ Error: morning L 64.6 R 43.6 · afternoon L 149.5 R 24.7
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