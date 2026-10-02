# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plume.spec.ts >> and blooms wider than the ship in vacuum @mobile
- Location: tests/e2e/plume.spec.ts:268:1

# Error details

```
Error: low: 1.14 long, 0.42 across · vacuum: 0.95 long, 0.43 across
frame 2250x1020 @3.00x  altitude 120000 m  vehicle 60 px
  below      mean   48.1  spread  17.97  tones  6  bright 0.002  dark 0.941  warm 0.0061  top #332222:0.60 #222222:0.18 #333322:0.06 #111122:0.04 #112222:0.02
  EXT plume    found true  span 57px (41x57)  band 26px  n 478  box (1105,519)-(1145,575)  = 0.95 vehicle heights
  |         -  --                      -       |
  |                                            |
  |              .+    - -   ==    #           |
  |           =   ==     =         #.-         |
  |           =   +=      -                    |
  |               -    +-  --     =   -        |
  |              =          -      +   -       |
  |      +   - =  =+          -  ** =          |
  |        = :          -+  - =     =          |
  |       -    --       %% - -.-    -          |
  |.........-....--.....@%...:.................|
  |........=-....-..-...@@.............-.......|
  |==+++**#**************@**@******%******+++==|
  |*******+.............-+.............+*******|
  |.....................=-.....................|
  |.....................--.....................|
  |.....................:-.....................|
  |.....................::.....................|
  |.....................::.....................|
  |.....................:......................|
  |............................................|
  |.......:::::::::...........................:|
  aspect: 0.37 low, 0.46 vacuum

expect(received).toBeGreaterThan(expected)

Expected: > 0.4994324415041085
Received:   0.43333333333333335
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
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
          - button "Sound" [pressed] [ref=f1e24]
          - button "Black box" [ref=f1e30]
          - button "Menu" [ref=f1e34]:
            - text: Menu
            - generic [ref=f1e35]: Esc
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
                - generic [ref=f1e63]: "36"
                - generic [ref=f1e64]: M/S
            - generic [ref=f1e65]:
              - generic [ref=f1e66]: Speed
              - generic [ref=f1e69]:
                - generic [ref=f1e70]: "35"
                - generic [ref=f1e71]: M/S
          - generic [ref=f1e75]:
            - generic [ref=f1e77]:
              - generic [ref=f1e78]: Propellant
              - generic [ref=f1e79]:
                - generic [ref=f1e80]: CH4
                - generic [ref=f1e84]: LOX
              - generic [ref=f1e88]:
                - generic [ref=f1e89]: "191"
                - generic [ref=f1e90]: T
            - generic [ref=f1e91]: Engines
            - generic [ref=f1e107]:
              - generic [ref=f1e108]: Attitude
              - generic [ref=f1e113]:
                - generic [ref=f1e114]: "-2"
                - generic [ref=f1e115]: °
      - region "Trajectory map" [ref=f1e116]:
        - button "Trajectory" [ref=f1e117]
      - generic [ref=f1e120]:
        - region "Engines" [ref=f1e121]:
          - button "Engines controls" [expanded] [ref=f1e123]:
            - generic [ref=f1e124]: Engines
          - generic [ref=f1e128]:
            - generic [ref=f1e129]:
              - button "Engines" [pressed] [ref=f1e130]
              - group "Sea-level engines" [ref=f1e132]:
                - generic [ref=f1e133]: SL
                - button "Sea-level engine 1" [pressed] [ref=f1e134]
                - button "Sea-level engine 2" [pressed] [ref=f1e136]
                - button "Sea-level engine 3" [pressed] [ref=f1e138]
              - group "Vacuum engines" [ref=f1e140]:
                - generic [ref=f1e141]: Vac
                - button "Vacuum engine 1" [ref=f1e142]
                - button "Vacuum engine 2" [ref=f1e144]
                - button "Vacuum engine 3" [ref=f1e146]
            - generic [ref=f1e148]:
              - generic [ref=f1e149]:
                - generic [ref=f1e150]: Throttle
                - generic [ref=f1e151]: 100 %
              - slider "Throttle" [ref=f1e153] [cursor=pointer]: "100"
            - button "Throttle guard" [ref=f1e154]:
              - generic [ref=f1e156]: "Off"
            - generic [ref=f1e157]: Throttles back to keep the speed under the safe dynamic-pressure limit.
        - region "Flight" [ref=f1e158]:
          - generic [ref=f1e159]:
            - button "Flight controls" [ref=f1e160]:
              - generic [ref=f1e161]: Flight
            - button "Zoom out" [ref=f1e164]:
              - generic [ref=f1e165]: −
            - button "Zoom in" [ref=f1e166]:
              - generic [ref=f1e167]: +
  - button "select to enable accessibility for this content" [ref=f1e168]
```

# Test source

```ts
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
  256 |   expect(measured.span, message).toBeGreaterThan(1);
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
> 316 |   expect(vacuum.width, shape).toBeGreaterThan(low.width * 1.2);
      |                               ^ Error: low: 1.14 long, 0.42 across · vacuum: 0.95 long, 0.43 across
  317 |   expect(vacuum.width, shape).toBeGreaterThan(0.2);
  318 | });
  319 | 
```