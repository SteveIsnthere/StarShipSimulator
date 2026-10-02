# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plume.spec.ts >> and blooms wider than the ship in vacuum @mobile
- Location: tests/e2e/plume.spec.ts:256:1

# Error details

```
Error: low: 2.16 long, 0.39 across · vacuum: 1.75 long, 0.42 across
frame 1280x720 @1.00x  altitude 120000 m  vehicle 36 px
  below      mean   48.6  spread  18.38  tones  6  bright 0.002  dark 0.944  warm 0.0054  top #332222:0.54 #222222:0.18 #333322:0.13 #111122:0.04 #222211:0.02
  EXT plume    found true  span 63px (25x63)  band 17px  n 180  box (623,370)-(647,432)  = 1.75 vehicle heights
  |      :   -                            -    |
  |                                            |
  |             +      -      = =    #         |
  |        :     .       ==            --      |
  |        =     +         -                   |
  |              -     +-  : -      =    -     |
  |            ==            .       +     -   |
  |  +    -  =  =++            -    * ==       |
  |    =                 +   - =      ==       |
  |   -      -             -  - -      -       |
  |.............-.......@%.....................|
  |.....=-......-.-:....@@.....................|
  |++*******************@@***@*******%*******++|
  |******...............@*...............******|
  |.....................++.....................|
  |.....................+-.....................|
  |.....................--.....................|
  |.....................:-.....................|
  |..:::::::::::...........::::::::::..........|
  |.:::::::::::::........:::::::::::::........:|
  |.:::::::::::::........:::::::::::::........:|
  |....::::::::::.....::....::::::::::.....::..|
  aspect: 0.18 low, 0.24 vacuum

expect(received).toBeGreaterThan(expected)

Expected: > 0.46916380868567764
Received:   0.4166666666666667
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - generic:
    - banner [ref=f1e5]:
      - generic [ref=f1e6]:
        - generic [ref=f1e7]: Starship
        - generic [ref=f1e8]: Landing Burn, edited
        - generic [ref=f1e9]: Manual
      - generic [ref=f1e10]:
        - generic [ref=f1e11]: T+
        - generic [ref=f1e12]: 00:00:06
      - generic [ref=f1e13]:
        - button "Pause" [ref=f1e14]:
          - text: Pause
          - generic [ref=f1e15]: P
        - button "Cinematic" [ref=f1e17]
        - button "Sound" [pressed] [ref=f1e25]
        - button "Black box" [ref=f1e32]
        - button "Menu" [ref=f1e37]:
          - text: Menu
          - generic [ref=f1e38]: Esc
    - region "Flight data" [ref=f1e40]:
      - generic [ref=f1e41]:
        - generic [ref=f1e42]:
          - list [ref=f1e43]:
            - listitem [ref=f1e44]:
              - generic [ref=f1e45]: LIFTOFF
            - listitem [ref=f1e49]:
              - generic [ref=f1e50]: MAX-Q
            - listitem [ref=f1e54]:
              - generic [ref=f1e55]: MECO
            - listitem [ref=f1e59]:
              - generic [ref=f1e60]: APOGEE
            - listitem [ref=f1e64]:
              - generic [ref=f1e65]: ENTRY
            - listitem [ref=f1e69]:
              - generic [ref=f1e70]: FLIP
            - listitem [ref=f1e74]:
              - generic [ref=f1e75]: LANDING BURN
            - listitem [ref=f1e79]:
              - generic [ref=f1e80]: TOUCHDOWN
          - status [ref=f1e83]: PRE-FLIGHT→ LIFTOFF
        - button "Details" [expanded] [ref=f1e84]
      - status [ref=f1e87]:
        - generic [ref=f1e88]:
          - generic [ref=f1e89]:
            - generic [ref=f1e90]:
              - generic [ref=f1e91]: Altitude
              - generic [ref=f1e92]:
                - generic [ref=f1e93]: Dial range
                - text: 0–200KM
            - generic [ref=f1e98]:
              - generic [ref=f1e99]: "120.0"
              - generic [ref=f1e100]: KM
          - generic [ref=f1e101]:
            - generic [ref=f1e102]: Vertical speed
            - generic [ref=f1e105]:
              - generic [ref=f1e106]: "44"
              - generic [ref=f1e107]: M/S
          - generic [ref=f1e108]:
            - generic [ref=f1e109]:
              - generic [ref=f1e110]: Speed
              - generic [ref=f1e111]:
                - generic [ref=f1e112]: Dial range
                - text: 0–200M/S
            - generic [ref=f1e117]:
              - generic [ref=f1e118]: "43"
              - generic [ref=f1e119]: M/S
        - generic [ref=f1e120]:
          - generic [ref=f1e122]:
            - generic [ref=f1e123]: Propellant
            - generic [ref=f1e124]:
              - generic [ref=f1e125]: CH4
              - generic [ref=f1e129]: LOX
            - generic [ref=f1e133]:
              - generic [ref=f1e134]: "191"
              - generic [ref=f1e135]: T
          - generic [ref=f1e136]:
            - generic [ref=f1e137]: Engines
            - generic [ref=f1e138]: SL
            - generic [ref=f1e146]: Vac
          - generic [ref=f1e154]:
            - generic [ref=f1e155]: Attitude
            - generic [ref=f1e160]:
              - generic [ref=f1e161]: "-2"
              - generic [ref=f1e162]: °
        - generic [ref=f1e163]:
          - generic [ref=f1e164]:
            - generic "Horizontal speed" [ref=f1e165]: H/S
            - generic [ref=f1e166]:
              - generic [ref=f1e167]: "-2"
              - generic [ref=f1e168]: M/S
          - generic [ref=f1e169]:
            - generic "Speed as a multiple of the speed of sound" [ref=f1e170]: Mach
            - generic [ref=f1e171]: "0.11"
          - generic [ref=f1e173]:
            - generic "Dynamic pressure" [ref=f1e174]: Q
            - generic [ref=f1e175]:
              - generic [ref=f1e176]: "0.0"
              - generic [ref=f1e177]: KPA
          - generic [ref=f1e178]:
            - generic "Acceleration felt on board, in g" [ref=f1e179]: G
            - generic [ref=f1e180]: "2.4"
          - generic [ref=f1e182]:
            - generic "Thrust to weight ratio" [ref=f1e183]: TWR
            - generic [ref=f1e184]: "2.4"
          - generic [ref=f1e186]:
            - generic "Throttle" [ref=f1e187]
            - generic [ref=f1e188]:
              - generic [ref=f1e189]: "100"
              - generic [ref=f1e190]: "%"
          - generic [ref=f1e191]:
            - generic "Skin temperature" [ref=f1e192]: Heat
            - generic [ref=f1e193]:
              - generic [ref=f1e194]: "187"
              - generic [ref=f1e195]: K
          - generic [ref=f1e196]:
            - generic "Distance to the landing site" [ref=f1e197]: Range
            - generic [ref=f1e198]:
              - generic [ref=f1e199]: "30.0"
              - generic [ref=f1e200]: KM
    - region "Trajectory map" [ref=f1e201]:
      - button "Trajectory" [expanded] [ref=f1e202]
    - generic [ref=f1e207]:
      - region "Engines" [ref=f1e208]:
        - button "Engines controls" [expanded] [ref=f1e210]:
          - generic [ref=f1e211]: Engines
        - generic [ref=f1e215]:
          - generic [ref=f1e216]:
            - button "Engines" [pressed] [ref=f1e217]:
              - generic [ref=f1e219]: Space
            - group "Sea-level engines" [ref=f1e221]:
              - generic [ref=f1e222]: SL
              - button "Sea-level engine 1" [pressed] [ref=f1e223]
              - button "Sea-level engine 2" [pressed] [ref=f1e225]
              - button "Sea-level engine 3" [pressed] [ref=f1e227]
            - group "Vacuum engines" [ref=f1e229]:
              - generic [ref=f1e230]: Vac
              - button "Vacuum engine 1" [ref=f1e231]
              - button "Vacuum engine 2" [ref=f1e233]
              - button "Vacuum engine 3" [ref=f1e235]
          - generic [ref=f1e237]:
            - generic [ref=f1e238]:
              - generic [ref=f1e239]: Throttle
              - generic [ref=f1e240]: 100 %
            - slider "Throttle" [ref=f1e242] [cursor=pointer]: "100"
          - button "Throttle guard" [ref=f1e243]:
            - generic [ref=f1e245]: "Off"
          - generic [ref=f1e246]: Throttles back to keep the speed under the safe dynamic-pressure limit.
      - region "Flight" [ref=f1e247]:
        - generic [ref=f1e248]:
          - button "Flight controls" [expanded] [ref=f1e249]:
            - generic [ref=f1e250]: Flight
          - button "Zoom out" [ref=f1e253]:
            - generic [ref=f1e254]: −
          - button "Zoom in" [ref=f1e255]:
            - generic [ref=f1e256]: +
        - generic [ref=f1e258]:
          - generic [ref=f1e259]:
            - generic [ref=f1e260]:
              - generic [ref=f1e261]: Attitude
              - generic [ref=f1e262]: Centre
            - slider "Attitude" [ref=f1e263] [cursor=pointer]: "0"
          - group "Autopilot" [ref=f1e264]:
            - button "Manual" [pressed] [ref=f1e265]
            - button "Lift off" [ref=f1e266]
            - button "Boost back" [ref=f1e267]
            - button "Hold attitude" [ref=f1e268]
            - button "Land" [ref=f1e269]
            - button "Deorbit" [ref=f1e270]
          - group "Systems" [ref=f1e271]:
            - button "Fins" [ref=f1e272]
            - button "Reaction control" [ref=f1e273]
            - button "Dump propellant" [ref=f1e274]
```

# Test source

```ts
  204 |   ).toBeGreaterThan(90);
  205 |   const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  206 |   const span = median(spans);
  207 |   const width = median(widths);
  208 |   /*
  209 |     PRINTED ON SUCCESS, not only on failure.
  210 | 
  211 |     These two numbers are what the spec is for, and until the particle-drag debt
  212 |     was cleared they were only ever visible when they had already gone wrong: the
  213 |     measurement lives in an `expect` message, and a passing `expect` says
  214 |     nothing. The debt's acceptance line asks for before-and-after numbers on both
  215 |     plume specs, which is impossible to satisfy from a green run that prints no
  216 |     numbers. One line per measurement, with the project on it, and the medians
  217 |     beside the samples they came from.
  218 |   */
  219 |   const info = test.info();
  220 |   console.log(
  221 |     `[plume] ${info.project.name} · ${info.title}: ` +
  222 |       `${span.toFixed(2)} long, ${width.toFixed(2)} across ` +
  223 |       `(spans ${spans.map((n) => n.toFixed(2)).join('/')}, ` +
  224 |       `widths ${widths.map((n) => n.toFixed(2)).join('/')}, ` +
  225 |       `${clamped}/4 anchored to the region edge; throttle ${throttles.join('/')}; ${boxes.join(' ')})`,
  226 |   );
  227 |   return { span, width, last };
  228 | }
  229 | 
  230 | test('the plume is longer than the ship at low altitude @mobile', async ({ page }) => {
  231 |   test.setTimeout(180_000);
  232 |   await page.goto('/?debug=1', { waitUntil: 'load' });
  233 |   await ready(page);
  234 |   await underPowerAt(page, '2000');
  235 | 
  236 |   const measured = await plume(page);
  237 |   const message =
  238 |     `plume spans ${measured.span.toFixed(2)} ship-lengths, ${measured.width.toFixed(2)} across\n` +
  239 |     measured.last;
  240 | 
  241 |   // The acceptance line's number. Measured at about 2.5; the single 2021 emitter
  242 |   // measured 0.26 on the same frame, and its arithmetic says it could not have
  243 |   // done better than 0.44.
  244 |   expect(measured.span, message).toBeGreaterThan(1);
  245 |   /*
  246 |     And not a beam. Six rather than four, because the portrait phone projects
  247 |     measure 3 to 4.2 where the desktop measures 2.5: their frames are 2202 px
  248 |     tall against a 135 px vehicle, so the measurement box holds nearly eight
  249 |     ship-lengths and catches the faint tail the desktop box clips. The
  250 |     arithmetic says the core carries a particle 2.7 ship-lengths; what varies
  251 |     between projects is how much of the fade is above the luma floor.
  252 |   */
  253 |   expect(measured.span, message).toBeLessThan(6);
  254 | });
  255 | 
  256 | test('and blooms wider than the ship in vacuum @mobile', async ({ page }) => {
  257 |   test.setTimeout(240_000);
  258 | 
  259 |   await page.goto('/?debug=1', { waitUntil: 'load' });
  260 |   await ready(page);
  261 |   await underPowerAt(page, '2000');
  262 |   const low = await plume(page);
  263 | 
  264 |   await page.goto('/?debug=1', { waitUntil: 'load' });
  265 |   await ready(page);
  266 |   await underPowerAt(page, '120000');
  267 |   const vacuum = await plume(page);
  268 | 
  269 |   const message =
  270 |     `low: ${low.span.toFixed(2)} long, ${low.width.toFixed(2)} across · ` +
  271 |     `vacuum: ${vacuum.span.toFixed(2)} long, ${vacuum.width.toFixed(2)} across\n${vacuum.last}`;
  272 | 
  273 |   /*
  274 |     The most recognisable thing about watching an ascent, as a number: the same
  275 |     engine draws a PENCIL at sea level and a BELL in vacuum.
  276 | 
  277 |     WIDTH IN SHIP-LENGTHS, measured in a band anchored to the nozzle — see
  278 |     `CONE_DEPTH_SHIP_LENGTHS` for why the whole-plume width says nothing and why
  279 |     the fixed viewport strip that preceded it said it too unreliably.
  280 | 
  281 |     RE-MEASURED when the particle-drag debt was cleared, because the numbers
  282 |     that used to be here were taken through the old strip and are not comparable
  283 |     with these. Ten runs, five projects twice each, sea level -> vacuum:
  284 | 
  285 |       desktop           0.46, 0.53  ->  0.92, 0.92
  286 |       Pixel portrait    0.66, 0.78  ->  1.38, 1.14
  287 |       Pixel landscape   0.74, 0.69  ->  1.07, 0.93
  288 |       iPhone portrait   0.73, 0.72  ->  1.08, 1.25
  289 |       iPhone landscape  0.77, 0.79  ->  1.30, 1.10
  290 | 
  291 |     Ratios of 1.35 to 2.09 against a bound of 1.2 — the worst case has 12% of
  292 |     margin, where the same ten runs through the old strip ranged 1.10 to 1.62
  293 |     and failed this bound twice. The instrument moved, not the picture.
  294 | 
  295 |     Aspect — width over length — was tried as the more shape-like statistic and
  296 |     is worse: in vacuum the black sky lets the faint tail register so the LENGTH
  297 |     grows too, which put the desktop project at exactly 1.25 with nothing to
  298 |     spare.
  299 |   */
  300 |   const shape =
  301 |     `${message}\n  aspect: ${(low.width / low.span).toFixed(2)} low, ` +
  302 |     `${(vacuum.width / vacuum.span).toFixed(2)} vacuum`;
  303 |   console.log(shape);
> 304 |   expect(vacuum.width, shape).toBeGreaterThan(low.width * 1.2);
      |                               ^ Error: low: 2.16 long, 0.39 across · vacuum: 1.75 long, 0.42 across
  305 |   expect(vacuum.width, shape).toBeGreaterThan(0.2);
  306 | });
  307 | 
```