# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plume.spec.ts >> and blooms wider than the ship in vacuum @mobile
- Location: tests/e2e/plume.spec.ts:256:1

# Error details

```
Error: low: 1.80 long, 0.35 across · vacuum: 1.20 long, 0.42 across
frame 2265x945 @2.62x  altitude 120000 m  vehicle 53 px
  below      mean   48.0  spread  17.87  tones  5  bright 0.002  dark 0.944  warm 0.0046  top #332222:0.66 #222222:0.16 #111122:0.04 #333322:0.03 #222211:0.02
  EXT plume    found true  span 50px (49x50)  band 18px  n 426  box (1112,485)-(1160,534)  = 0.95 vehicle heights
  |          -  -                    --        |
  |                                            |
  |               +    - .   ==   #            |
  |            =   =     =        # -          |
  |            =   +      -                    |
  |                -   ++  --    =   -         |
  |               =.       .-     +   -        |
  |       +   - = =+          -  * =           |
  |         = .         -+  -==    =           |
  |        -    -       +=-:---    -           |
  |..........:....-.....%%.....................|
  |.........==....-.-...@@............:........|
  |-==++***##***********@@**@*****%*******++==-|
  |********:............++............:********|
  |.....................++.....................|
  |.....................--.....................|
  |.....................--.....................|
  |.....................::.....................|
  |.....................::.....................|
  |............................................|
  |............................................|
  |...::::::.........................::::::....|
  aspect: 0.20 low, 0.35 vacuum

expect(received).toBeGreaterThan(expected)

Expected: > 0.42549049561908464
Received:   0.41904761904761906
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
          - generic [ref=f1e12]: 00:00:07
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
                - generic [ref=f1e53]: "120.1"
                - generic [ref=f1e54]: KM
            - generic [ref=f1e58]:
              - generic [ref=f1e59]: V/S
              - generic [ref=f1e62]:
                - generic [ref=f1e63]: "57"
                - generic [ref=f1e64]: M/S
            - generic [ref=f1e65]:
              - generic [ref=f1e66]: Speed
              - generic [ref=f1e69]:
                - generic [ref=f1e70]: "56"
                - generic [ref=f1e71]: M/S
          - generic [ref=f1e75]:
            - generic [ref=f1e77]:
              - generic [ref=f1e78]: Propellant
              - generic [ref=f1e79]:
                - generic [ref=f1e80]: CH4
                - generic [ref=f1e85]: LOX
              - generic [ref=f1e90]:
                - generic [ref=f1e91]: "188"
                - generic [ref=f1e92]: T
            - generic [ref=f1e93]: Engines
            - generic [ref=f1e109]:
              - generic [ref=f1e110]: Attitude
              - generic [ref=f1e115]:
                - generic [ref=f1e116]: "-3"
                - generic [ref=f1e117]: °
      - region "Trajectory map" [ref=f1e118]:
        - button "Trajectory" [ref=f1e119]
      - generic [ref=f1e122]:
        - region "Engines" [ref=f1e123]:
          - button "Engines controls" [expanded] [ref=f1e125]:
            - generic [ref=f1e126]: Engines
          - generic [ref=f1e130]:
            - generic [ref=f1e131]:
              - button "Engines" [pressed] [ref=f1e132]
              - group "Sea-level engines" [ref=f1e134]:
                - generic [ref=f1e135]: SL
                - button "Sea-level engine 1" [pressed] [ref=f1e136]
                - button "Sea-level engine 2" [pressed] [ref=f1e138]
                - button "Sea-level engine 3" [pressed] [ref=f1e140]
              - group "Vacuum engines" [ref=f1e142]:
                - generic [ref=f1e143]: Vac
                - button "Vacuum engine 1" [ref=f1e144]
                - button "Vacuum engine 2" [ref=f1e146]
                - button "Vacuum engine 3" [ref=f1e148]
            - generic [ref=f1e150]:
              - generic [ref=f1e151]:
                - generic [ref=f1e152]: Throttle
                - generic [ref=f1e153]: 100 %
              - slider "Throttle" [ref=f1e155] [cursor=pointer]: "100"
            - button "Throttle guard" [ref=f1e156]:
              - generic [ref=f1e158]: "Off"
            - generic [ref=f1e159]: Throttles back to keep the speed under the safe dynamic-pressure limit.
        - region "Flight" [ref=f1e160]:
          - generic [ref=f1e161]:
            - button "Flight controls" [ref=f1e162]:
              - generic [ref=f1e163]: Flight
            - button "Zoom out" [ref=f1e166]:
              - generic [ref=f1e167]: −
            - button "Zoom in" [ref=f1e168]:
              - generic [ref=f1e169]: +
  - button "select to enable accessibility for this content" [ref=f1e170]
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
      |                               ^ Error: low: 1.80 long, 0.35 across · vacuum: 1.20 long, 0.42 across
  305 |   expect(vacuum.width, shape).toBeGreaterThan(0.2);
  306 | });
  307 | 
```