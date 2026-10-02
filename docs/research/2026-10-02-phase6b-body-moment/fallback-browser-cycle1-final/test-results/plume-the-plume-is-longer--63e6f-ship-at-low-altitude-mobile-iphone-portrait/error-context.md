# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plume.spec.ts >> the plume is longer than the ship at low altitude @mobile
- Location: tests/e2e/plume.spec.ts:242:1

# Error details

```
Error: plume spans 0.92 ship-lengths, 0.36 across
frame 1170x1104 @3.00x  altitude 2000 m  vehicle 132 px
  below      mean  121.6  spread  28.67  tones  7  bright 0.160  dark 0.000  warm 0.0316  top #776644:0.20 #776655:0.16 #665544:0.14 #887755:0.08 #88aadd:0.07
  EXT plume    found true  span 155px (77x155)  band 48px  n 3207  box (550,578)-(626,732)  = 1.17 vehicle heights
  |####***++++==++**+++***#***+++++++++++++++++|
  |####**+++++++++++++++++++++++++++++***####**|
  |+++++++++++++++++++++++++++++++++++****##***|
  |++++++++++++*********+++++++++++++++++++++++|
  |++++++++++++********++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++|
  |********************************************|
  |*********************@%*********************|
  |********************@@@@********************|
  |*********************@@*********************|
  |#####################@@#####################|
  |*******************###@******###************|
  |+++++++++++++++++++++*@+++++++++++++++++++++|
  |==============+++====++===========++++++++++|
  |++==================-+*-====================|
  |+++==================+*==================+++|
  |++++++===============++==============+++++++|
  |++++++==============-=++=============+++++++|
  |+++++=================+==============+++++++|
  |+++++=======================================|

expect(received).toBeGreaterThan(expected)

Expected: > 1
Received:   0.9156261427575323
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
          - generic [ref=e10]: 00:00:06
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
            - generic [ref=e42]: → LIFTOFF
          - button "Details" [ref=e43]
        - status [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: Altitude
              - generic [ref=e52]:
                - generic [ref=e53]: "2.0"
                - generic [ref=e54]: KM
            - generic [ref=e58]:
              - generic [ref=e59]: V/S
              - generic [ref=e62]:
                - generic [ref=e63]: "33"
                - generic [ref=e64]: M/S
            - generic [ref=e65]:
              - generic [ref=e66]: Speed
              - generic [ref=e69]:
                - generic [ref=e70]: "32"
                - generic [ref=e71]: M/S
          - generic [ref=e75]:
            - generic [ref=e77]:
              - generic [ref=e78]: Propellant
              - generic [ref=e79]:
                - generic [ref=e80]: CH4
                - generic [ref=e85]: LOX
              - generic [ref=e90]:
                - generic [ref=e91]: "191"
                - generic [ref=e92]: T
            - generic [ref=e93]: Engines
            - generic [ref=e109]:
              - generic [ref=e110]: Attitude
              - generic [ref=e115]:
                - generic [ref=e116]: "-2"
                - generic [ref=e117]: °
      - region "Trajectory map" [ref=e118]:
        - button "Trajectory" [ref=e119]
      - generic [ref=e122]:
        - region "Engines" [ref=e123]:
          - generic [ref=e125]:
            - generic [ref=e126]:
              - button "Engines" [pressed] [ref=e127]
              - group "Sea-level engines" [ref=e129]:
                - generic [ref=e130]: SL
                - button "Sea-level engine 1" [pressed] [ref=e131]
                - button "Sea-level engine 2" [pressed] [ref=e133]
                - button "Sea-level engine 3" [pressed] [ref=e135]
              - group "Vacuum engines" [ref=e137]:
                - generic [ref=e138]: Vac
                - button "Vacuum engine 1" [ref=e139]
                - button "Vacuum engine 2" [ref=e141]
                - button "Vacuum engine 3" [ref=e143]
            - generic [ref=e145]:
              - generic [ref=e146]:
                - generic [ref=e147]: Throttle
                - generic [ref=e148]: 100 %
              - slider "Throttle" [ref=e150] [cursor=pointer]: "100"
            - button "Throttle guard" [ref=e151]:
              - generic [ref=e153]: "Off"
            - generic [ref=e154]: Throttles back to keep the speed under the safe dynamic-pressure limit.
        - navigation "Controls" [ref=e155]:
          - button "Engines controls" [expanded] [ref=e156]: Engines
          - button "Flight controls" [ref=e157]: Flight
          - button "Zoom out" [ref=e158]:
            - generic [ref=e159]: −
          - button "Zoom in" [ref=e160]:
            - generic [ref=e161]: +
  - button "select to enable accessibility for this content" [ref=e162]
```

# Test source

```ts
  156 |   let clamped = 0;
  157 |   const throttles: number[] = [];
  158 |   const boxes: string[] = [];
  159 |   let last = '';
  160 |   let lastSampleStep = -1;
  161 |   const sampleSteps: number[] = [];
  162 |   // Keep four samples and the 350ms wall-time interval between them. Pause only while
  163 |   // photographing each subject/background pair so their geometry is identical.
  164 |   for (let i = 0; i < 4; i++) {
  165 |     // Four frames means four different simulation states. Under software
  166 |     // rendering 350ms can expire before the resumed loop draws another frame.
  167 |     await expect.poll(() => page.evaluate(() => Number((window as unknown as {
  168 |       __simDebug: { telemetry(): Record<string, number | boolean> }
  169 |     }).__simDebug.telemetry()['world.updatedFrameCount']))).toBeGreaterThan(lastSampleStep);
  170 |     await page.evaluate(() => (window as unknown as { __simDebug: { pause(): void } }).__simDebug.pause());
  171 |     await painted(page);
  172 |     try {
  173 |       lastSampleStep = await page.evaluate(() => Number((window as unknown as {
  174 |         __simDebug: { telemetry(): Record<string, number | boolean> }
  175 |       }).__simDebug.telemetry()['world.updatedFrameCount']));
  176 |       sampleSteps.push(lastSampleStep);
  177 |       const scale = await metrePixels(page);
  178 |       throttles.push(
  179 |         Number(await page.locator(byTestId(readoutValueTestId('throttle'))).textContent()),
  180 |       );
  181 |       const geometry = await page.evaluate(() => (window as unknown as {
  182 |         __simDebug: { presentation(): { nozzleY: number; height: number } }
  183 |       }).__simDebug.presentation());
  184 |       const below: Region = { ...BELOW, y: geometry.nozzleY / geometry.height,
  185 |         height: 0.99 - geometry.nozzleY / geometry.height };
  186 |       expect(below.y, 'the nozzle must be inside the measurement canvas').toBeGreaterThan(0);
  187 |       expect(below.height, 'the nozzle must leave room for exhaust').toBeGreaterThan(0);
  188 |       await particlesVisible(page, false);
  189 |       const background = await captureCanvas(page);
  190 |       await particlesVisible(page, true);
  191 |       const report = await readFrame(page, {
  192 |         regions: { below: BELOW },
  193 |         extents: {
  194 |           plume: { ...PLUME, region: below, topBandPx: CONE_DEPTH_SHIP_LENGTHS * scale.vehicleHeightPx },
  195 |         },
  196 |         map: { cols: 44, rows: 22 },
  197 |       }, background);
  198 |       const found = report.extents['plume']!;
  199 |       expect(found.found, `no plume at all\n${describeFrame(report, scale)}`).toBe(true);
  200 |       spans.push(inVehicleHeights(found, scale));
  201 |       widths.push(found.bandWidthPx / scale.vehicleHeightPx);
  202 |       // Report how often the detected core starts right at the nozzle plane.
  203 |       if (found.top <= Math.round(below.y * report.imageHeight)) clamped += 1;
  204 |       boxes.push(`(${found.left},${found.top})-(${found.right},${found.bottom})n${found.count}`);
  205 |       last = describeFrame(report, scale);
  206 |     } finally {
  207 |       await particlesVisible(page, true);
  208 |       await page.evaluate(() => (window as unknown as { __simDebug: { resume(): void } }).__simDebug.resume());
  209 |     }
  210 |     await page.waitForTimeout(350);
  211 |   }
  212 |   expect(
  213 |     Math.min(...throttles),
  214 |     `the throttle came off mid-measurement: ${throttles.join('/')}`,
  215 |   ).toBeGreaterThan(90);
  216 |   expect(new Set(sampleSteps).size, 'four distinct flight frames').toBe(4);
  217 |   const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  218 |   const span = median(spans);
  219 |   const width = median(widths);
  220 |   /*
  221 |     PRINTED ON SUCCESS, not only on failure.
  222 | 
  223 |     These two numbers are what the spec is for, and until the particle-drag debt
  224 |     was cleared they were only ever visible when they had already gone wrong: the
  225 |     measurement lives in an `expect` message, and a passing `expect` says
  226 |     nothing. The debt's acceptance line asks for before-and-after numbers on both
  227 |     plume specs, which is impossible to satisfy from a green run that prints no
  228 |     numbers. One line per measurement, with the project on it, and the medians
  229 |     beside the samples they came from.
  230 |   */
  231 |   const info = test.info();
  232 |   console.log(
  233 |     `[plume] ${info.project.name} · ${info.title}: ` +
  234 |       `${span.toFixed(2)} long, ${width.toFixed(2)} across ` +
  235 |       `(spans ${spans.map((n) => n.toFixed(2)).join('/')}, ` +
  236 |       `widths ${widths.map((n) => n.toFixed(2)).join('/')}, ` +
  237 |       `steps ${sampleSteps.join("/")}; ${clamped}/4 anchored to the region edge; throttle ${throttles.join('/')}; ${boxes.join(' ')})`,
  238 |   );
  239 |   return { span, width, last };
  240 | }
  241 | 
  242 | test('the plume is longer than the ship at low altitude @mobile', async ({ page }) => {
  243 |   test.setTimeout(180_000);
  244 |   await page.goto('/?debug=1', { waitUntil: 'load' });
  245 |   await ready(page);
  246 |   await underPowerAt(page, '2000');
  247 | 
  248 |   const measured = await plume(page);
  249 |   const message =
  250 |     `plume spans ${measured.span.toFixed(2)} ship-lengths, ${measured.width.toFixed(2)} across\n` +
  251 |     measured.last;
  252 | 
  253 |   // The acceptance line's number. Measured at about 2.5; the single 2021 emitter
  254 |   // measured 0.26 on the same frame, and its arithmetic says it could not have
  255 |   // done better than 0.44.
> 256 |   expect(measured.span, message).toBeGreaterThan(1);
      |                                  ^ Error: plume spans 0.92 ship-lengths, 0.36 across
  257 |   /*
  258 |     And not a beam. Six rather than four, because the portrait phone projects
  259 |     measure 3 to 4.2 where the desktop measures 2.5: their frames are 2202 px
  260 |     tall against a 135 px vehicle, so the measurement box holds nearly eight
  261 |     ship-lengths and catches the faint tail the desktop box clips. The
  262 |     arithmetic says the core carries a particle 2.7 ship-lengths; what varies
  263 |     between projects is how much of the fade is above the luma floor.
  264 |   */
  265 |   expect(measured.span, message).toBeLessThan(6);
  266 | });
  267 | 
  268 | test('and blooms wider than the ship in vacuum @mobile', async ({ page }) => {
  269 |   test.setTimeout(240_000);
  270 | 
  271 |   await page.goto('/?debug=1', { waitUntil: 'load' });
  272 |   await ready(page);
  273 |   await underPowerAt(page, '2000');
  274 |   const low = await plume(page);
  275 | 
  276 |   await page.goto('/?debug=1', { waitUntil: 'load' });
  277 |   await ready(page);
  278 |   await underPowerAt(page, '120000');
  279 |   const vacuum = await plume(page);
  280 | 
  281 |   const message =
  282 |     `low: ${low.span.toFixed(2)} long, ${low.width.toFixed(2)} across · ` +
  283 |     `vacuum: ${vacuum.span.toFixed(2)} long, ${vacuum.width.toFixed(2)} across\n${vacuum.last}`;
  284 | 
  285 |   /*
  286 |     The most recognisable thing about watching an ascent, as a number: the same
  287 |     engine draws a PENCIL at sea level and a BELL in vacuum.
  288 | 
  289 |     WIDTH IN SHIP-LENGTHS, measured in a band anchored to the nozzle — see
  290 |     `CONE_DEPTH_SHIP_LENGTHS` for why the whole-plume width says nothing and why
  291 |     the fixed viewport strip that preceded it said it too unreliably.
  292 | 
  293 |     RE-MEASURED when the particle-drag debt was cleared, because the numbers
  294 |     that used to be here were taken through the old strip and are not comparable
  295 |     with these. Ten runs, five projects twice each, sea level -> vacuum:
  296 | 
  297 |       desktop           0.46, 0.53  ->  0.92, 0.92
  298 |       Pixel portrait    0.66, 0.78  ->  1.38, 1.14
  299 |       Pixel landscape   0.74, 0.69  ->  1.07, 0.93
  300 |       iPhone portrait   0.73, 0.72  ->  1.08, 1.25
  301 |       iPhone landscape  0.77, 0.79  ->  1.30, 1.10
  302 | 
  303 |     Ratios of 1.35 to 2.09 against a bound of 1.2 — the worst case has 12% of
  304 |     margin, where the same ten runs through the old strip ranged 1.10 to 1.62
  305 |     and failed this bound twice. The instrument moved, not the picture.
  306 | 
  307 |     Aspect — width over length — was tried as the more shape-like statistic and
  308 |     is worse: in vacuum the black sky lets the faint tail register so the LENGTH
  309 |     grows too, which put the desktop project at exactly 1.25 with nothing to
  310 |     spare.
  311 |   */
  312 |   const shape =
  313 |     `${message}\n  aspect: ${(low.width / low.span).toFixed(2)} low, ` +
  314 |     `${(vacuum.width / vacuum.span).toFixed(2)} vacuum`;
  315 |   console.log(shape);
  316 |   expect(vacuum.width, shape).toBeGreaterThan(low.width * 1.2);
  317 |   expect(vacuum.width, shape).toBeGreaterThan(0.2);
  318 | });
  319 | 
```