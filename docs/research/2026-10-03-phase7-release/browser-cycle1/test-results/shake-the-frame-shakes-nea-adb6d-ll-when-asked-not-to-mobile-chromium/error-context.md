# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shake.spec.ts >> the frame shakes near max-Q, and holds still when asked not to @mobile
- Location: tests/e2e/shake.spec.ts:278:1

# Error details

```
Error: shaking 2.0 px vs reduced motion 1.6 px
  shaking tops: 172 174 173 174 173 173 173 174 173 172 172 173 171 170 172 171
  reduced tops: 172 171 173 173 173 173 173 173 173 173 173 172 172 170 169 171
frame 1280x347 @1.00x
  EXT ship     found true  span 3px (2x3)  band 0px  n 6  box (511,171)-(512,173)
  |================================================|
  |++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++|
  |++++++++++++++++++++++++++++++++++++++++++++++++|
  |**+++++++++++++*****************++++*****++++***|
  |****************####%%%##***##*******######***##|
  |*################@@@@%%###**********####%%%#*##%|
  |##%%%%####%%%%%%%%@@%########%*##########%##****|
  |%%%%%%%%%#%%%%%%%%%%%##%%%%%%###%%%%%###########|
  |#####*####*********####%#####********++*********|
  |#####*####*********####%####*********++*********|
  |=++++===+++++=++++====++++++=========++++=======|
  |=======+++++++++++========+===+++++++++++=======|
  |==+++++++++++++==========+++++++++++++==========|
  |++++++++++++++++=======++++++++++++++++=======++|

expect(received).toBeGreaterThan(expected)

Expected: > 3.242226890756359
Received:   1.9754901960784252
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - generic:
    - banner [ref=f1e5]:
      - generic [ref=f1e6]:
        - generic [ref=f1e7]: Starship
        - generic [ref=f1e8]: Booster Sep, edited
        - generic [ref=f1e9]: Manual
      - generic [ref=f1e10]:
        - generic [ref=f1e11]: T+
        - generic [ref=f1e12]: 00:00:03
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
              - generic [ref=f1e45]: BOOSTBACK
            - listitem [ref=f1e49]:
              - generic [ref=f1e50]: APOGEE
            - listitem [ref=f1e54]:
              - generic [ref=f1e55]: ENTRY BURN
            - listitem [ref=f1e59]:
              - generic [ref=f1e60]: LANDING BURN
            - listitem [ref=f1e64]:
              - generic [ref=f1e65]: CAUGHT
          - status [ref=f1e68]: MAX-Q→ BOOSTBACK
        - button "Details" [expanded] [ref=f1e69]
      - status [ref=f1e72]:
        - generic [ref=f1e73]:
          - generic [ref=f1e74]:
            - generic [ref=f1e75]:
              - generic [ref=f1e76]: Altitude
              - generic [ref=f1e77]:
                - generic [ref=f1e78]: Dial range
                - text: 0–20KM
            - generic [ref=f1e83]:
              - generic [ref=f1e84]: "10.0"
              - generic [ref=f1e85]: KM
          - generic [ref=f1e86]:
            - generic [ref=f1e87]: Vertical speed
            - generic [ref=f1e90]:
              - generic [ref=f1e91]: "-19"
              - generic [ref=f1e92]: M/S
          - generic [ref=f1e93]:
            - generic [ref=f1e94]:
              - generic [ref=f1e95]: Speed
              - generic [ref=f1e96]:
                - generic [ref=f1e97]: Dial range
                - text: 0–500M/S
            - generic [ref=f1e102]:
              - generic [ref=f1e103]: "338"
              - generic [ref=f1e104]: M/S
        - generic [ref=f1e105]:
          - generic [ref=f1e107]:
            - generic [ref=f1e108]: Propellant
            - generic [ref=f1e109]:
              - generic [ref=f1e110]: CH4
              - generic [ref=f1e114]: LOX
            - generic [ref=f1e118]:
              - generic [ref=f1e119]: "0"
              - generic [ref=f1e120]: T
          - generic [ref=f1e121]:
            - generic [ref=f1e122]: Attitude
            - generic [ref=f1e127]:
              - generic [ref=f1e128]: "90"
              - generic [ref=f1e129]: °
        - generic [ref=f1e130]:
          - generic [ref=f1e131]:
            - generic [ref=f1e132]: Centre · 3
            - generic [ref=f1e133]: 0 lit · 0 start · 0 fail
          - generic [ref=f1e134]:
            - generic [ref=f1e135]: Inner · 10
            - generic [ref=f1e136]: 0 lit · 0 start · 0 fail
          - generic [ref=f1e137]:
            - generic [ref=f1e138]: Outer · 20
            - generic [ref=f1e139]: 0 lit · 0 start · 0 fail
        - generic [ref=f1e140]:
          - generic [ref=f1e141]:
            - generic "Horizontal speed" [ref=f1e142]: H/S
            - generic [ref=f1e143]:
              - generic [ref=f1e144]: "338"
              - generic [ref=f1e145]: M/S
          - generic [ref=f1e146]:
            - generic "Speed as a multiple of the speed of sound" [ref=f1e147]: Mach
            - generic [ref=f1e148]: "1.13"
          - generic [ref=f1e150]:
            - generic "Dynamic pressure" [ref=f1e151]: Q
            - generic [ref=f1e152]:
              - generic [ref=f1e153]: "23.8"
              - generic [ref=f1e154]: KPA
          - generic [ref=f1e155]:
            - generic "Acceleration felt on board, in g" [ref=f1e156]: G
            - generic [ref=f1e157]: "1.2"
          - generic [ref=f1e159]:
            - generic "Thrust to weight ratio" [ref=f1e160]: TWR
            - generic [ref=f1e161]: "0.0"
          - generic [ref=f1e163]:
            - generic "Throttle" [ref=f1e164]
            - generic [ref=f1e165]:
              - generic [ref=f1e166]: "100"
              - generic [ref=f1e167]: "%"
          - generic [ref=f1e168]:
            - generic "Skin temperature" [ref=f1e169]: Heat
            - generic [ref=f1e170]:
              - generic [ref=f1e171]: "459"
              - generic [ref=f1e172]: K
          - generic [ref=f1e173]:
            - generic "Distance to the landing site" [ref=f1e174]: Range
            - generic [ref=f1e175]:
              - generic [ref=f1e176]: "46.3"
              - generic [ref=f1e177]: KM
    - region "Trajectory map" [ref=f1e178]:
      - button "Trajectory" [expanded] [ref=f1e179]
    - generic [ref=f1e184]:
      - region "Engines" [ref=f1e185]:
        - button "Engines controls" [expanded] [ref=f1e187]:
          - generic [ref=f1e188]: Engines
        - generic [ref=f1e192]:
          - generic [ref=f1e193]:
            - button "Engines" [ref=f1e194]:
              - generic [ref=f1e196]: Space
            - generic [ref=f1e198]:
              - button "Centre · 3 0 lit · 0 start · 0 fail" [ref=f1e199]:
                - generic [ref=f1e200]: Centre · 3
                - generic [ref=f1e201]: 0 lit · 0 start · 0 fail
              - button "Inner · 10 0 lit · 0 start · 0 fail" [ref=f1e202]:
                - generic [ref=f1e203]: Inner · 10
                - generic [ref=f1e204]: 0 lit · 0 start · 0 fail
              - button "Outer · 20 0 lit · 0 start · 0 fail" [ref=f1e205]:
                - generic [ref=f1e206]: Outer · 20
                - generic [ref=f1e207]: 0 lit · 0 start · 0 fail
          - generic [ref=f1e208]:
            - generic [ref=f1e209]:
              - generic [ref=f1e210]: Throttle
              - generic [ref=f1e211]: "Off"
            - slider "Throttle" [ref=f1e212] [cursor=pointer]: "100"
          - button "Throttle guard" [ref=f1e213]:
            - generic [ref=f1e215]: "Off"
          - generic [ref=f1e216]: Throttles back to keep the speed under the safe dynamic-pressure limit.
      - region "Flight" [ref=f1e217]:
        - generic [ref=f1e218]:
          - button "Flight controls" [expanded] [ref=f1e219]:
            - generic [ref=f1e220]: Flight
          - button "Zoom out" [ref=f1e223]:
            - generic [ref=f1e224]: −
          - button "Zoom in" [ref=f1e225]:
            - generic [ref=f1e226]: +
        - generic [ref=f1e228]:
          - generic [ref=f1e229]: Super Heavy
          - generic [ref=f1e230]:
            - generic [ref=f1e231]:
              - generic [ref=f1e232]: Attitude
              - generic [ref=f1e233]: Centre
            - slider "Attitude" [ref=f1e234] [cursor=pointer]: "0"
          - group "Autopilot" [ref=f1e235]:
            - button "Manual" [pressed] [ref=f1e236]
            - button "Lift off" [ref=f1e237]
            - button "Boost back" [ref=f1e238]
            - button "Hold attitude" [ref=f1e239]
            - button "Catch" [ref=f1e240]
            - button "Deorbit" [disabled] [ref=f1e241]
          - group "Systems" [ref=f1e242]:
            - button "Fins" [ref=f1e243]
            - button "Reaction control" [ref=f1e244]
            - button "Dump propellant" [ref=f1e245]
    - button "Fly again" [ref=f1e246]
```

# Test source

```ts
  288 |    *     pixel-portrait, under two workers  3.5 min
  289 |    *     pixel-landscape, under two workers TIMED OUT at the old 240 s budget,
  290 |    *                                        in two separate full runs
  291 |    *
  292 |    * The old budget was 4.0 min, which left about 15% of headroom over the idle
  293 |    * cost and none at all under parallel load on a four-CPU box. The assertion
  294 |    * below is UNCHANGED and still fails if the frame does not shake — what was
  295 |    * failing was the clock, not the claim: the same test passes on three other
  296 |    * projects in the same run, and alone on this one.
  297 |    *
  298 |    * Widening a budget to get green is normally how a real regression gets
  299 |    * hidden, so the distinction matters: this is not a test that fails when
  300 |    * given time. It is a test that was not given enough.
  301 |    */
  302 |   test.setTimeout(420_000);
  303 | 
  304 |   await page.goto('/', { waitUntil: 'load' });
  305 |   await ready(page);
  306 |   await nearMaxQ(page);
  307 |   const shaking = await verticalWander(page);
  308 |   const shakingClock = await missionSeconds(page);
  309 | 
  310 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  311 |   await page.goto('/', { waitUntil: 'load' });
  312 |   await ready(page);
  313 |   await nearMaxQ(page);
  314 |   const still = await verticalWander(page);
  315 |   const stillClock = await missionSeconds(page);
  316 | 
  317 |   const report =
  318 |     `shaking ${shaking.px.toFixed(1)} px vs reduced motion ${still.px.toFixed(1)} px\n` +
  319 |     `  shaking tops: ${shaking.tops.join(' ')}\n  reduced tops: ${still.tops.join(' ')}\n` +
  320 |     shaking.last;
  321 | 
  322 |   // Before M9.3 the amplitude at this dynamic pressure was 0.0007 of 0.6% of a
  323 |   // viewport — four thousandths of a pixel — and these two numbers were the
  324 |   // same measurement twice.
  325 |   /*
  326 |     THE WINDOW, CHECKED RATHER THAN ASSUMED.
  327 | 
  328 |     Everything below rests on the vehicle holding its attitude while it is
  329 |     photographed, and that is only true for as long as `SUBJECT_WINDOW_SECONDS`
  330 |     of flight — `tests/view/dynamic-pressure.test.ts` replays the same state and
  331 |     asserts exactly that far and no further. Nothing in Playwright bounds how
  332 |     much simulated time a run consumes, so if a slow machine, a retry, or a
  333 |     future edit spends more, the guard stops covering the thing it guards and
  334 |     this comparison quietly goes back to measuring an airframe.
  335 | 
  336 |     So the run says how far it actually got. Both numbers, because a failure
  337 |     here should name which of the two runs overran.
  338 |   */
  339 |   expect(
  340 |     Math.max(shakingClock, stillClock),
  341 |     `ran past the window the subject is flat in: T+${shakingClock}s shaking, ` +
  342 |       `T+${stillClock}s reduced, against ${SUBJECT_WINDOW_SECONDS}s guarded in ` +
  343 |       'tests/view/dynamic-pressure.test.ts',
  344 |   ).toBeLessThanOrEqual(SUBJECT_WINDOW_SECONDS);
  345 | 
  346 |   expect(shaking.px, report).toBeGreaterThan(1.5);
  347 | 
  348 |   /*
  349 |     THE CONTROL HAS TO BE STILL, and this is the assertion M11.8 needed and did
  350 |     not have. When the subject started tumbling, `still` went from under a pixel
  351 |     to 10 of them and the test failed on the line BELOW — reporting a shake that
  352 |     had stopped separating, when what had actually happened was that its
  353 |     reference had started moving. A bound here says which of the two it is.
  354 | 
  355 |     Six pixels, against 1.0 to 3.0 measured across the five projects: loose
  356 |     enough for a slow machine's longer burst and a third of what the departing
  357 |     airframe drew.
  358 |   */
  359 |   expect(still.px, report).toBeLessThan(6);
  360 | 
  361 |   /*
  362 |     One and a half times the control plus a pixel of slack — UNCHANGED, after
  363 |     M11.9 tried to raise it to 2 and withdrew that on the evidence.
  364 | 
  365 |     Worth recording, because the withdrawal is the honest half. The redesigned
  366 |     subject separates far better than the one it replaced — the ratios below run
  367 |     2.7x to 12.4x, against 1.2x for the departing airframe — and 2x looked
  368 |     plainly affordable on the first five measurements. It was not: those five
  369 |     were taken before the sampling interval was fixed, and across ten
  370 |     measurements on the final code the worst case is a run reading 5.4 px
  371 |     against 2.0, which clears 2x by 13%. A pixel measurement that passes by 13%
  372 |     on one machine fails on another, and a flaky test costs more than a slightly
  373 |     loose one.
  374 | 
  375 |     Ten measurements, two full runs, all five projects:
  376 | 
  377 |         chromium           4.2 px shaking vs 0.8 still    5.3x
  378 |         pixel-portrait    18.6                  1.5      12.4x
  379 |         pixel-landscape   17.4 / 5.4            2.2 / 2.0  7.9x / 2.7x
  380 |         iphone-portrait    8.1                  2.5        3.2x
  381 |         iphone-landscape   7.7                  1.8        4.3x
  382 | 
  383 |     What the residual is now is the vehicle FALLING and the camera following,
  384 |     both smooth; nothing in it is the airframe. The claim this line makes is
  385 |     still the one it has always made, and the new bound above — that the control
  386 |     itself stays under 6 px — is where M11.9's tightening actually went.
  387 |   */
> 388 |   expect(shaking.px, report).toBeGreaterThan(still.px * 1.5 + 0.8);
      |                              ^ Error: shaking 2.0 px vs reduced motion 1.6 px
  389 | });
  390 | 
  391 | test('and does not shake a vehicle standing on the ground @mobile', async ({ page }) => {
  392 |   test.setTimeout(180_000);
  393 |   await page.goto('/', { waitUntil: 'load' });
  394 |   await ready(page);
  395 | 
  396 |   // Both sources of shake are zero here: no air load and no thrust. If the
  397 |   // picture moves in this state, something other than the airframe is moving it.
  398 |   await preset(page, 'landing-burn', { altitude: '0', speedX: '0', speedY: '0' });
  399 |   await page.waitForTimeout(2_000);
  400 |   const resting = await verticalWander(page, { ...SILHOUETTE, region: WHOLE, excludeWarm: false });
  401 | 
  402 |   expect(
  403 |     resting.px,
  404 |     `${resting.px.toFixed(1)} px of wander at rest\n  tops: ${resting.tops.join(' ')}\n${resting.last}`,
  405 |   ).toBeLessThanOrEqual(1);
  406 | });
  407 | 
```