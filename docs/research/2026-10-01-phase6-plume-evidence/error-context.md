# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plume.spec.ts >> and blooms wider than the ship in vacuum @mobile
- Location: tests/e2e/plume.spec.ts:308:1

# Error details

```
Error: low: 1.09 long, 0.60 across · vacuum: 1.27 long, 0.70 across
frame 1170x1104 @3.00x  altitude 120100 m  vehicle 40 px
  below      mean   47.3  spread  22.08  tones  6  bright 0.007  dark 0.924  warm 0.0184  top #222222:0.36 #332222:0.35 #222211:0.11 #111122:0.04 #333322:0.02
  EXT plume    found true  span 38px (38x38)  band 27px  n 258  box (568,621)-(605,658)  = 0.95 vehicle heights
  |   -                                        |
  |                                            |
  |       +          -:   :       = ==        #|
  |         =             =                   #|
  |        ++               -.                 |
  |        -          +-     -  -.         ==  |
  |      ==                     -.           .+|
  |  ==   == +                      -      *   |
  |                     -+      --  =          |
  |  --                      -   --  -         |
  |.......-.............##.....................|
  |......--...-........#@@#....................|
  |*********************@@******@*************#|
  |=:..................-%%+:.................-=|
  |.....................:=.....................|
  |.....................:=-....................|
  |.....................:-=....................|
  |.....................:::....................|
  |:::..................:::....................|
  |::::....................................::::|
  |:::::::.............................::::::::|
  |:::::::...........................::::::::::|
  aspect: 0.55 low, 0.55 vacuum

expect(received).toBeGreaterThan(expected)

Expected: > 0.7176042091538909
Received:   0.7
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
          - generic [ref=f1e10]: 00:00:11
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
                - generic [ref=f1e53]: "120.4"
                - generic [ref=f1e54]: KM
            - generic [ref=f1e58]:
              - generic [ref=f1e59]: V/S
              - generic [ref=f1e62]:
                - generic [ref=f1e63]: "106"
                - generic [ref=f1e64]: M/S
            - generic [ref=f1e65]:
              - generic [ref=f1e66]: Speed
              - generic [ref=f1e69]:
                - generic [ref=f1e70]: "106"
                - generic [ref=f1e71]: M/S
          - generic [ref=f1e75]:
            - generic [ref=f1e77]:
              - generic [ref=f1e78]: Propellant
              - generic [ref=f1e79]:
                - generic [ref=f1e80]: CH4
                - generic [ref=f1e85]: LOX
              - generic [ref=f1e90]:
                - generic [ref=f1e91]: "181"
                - generic [ref=f1e92]: T
            - generic [ref=f1e93]: Engines
            - generic [ref=f1e109]:
              - generic [ref=f1e110]: Attitude
              - generic [ref=f1e115]:
                - generic [ref=f1e116]: "-5"
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
  296 |   expect(measured.span, message).toBeGreaterThan(1);
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
> 356 |   expect(vacuum.width, shape).toBeGreaterThan(low.width * 1.2);
      |                               ^ Error: low: 1.09 long, 0.60 across · vacuum: 1.27 long, 0.70 across
  357 |   expect(vacuum.width, shape).toBeGreaterThan(0.2);
  358 | });
  359 | 
```