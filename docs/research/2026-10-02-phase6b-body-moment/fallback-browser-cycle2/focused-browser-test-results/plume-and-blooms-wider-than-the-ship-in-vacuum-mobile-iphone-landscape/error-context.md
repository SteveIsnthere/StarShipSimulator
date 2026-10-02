# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plume.spec.ts >> and blooms wider than the ship in vacuum @mobile
- Location: tests/e2e/plume.spec.ts:297:1

# Error details

```
Error: low: 2.58 long, 0.54 across · vacuum: 1.15 long, 0.65 across
frame 2250x1020 @3.00x  altitude 120000 m  vehicle 60 px
  below      mean   48.5  spread  19.91  tones  4  bright 0.005  dark 0.940  warm 0.0042  top #332222:0.60 #222222:0.18 #333322:0.07 #111122:0.04 #112222:0.02
  EXT plume    found true  span 69px (45x69)  band 39px  n 624  box (1110,522)-(1154,590)  = 1.15 vehicle heights
  |         -  --                      -       |
  |                                            |
  |              .+    - -   ==    #           |
  |           =   ==     =         #.-         |
  |           =   +=      -                    |
  |               -    +-  --     =   -        |
  |              =          -      +   -       |
  |      +   - =  =+          -  ** =          |
  |        = :          -+  - =     =          |
  |       -    --       ## - -.-    -          |
  |.........-....--.....@%...:.................|
  |........=-....-..-...@@.............-.......|
  |==+++**#*************%@**@******%******+++==|
  |*******+............:++:............+*******|
  |.....................++.....................|
  |.....................==.....................|
  |.....................--.....................|
  |.....................:-.....................|
  |.....................::.....................|
  |............................................|
  |............................................|
  |.......:::::::::...........................:|
  aspect: 0.21 low, 0.57 vacuum

expect(received).toBeGreaterThan(expected)

Expected: > 0.6538024688781058
Received:   0.65
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
          - generic [ref=f1e12]: 00:00:04
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
                - generic [ref=f1e63]: "25"
                - generic [ref=f1e64]: M/S
            - generic [ref=f1e65]:
              - generic [ref=f1e66]: Speed
              - generic [ref=f1e69]:
                - generic [ref=f1e70]: "24"
                - generic [ref=f1e71]: M/S
          - generic [ref=f1e75]:
            - generic [ref=f1e77]:
              - generic [ref=f1e78]: Propellant
              - generic [ref=f1e79]:
                - generic [ref=f1e80]: CH4
                - generic [ref=f1e84]: LOX
              - generic [ref=f1e88]:
                - generic [ref=f1e89]: "194"
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
      |                               ^ Error: low: 2.58 long, 0.54 across · vacuum: 1.15 long, 0.65 across
  346 |   expect(vacuum.width, shape).toBeGreaterThan(0.2);
  347 | });
  348 | 
```