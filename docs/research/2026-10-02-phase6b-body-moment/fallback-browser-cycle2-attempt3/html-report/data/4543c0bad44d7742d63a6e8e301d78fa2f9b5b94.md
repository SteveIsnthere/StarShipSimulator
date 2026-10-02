# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plume.spec.ts >> and blooms wider than the ship in vacuum @mobile
- Location: tests/e2e/plume.spec.ts:297:1

# Error details

```
Error: low: 3.19 long, 0.52 across · vacuum: 1.33 long, 0.59 across
frame 1082x1425 @2.63x  altitude 120000 m  vehicle 71 px
  below      mean   49.2  spread  24.59  tones  8  bright 0.010  dark 0.925  warm 0.0103  top #332222:0.42 #222222:0.32 #333322:0.06 #222211:0.06 #111122:0.03
  EXT plume    found true  span 94px (42x94)  band 42px  n 948  box (527,733)-(568,826)  = 1.32 vehicle heights
  |                                            |
  |                                            |
  | ++              -                 =  =:    |
  |    =                   =                   |
  |   +=                      -                |
  |   -              +-        -   --          |
  |==                              ::          |
  |  =  +                                -     |
  |                     .+          -   =      |
  |                           .-     -    -    |
  |.-..................#@%#....................|
  |--.....-............#@@@....................|
  |*********************@%*********@***********|
  |.....................#+.....................|
  |.....................=+.....................|
  |.....................=-:....................|
  |.....................--:....................|
  |::...................:::...........:::::::::|
  |::::...........................:::::::::::::|
  |:::...........................::::::::::::::|
  |:::....................................:::::|
  |....................:::::...................|
  aspect: 0.16 low, 0.44 vacuum

expect(received).toBeGreaterThan(expected)

Expected: > 0.6192288576588213
Received:   0.5893186003683241
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - generic:
      - banner [ref=f1e5]:
        - generic [ref=f1e6]: Manual
        - generic [ref=f1e8]:
          - generic [ref=f1e9]: T+
          - generic [ref=f1e10]: 00:00:06
        - generic [ref=f1e11]:
          - button "Pause" [ref=f1e12]
          - button "Cinematic" [ref=f1e17]
          - button "Sound" [pressed] [ref=f1e24]
          - button "Black box" [ref=f1e30]
          - button "Menu" [ref=f1e34]
      - region "Flight data" [ref=f1e37]:
        - generic [ref=f1e38]:
          - status [ref=f1e40]:
            - generic [ref=f1e41]: PRE-FLIGHT
            - generic [ref=f1e42]: → LIFTOFF
          - button "Details" [ref=f1e43]
        - status [ref=f1e46]:
          - generic [ref=f1e47]:
            - generic [ref=f1e48]:
              - generic [ref=f1e49]: Altitude
              - generic [ref=f1e52]:
                - generic [ref=f1e53]: "120.0"
                - generic [ref=f1e54]: KM
            - generic [ref=f1e58]:
              - generic [ref=f1e59]: V/S
              - generic [ref=f1e62]:
                - generic [ref=f1e63]: "44"
                - generic [ref=f1e64]: M/S
            - generic [ref=f1e65]:
              - generic [ref=f1e66]: Speed
              - generic [ref=f1e69]:
                - generic [ref=f1e70]: "43"
                - generic [ref=f1e71]: M/S
          - generic [ref=f1e75]:
            - generic [ref=f1e77]:
              - generic [ref=f1e78]: Propellant
              - generic [ref=f1e79]:
                - generic [ref=f1e80]: CH4
                - generic [ref=f1e85]: LOX
              - generic [ref=f1e90]:
                - generic [ref=f1e91]: "191"
                - generic [ref=f1e92]: T
            - generic [ref=f1e93]: Engines
            - generic [ref=f1e109]:
              - generic [ref=f1e110]: Attitude
              - generic [ref=f1e115]:
                - generic [ref=f1e116]: "-2"
                - generic [ref=f1e117]: °
      - region "Trajectory map" [ref=f1e118]:
        - button "Trajectory" [ref=f1e119]
      - generic [ref=f1e122]:
        - region "Engines" [ref=f1e123]:
          - generic [ref=f1e125]:
            - generic [ref=f1e126]:
              - button "Engines" [pressed] [ref=f1e127]
              - group "Sea-level engines" [ref=f1e129]:
                - generic [ref=f1e130]: SL
                - button "Sea-level engine 1" [pressed] [ref=f1e131]
                - button "Sea-level engine 2" [pressed] [ref=f1e133]
                - button "Sea-level engine 3" [pressed] [ref=f1e135]
              - group "Vacuum engines" [ref=f1e137]:
                - generic [ref=f1e138]: Vac
                - button "Vacuum engine 1" [ref=f1e139]
                - button "Vacuum engine 2" [ref=f1e141]
                - button "Vacuum engine 3" [ref=f1e143]
            - generic [ref=f1e145]:
              - generic [ref=f1e146]:
                - generic [ref=f1e147]: Throttle
                - generic [ref=f1e148]: 100 %
              - slider "Throttle" [ref=f1e150] [cursor=pointer]: "100"
            - button "Throttle guard" [ref=f1e151]:
              - generic [ref=f1e153]: "Off"
            - generic [ref=f1e154]: Throttles back to keep the speed under the safe dynamic-pressure limit.
        - navigation "Controls" [ref=f1e155]:
          - button "Engines controls" [expanded] [ref=f1e156]: Engines
          - button "Flight controls" [ref=f1e157]: Flight
          - button "Zoom out" [ref=f1e158]:
            - generic [ref=f1e159]: −
          - button "Zoom in" [ref=f1e160]:
            - generic [ref=f1e161]: +
  - button "select to enable accessibility for this content" [ref=f1e162]
```

# Test source

```ts
  245 |   expect(new Set(sampleSteps).size, 'four distinct flight frames').toBe(4);
  246 |   const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  247 |   const span = median(spans);
  248 |   const width = median(widths);
  249 |   /*
  250 |     PRINTED ON SUCCESS, not only on failure.
  251 | 
  252 |     These two numbers are what the spec is for, and until the particle-drag debt
  253 |     was cleared they were only ever visible when they had already gone wrong: the
  254 |     measurement lives in an `expect` message, and a passing `expect` says
  255 |     nothing. The debt's acceptance line asks for before-and-after numbers on both
  256 |     plume specs, which is impossible to satisfy from a green run that prints no
  257 |     numbers. One line per measurement, with the project on it, and the medians
  258 |     beside the samples they came from.
  259 |   */
  260 |   const info = test.info();
  261 |   console.log(
  262 |     `[plume] ${info.project.name} · ${info.title}: ` +
  263 |       `${span.toFixed(2)} long, ${width.toFixed(2)} across ` +
  264 |       `(spans ${spans.map((n) => n.toFixed(2)).join('/')}, ` +
  265 |       `widths ${widths.map((n) => n.toFixed(2)).join('/')}, ` +
  266 |       `steps ${sampleSteps.join("/")}; ${clamped}/4 anchored to the region edge; throttle ${throttles.join('/')}; ${boxes.join(' ')})`,
  267 |   );
  268 |   return { span, width, last };
  269 | }
  270 | 
  271 | test('the plume is longer than the ship at low altitude @mobile', async ({ page }) => {
  272 |   test.setTimeout(180_000);
  273 |   await page.goto('/?debug=1', { waitUntil: 'load' });
  274 |   await ready(page);
  275 |   await underPowerAt(page, '2000');
  276 | 
  277 |   const measured = await plume(page);
  278 |   const message =
  279 |     `plume spans ${measured.span.toFixed(2)} ship-lengths, ${measured.width.toFixed(2)} across\n` +
  280 |     measured.last;
  281 | 
  282 |   // The acceptance line's number. Measured at about 2.5; the single 2021 emitter
  283 |   // measured 0.26 on the same frame, and its arithmetic says it could not have
  284 |   // done better than 0.44.
  285 |   expect(measured.span, message).toBeGreaterThan(1);
  286 |   /*
  287 |     And not a beam. Six rather than four, because the portrait phone projects
  288 |     measure 3 to 4.2 where the desktop measures 2.5: their frames are 2202 px
  289 |     tall against a 135 px vehicle, so the measurement box holds nearly eight
  290 |     ship-lengths and catches the faint tail the desktop box clips. The
  291 |     arithmetic says the core carries a particle 2.7 ship-lengths; what varies
  292 |     between projects is how much of the fade is above the luma floor.
  293 |   */
  294 |   expect(measured.span, message).toBeLessThan(6);
  295 | });
  296 | 
  297 | test('and blooms wider than the ship in vacuum @mobile', async ({ page }) => {
  298 |   test.setTimeout(240_000);
  299 | 
  300 |   await page.goto('/?debug=1', { waitUntil: 'load' });
  301 |   await ready(page);
  302 |   await underPowerAt(page, '2000');
  303 |   const low = await plume(page);
  304 | 
  305 |   await page.goto('/?debug=1', { waitUntil: 'load' });
  306 |   await ready(page);
  307 |   await underPowerAt(page, '120000');
  308 |   const vacuum = await plume(page);
  309 | 
  310 |   const message =
  311 |     `low: ${low.span.toFixed(2)} long, ${low.width.toFixed(2)} across · ` +
  312 |     `vacuum: ${vacuum.span.toFixed(2)} long, ${vacuum.width.toFixed(2)} across\n${vacuum.last}`;
  313 | 
  314 |   /*
  315 |     The most recognisable thing about watching an ascent, as a number: the same
  316 |     engine draws a PENCIL at sea level and a BELL in vacuum.
  317 | 
  318 |     WIDTH IN SHIP-LENGTHS, measured in a band anchored to the nozzle — see
  319 |     `CONE_DEPTH_SHIP_LENGTHS` for why the whole-plume width says nothing and why
  320 |     the fixed viewport strip that preceded it said it too unreliably.
  321 | 
  322 |     RE-MEASURED when the particle-drag debt was cleared, because the numbers
  323 |     that used to be here were taken through the old strip and are not comparable
  324 |     with these. Ten runs, five projects twice each, sea level -> vacuum:
  325 | 
  326 |       desktop           0.46, 0.53  ->  0.92, 0.92
  327 |       Pixel portrait    0.66, 0.78  ->  1.38, 1.14
  328 |       Pixel landscape   0.74, 0.69  ->  1.07, 0.93
  329 |       iPhone portrait   0.73, 0.72  ->  1.08, 1.25
  330 |       iPhone landscape  0.77, 0.79  ->  1.30, 1.10
  331 | 
  332 |     Ratios of 1.35 to 2.09 against a bound of 1.2 — the worst case has 12% of
  333 |     margin, where the same ten runs through the old strip ranged 1.10 to 1.62
  334 |     and failed this bound twice. The instrument moved, not the picture.
  335 | 
  336 |     Aspect — width over length — was tried as the more shape-like statistic and
  337 |     is worse: in vacuum the black sky lets the faint tail register so the LENGTH
  338 |     grows too, which put the desktop project at exactly 1.25 with nothing to
  339 |     spare.
  340 |   */
  341 |   const shape =
  342 |     `${message}\n  aspect: ${(low.width / low.span).toFixed(2)} low, ` +
  343 |     `${(vacuum.width / vacuum.span).toFixed(2)} vacuum`;
  344 |   console.log(shape);
> 345 |   expect(vacuum.width, shape).toBeGreaterThan(low.width * 1.2);
      |                               ^ Error: low: 3.19 long, 0.52 across · vacuum: 1.33 long, 0.59 across
  346 |   expect(vacuum.width, shape).toBeGreaterThan(0.2);
  347 | });
  348 | 
```