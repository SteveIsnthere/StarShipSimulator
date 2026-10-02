# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plume.spec.ts >> the plume is longer than the ship at low altitude @mobile
- Location: tests/e2e/plume.spec.ts:282:1

# Error details

```
Error: plume spans 0.73 ship-lengths, 0.44 across
frame 1170x1104 @3.00x  altitude 2200 m  vehicle 124 px
  below      mean  120.7  spread  29.17  tones  6  bright 0.149  dark 0.006  warm 0.0463  top #776644:0.18 #665544:0.17 #776655:0.16 #887755:0.09 #88aadd:0.07
  EXT plume    found true  span 216px (82x216)  band 32px  n 1868  box (561,576)-(642,791)  = 1.74 vehicle heights
  |+++********+++++=++++++++***##***+++++++++++|
  |+++**####***+++++++**++++********++++++++***|
  |**++++++++++++++++++++++++++++++++++++++****|
  |***++++++++++++++*********+++++++++++++++++*|
  |**+++++++++++++++*********++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++|
  |********************************************|
  |********************************************|
  |*********************@@*********************|
  |*********************@@*********************|
  |####################%@@%####################|
  |*********************@@*******###***********|
  |+++++++++++++++++++++@@@++++++++++++++++++++|
  |====================+*@++===================|
  |+++===================*=-===================|
  |++++==================*%-=================++|
  |+++++++===============+===============++++++|
  |+++++++==============-+*==============++++++|
  |++++++================+===============++++++|
  |++++++================+++===================|

expect(received).toBeGreaterThan(expected)

Expected: > 1
Received:   0.734801695647775
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
          - generic [ref=e10]: 00:00:14
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
                - generic [ref=e53]: "2.6"
                - generic [ref=e54]: KM
            - generic [ref=e58]:
              - generic [ref=e59]: V/S
              - generic [ref=e62]:
                - generic [ref=e63]: "130"
                - generic [ref=e64]: M/S
            - generic [ref=e65]:
              - generic [ref=e66]: Speed
              - generic [ref=e69]:
                - generic [ref=e70]: "130"
                - generic [ref=e71]: M/S
          - generic [ref=e75]:
            - generic [ref=e77]:
              - generic [ref=e78]: Propellant
              - generic [ref=e79]:
                - generic [ref=e80]: CH4
                - generic [ref=e85]: LOX
              - generic [ref=e90]:
                - generic [ref=e91]: "174"
                - generic [ref=e92]: T
            - generic [ref=e93]: Engines
            - generic [ref=e109]:
              - generic [ref=e110]: Attitude
              - generic [ref=e115]:
                - generic [ref=e116]: "-5"
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
  196 |     and one measured 0.85. A plume is stochastic — its width at an instant is
  197 |     where a few hundred pooled particles happen to be — so the right answer
  198 |     looks like a better estimator rather than a looser bound.
  199 | 
  200 |     It is not available here. Each sample is a screenshot plus an in-page decode,
  201 |     which under software WebGL costs the better part of a second of FLIGHT, and
  202 |     the subject is a vehicle under full thrust. Seven samples carried it from
  203 |     2000 m to 4800 m and clean out of the measurement box — "no plume at all",
  204 |     which is true and is not the question. Cutting the spacing from 350 ms to
  205 |     120 ms changed nothing, because the wait was never what the time was going
  206 |     on. More evidence costs altitude, and altitude is the thing being measured
  207 |     against.
  208 |   */
  209 |   for (let i = 0; i < 4; i++) {
  210 |     /*
  211 |       THE SCALE FIRST, because the band is asked for in image pixels and its
  212 |       depth is a ship-length. The vehicle moves between the two calls; at four
  213 |       tenths of a ship-length the difference that makes is a pixel or two, and
  214 |       the alternative — publishing the scale into the page so one round trip
  215 |       could do both — is a production change for a test's convenience.
  216 |     */
  217 |     const scale = await metrePixels(page);
  218 |     /*
  219 |       THE SUBJECT, RE-CHECKED ON EVERY FRAME. The failure this spec spent three
  220 |       milestones on was never a plume that got shorter; it was a throttle that
  221 |       came off while the camera was running, and nothing in the assertion could
  222 |       see the difference. Now a sample taken off full thrust fails as itself.
  223 |     */
  224 |     throttles.push(
  225 |       Number(await page.locator(byTestId(readoutValueTestId('throttle'))).textContent()),
  226 |     );
  227 |     const report = await readFrame(page, {
  228 |       regions: { below: BELOW },
  229 |       extents: {
  230 |         plume: { ...PLUME, topBandPx: CONE_DEPTH_SHIP_LENGTHS * scale.vehicleHeightPx },
  231 |       },
  232 |       map: { cols: 44, rows: 22 },
  233 |     });
  234 |     const found = report.extents['plume']!;
  235 |     expect(found.found, `no plume at all\n${describeFrame(report, scale)}`).toBe(true);
  236 |     spans.push(inVehicleHeights(found, scale));
  237 |     widths.push(found.bandWidthPx / scale.vehicleHeightPx);
  238 |     /*
  239 |       THE ONE WAY THE ANCHOR CAN LIE, counted rather than left implied.
  240 | 
  241 |       The band starts at the plume's topmost lit row, and that row is clipped to
  242 |       the top of `BELOW`. If the camera ever lags far enough that the nozzle
  243 |       sits above y = 0.52, the anchor is the region edge and the band is a fixed
  244 |       viewport strip again — the very thing it replaced. It is not a wrong
  245 |       answer, it is a less well-aimed one, and the count goes in the line this
  246 |       helper prints so a drifting number has somewhere to be explained from.
  247 |     */
  248 |     if (found.top <= Math.round(BELOW.y * report.imageHeight)) clamped += 1;
  249 |     boxes.push(`(${found.left},${found.top})-(${found.right},${found.bottom})n${found.count}`);
  250 |     last = describeFrame(report, scale);
  251 |     await page.waitForTimeout(350);
  252 |   }
  253 |   expect(
  254 |     Math.min(...throttles),
  255 |     `the throttle came off mid-measurement: ${throttles.join('/')}`,
  256 |   ).toBeGreaterThan(90);
  257 |   const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  258 |   const span = median(spans);
  259 |   const width = median(widths);
  260 |   /*
  261 |     PRINTED ON SUCCESS, not only on failure.
  262 | 
  263 |     These two numbers are what the spec is for, and until the particle-drag debt
  264 |     was cleared they were only ever visible when they had already gone wrong: the
  265 |     measurement lives in an `expect` message, and a passing `expect` says
  266 |     nothing. The debt's acceptance line asks for before-and-after numbers on both
  267 |     plume specs, which is impossible to satisfy from a green run that prints no
  268 |     numbers. One line per measurement, with the project on it, and the medians
  269 |     beside the samples they came from.
  270 |   */
  271 |   const info = test.info();
  272 |   console.log(
  273 |     `[plume] ${info.project.name} · ${info.title}: ` +
  274 |       `${span.toFixed(2)} long, ${width.toFixed(2)} across ` +
  275 |       `(spans ${spans.map((n) => n.toFixed(2)).join('/')}, ` +
  276 |       `widths ${widths.map((n) => n.toFixed(2)).join('/')}, ` +
  277 |       `${clamped}/4 anchored to the region edge; throttle ${throttles.join('/')}; ${boxes.join(' ')})`,
  278 |   );
  279 |   return { span, width, last };
  280 | }
  281 | 
  282 | test('the plume is longer than the ship at low altitude @mobile', async ({ page }) => {
  283 |   test.setTimeout(180_000);
  284 |   await page.goto('/', { waitUntil: 'load' });
  285 |   await ready(page);
  286 |   await underPowerAt(page, '2000');
  287 | 
  288 |   const measured = await plume(page);
  289 |   const message =
  290 |     `plume spans ${measured.span.toFixed(2)} ship-lengths, ${measured.width.toFixed(2)} across\n` +
  291 |     measured.last;
  292 | 
  293 |   // The acceptance line's number. Measured at about 2.5; the single 2021 emitter
  294 |   // measured 0.26 on the same frame, and its arithmetic says it could not have
  295 |   // done better than 0.44.
> 296 |   expect(measured.span, message).toBeGreaterThan(1);
      |                                  ^ Error: plume spans 0.73 ship-lengths, 0.44 across
  297 |   /*
  298 |     And not a beam. Six rather than four, because the portrait phone projects
  299 |     measure 3 to 4.2 where the desktop measures 2.5: their frames are 2202 px
  300 |     tall against a 135 px vehicle, so the measurement box holds nearly eight
  301 |     ship-lengths and catches the faint tail the desktop box clips. The
  302 |     arithmetic says the core carries a particle 2.7 ship-lengths; what varies
  303 |     between projects is how much of the fade is above the luma floor.
  304 |   */
  305 |   expect(measured.span, message).toBeLessThan(6);
  306 | });
  307 | 
  308 | test('and blooms wider than the ship in vacuum @mobile', async ({ page }) => {
  309 |   test.setTimeout(240_000);
  310 | 
  311 |   await page.goto('/', { waitUntil: 'load' });
  312 |   await ready(page);
  313 |   await underPowerAt(page, '2000');
  314 |   const low = await plume(page);
  315 | 
  316 |   await page.goto('/', { waitUntil: 'load' });
  317 |   await ready(page);
  318 |   await underPowerAt(page, '120000');
  319 |   const vacuum = await plume(page);
  320 | 
  321 |   const message =
  322 |     `low: ${low.span.toFixed(2)} long, ${low.width.toFixed(2)} across · ` +
  323 |     `vacuum: ${vacuum.span.toFixed(2)} long, ${vacuum.width.toFixed(2)} across\n${vacuum.last}`;
  324 | 
  325 |   /*
  326 |     The most recognisable thing about watching an ascent, as a number: the same
  327 |     engine draws a PENCIL at sea level and a BELL in vacuum.
  328 | 
  329 |     WIDTH IN SHIP-LENGTHS, measured in a band anchored to the nozzle — see
  330 |     `CONE_DEPTH_SHIP_LENGTHS` for why the whole-plume width says nothing and why
  331 |     the fixed viewport strip that preceded it said it too unreliably.
  332 | 
  333 |     RE-MEASURED when the particle-drag debt was cleared, because the numbers
  334 |     that used to be here were taken through the old strip and are not comparable
  335 |     with these. Ten runs, five projects twice each, sea level -> vacuum:
  336 | 
  337 |       desktop           0.46, 0.53  ->  0.92, 0.92
  338 |       Pixel portrait    0.66, 0.78  ->  1.38, 1.14
  339 |       Pixel landscape   0.74, 0.69  ->  1.07, 0.93
  340 |       iPhone portrait   0.73, 0.72  ->  1.08, 1.25
  341 |       iPhone landscape  0.77, 0.79  ->  1.30, 1.10
  342 | 
  343 |     Ratios of 1.35 to 2.09 against a bound of 1.2 — the worst case has 12% of
  344 |     margin, where the same ten runs through the old strip ranged 1.10 to 1.62
  345 |     and failed this bound twice. The instrument moved, not the picture.
  346 | 
  347 |     Aspect — width over length — was tried as the more shape-like statistic and
  348 |     is worse: in vacuum the black sky lets the faint tail register so the LENGTH
  349 |     grows too, which put the desktop project at exactly 1.25 with nothing to
  350 |     spare.
  351 |   */
  352 |   const shape =
  353 |     `${message}\n  aspect: ${(low.width / low.span).toFixed(2)} low, ` +
  354 |     `${(vacuum.width / vacuum.span).toFixed(2)} vacuum`;
  355 |   console.log(shape);
  356 |   expect(vacuum.width, shape).toBeGreaterThan(low.width * 1.2);
  357 |   expect(vacuum.width, shape).toBeGreaterThan(0.2);
  358 | });
  359 | 
```