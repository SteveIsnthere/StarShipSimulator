# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive.spec.ts >> no two overlay elements sit on top of each other @mobile
- Location: tests/e2e/responsive.spec.ts:317:1

# Error details

```
Error: cinematic: camera-modes [219,270 311x54] overlaps trajectory-map [309,227 133x46]

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "cinematic: camera-modes [219,270 311x54] overlaps trajectory-map [309,227 133x46]",
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - generic:
      - banner [ref=f1e5]:
        - generic [ref=f1e6]:
          - generic [ref=f1e7]: Starship
          - generic [ref=f1e8]: Intro Demo
          - generic [ref=f1e9]:
            - generic [ref=f1e10]: Autopilot ·
            - text: Land
        - generic [ref=f1e11]:
          - generic [ref=f1e12]: T+
          - generic [ref=f1e13]: 00:00:02
        - generic [ref=f1e14]:
          - button "Pause" [ref=f1e15]:
            - text: Pause
            - generic [ref=f1e16]: P
          - button "Cinematic" [pressed] [ref=f1e18]
          - button "Sound" [pressed] [ref=f1e25]
          - button "Black box" [ref=f1e31]
          - button "Menu" [ref=f1e35]:
            - text: Menu
            - generic [ref=f1e36]: Esc
      - group "Camera" [ref=f1e38]:
        - button "Follow" [pressed] [ref=f1e40]
        - button "Pad" [ref=f1e41]
        - button "Chase" [ref=f1e42]
        - button "Onboard" [ref=f1e43]
      - region "Flight data" [ref=f1e44]:
        - generic [ref=f1e45]:
          - status [ref=f1e47]:
            - generic [ref=f1e48]: LANDING BURN
            - generic [ref=f1e49]: → TOUCHDOWN
          - button "Details" [ref=f1e50]
        - status [ref=f1e53]:
          - generic [ref=f1e54]:
            - generic [ref=f1e55]:
              - generic [ref=f1e56]: Altitude
              - generic [ref=f1e59]:
                - generic [ref=f1e60]: "113"
                - generic [ref=f1e61]: M
            - generic [ref=f1e65]:
              - generic [ref=f1e66]: V/S
              - generic [ref=f1e69]:
                - generic [ref=f1e70]: "-24"
                - generic [ref=f1e71]: M/S
            - generic [ref=f1e72]:
              - generic [ref=f1e73]: Speed
              - generic [ref=f1e76]:
                - generic [ref=f1e77]: "24"
                - generic [ref=f1e78]: M/S
          - generic [ref=f1e82]:
            - generic [ref=f1e84]:
              - generic [ref=f1e85]: Propellant
              - generic [ref=f1e86]:
                - generic [ref=f1e87]: CH4
                - generic [ref=f1e91]: LOX
              - generic [ref=f1e95]:
                - generic [ref=f1e96]: "10"
                - generic [ref=f1e97]: T
            - generic [ref=f1e98]: Engines
            - generic [ref=f1e114]:
              - generic [ref=f1e115]: Attitude
              - generic [ref=f1e120]:
                - generic [ref=f1e121]: "1"
                - generic [ref=f1e122]: °
      - region "Trajectory map" [ref=f1e123]:
        - button "Trajectory" [ref=f1e124]
  - button "select to enable accessibility for this content" [ref=f1e127]
```

# Test source

```ts
  290 |   'open-menu',
  291 |   // Only present in cinematic mode, which is why the test enters it: review
  292 |   // measured this row sitting on the trajectory map at 844x390, and a check
  293 |   // that never turns cinematic on would have shipped it green.
  294 |   'camera-modes',
  295 |   'timeline',
  296 |   'trajectory-map',
  297 |   // M12.6. A fresh browser context has never dismissed the hint, so it is on
  298 |   // screen for this check without any arranging — which is the state a new
  299 |   // player is in, and the only state in which it can collide with anything.
  300 |   'first-flight-hint',
  301 | ] as const;
  302 | 
  303 | interface Box {
  304 |   x: number;
  305 |   y: number;
  306 |   width: number;
  307 |   height: number;
  308 | }
  309 | 
  310 | /** True when two boxes share any area at all. */
  311 | function intersects(a: Box, b: Box): boolean {
  312 |   return (
  313 |     a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  314 |   );
  315 | }
  316 | 
  317 | test('no two overlay elements sit on top of each other @mobile', async ({ page }) => {
  318 |   await page.goto('/', { waitUntil: 'load' });
  319 |   await ready(page);
  320 |   // Let the readouts fill: an element with no text has no width, and a strip of
  321 |   // zero-width boxes cannot overlap anything.
  322 |   await expect
  323 |     .poll(async () => (await page.locator(byTestId(readoutValueTestId('clock'))).textContent()) !== '', {
  324 |       timeout: 20_000,
  325 |     })
  326 |     .toBe(true);
  327 | 
  328 |   /*
  329 |     THE DEFECT THIS EXISTS FOR, stated so it cannot come back quietly. Until
  330 |     M12.4 the mission clock filled the top strip and the four top-right buttons
  331 |     were positioned absolutely over it, so on a phone the clock's digits sat
  332 |     UNDER the CINEMATIC button. It is in `docs/design/screenshots/screenshot-phone.png`, it was
  333 |     there for two milestones, and nothing failed — because nothing asked. The
  334 |     fix was to put them in one flex row, which makes the collision impossible
  335 |     rather than unlikely; this is what says so, on all five projects.
  336 |   */
  337 |   const check = async (mode: string): Promise<string[]> => {
  338 |     const boxes = new Map<string, Box>();
  339 |     for (const id of OVERLAY) {
  340 |       const locator = page.locator(byTestId(id));
  341 |       if ((await locator.count()) === 0) continue;
  342 |       if (!(await locator.first().isVisible())) continue;
  343 |       const box = await locator.first().boundingBox();
  344 |       if (box && box.width > 0 && box.height > 0) boxes.set(id, box);
  345 |     }
  346 |     expect(boxes.size, `${mode}: the overlay is on screen`).toBeGreaterThan(4);
  347 | 
  348 |     const collisions: string[] = [];
  349 |     const ids = [...boxes.keys()];
  350 |     for (let i = 0; i < ids.length; i++) {
  351 |       for (let j = i + 1; j < ids.length; j++) {
  352 |         const a = boxes.get(ids[i]!)!;
  353 |         const b = boxes.get(ids[j]!)!;
  354 |         if (intersects(a, b)) {
  355 |           collisions.push(
  356 |             `${mode}: ${ids[i]} [${a.x.toFixed(0)},${a.y.toFixed(0)} ${a.width.toFixed(0)}x${a.height.toFixed(0)}]` +
  357 |               ` overlaps ${ids[j]} [${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.width.toFixed(0)}x${b.height.toFixed(0)}]`,
  358 |           );
  359 |         }
  360 |       }
  361 |     }
  362 |     return collisions;
  363 |   };
  364 | 
  365 |   const plain = await check('flying');
  366 | 
  367 |   /*
  368 |     And again in cinematic, which adds a row of camera buttons under the others.
  369 | 
  370 |     ENTERED THROUGH STORAGE AND A RELOAD, not by clicking the toggle, and the
  371 |     reason is the first-flight hint: clicking anything dismisses it, so the
  372 |     version of this that toggled cinematic measured the second pass with the
  373 |     hint already gone — a cinematic-only collision with it would have shipped
  374 |     green. Cinematic mode is remembered (M6.4), so setting the key and
  375 |     reloading arrives in the same place with the hint still up, because nothing
  376 |     marks it seen until it is actually dismissed.
  377 |   */
  378 |   await page.evaluate(() => localStorage.setItem('starship:cinematic', '1'));
  379 |   await page.reload({ waitUntil: 'load' });
  380 |   await ready(page);
  381 |   await expect(page.locator(byTestId('camera-modes'))).toBeVisible();
  382 |   await expect
  383 |     .poll(async () => (await page.locator(byTestId(readoutValueTestId('clock'))).textContent()) !== '', {
  384 |       timeout: 20_000,
  385 |     })
  386 |     .toBe(true);
  387 |   const cinematic = await check('cinematic');
  388 | 
  389 |   const collisions = [...plain, ...cinematic];
> 390 |   expect(collisions, collisions.join('\n')).toEqual([]);
      |                                             ^ Error: cinematic: camera-modes [219,270 311x54] overlaps trajectory-map [309,227 133x46]
  391 | });
  392 | 
  393 | /**
  394 |  * M12.4 — the haptics reach the page, and stop when asked to.
  395 |  *
  396 |  * `navigator.vibrate` is not implemented in headless Chromium, so this replaces
  397 |  * it before the app loads and counts the calls. That is the honest limit of
  398 |  * what a browser test can say here: it proves the WIRING — that events reach
  399 |  * the platform call, once each, and that reduced motion silences them — and
  400 |  * says nothing about whether a phone actually buzzed, which no automated test
  401 |  * on any of these five projects could.
  402 |  */
  403 | test('mission events reach navigator.vibrate, one buzz per event @mobile', async ({ page }) => {
  404 |   await page.addInitScript(() => {
  405 |     (window as unknown as { __buzzes: number[] }).__buzzes = [];
  406 |     Object.defineProperty(navigator, 'vibrate', {
  407 |       configurable: true,
  408 |       value: (pattern: number | number[]) => {
  409 |         (window as unknown as { __buzzes: number[] }).__buzzes.push(
  410 |           Array.isArray(pattern) ? pattern[0]! : pattern,
  411 |         );
  412 |         return true;
  413 |       },
  414 |     });
  415 |   });
  416 | 
  417 |   await page.goto('/', { waitUntil: 'load' });
  418 |   await ready(page);
  419 |   // Vibration is gated on a user gesture, like the audio. Nothing before one.
  420 |   expect(await page.evaluate(() => (window as unknown as { __buzzes: number[] }).__buzzes)).toEqual(
  421 |     [],
  422 |   );
  423 | 
  424 |   await page.mouse.click(5, 5);
  425 |   await expect(page.locator(byTestId('debrief'))).toHaveCount(1, { timeout: 90_000 });
  426 | 
  427 |   /*
  428 |     ONE PER EVENT, COUNTED OVER A FLIGHT THAT RAN ENTIRELY AFTER THE GESTURE.
  429 | 
  430 |     The first version asserted "more than none", which a dropped buzz would have
  431 |     passed. Counting against the timeline instead is the right idea and needs
  432 |     one more step to be true: the intro starts at page load and fires LANDING
  433 |     BURN on its first step, before anybody has touched the page — and vibration
  434 |     is gated on a gesture, so that event legitimately produces no buzz. Flying
  435 |     AGAIN from the card gives a whole flight inside the unlocked window, and the
  436 |     events of that flight are the ones that must correspond one to one.
  437 | 
  438 |     The count comes from the DEBRIEF CARD's event list rather than from the
  439 |     timeline's dots. The dots are the natural place to look and are the wrong
  440 |     one: the strip renders only the track for the loaded scenario, collapses to
  441 |     a line of text on a phone, and its dots are not all in the DOM at every
  442 |     viewport. The card lists exactly the events the timeline fired, on every
  443 |     project, and it is on screen at the moment this asks.
  444 |   */
  445 |   const before = (
  446 |     await page.evaluate(() => (window as unknown as { __buzzes: number[] }).__buzzes)
  447 |   ).length;
  448 | 
  449 |   await page.locator(byTestId('debrief-restart')).click();
  450 |   await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  451 |   await expect(page.locator(byTestId('debrief'))).toHaveCount(1, { timeout: 90_000 });
  452 | 
  453 |   const buzzes = (
  454 |     await page.evaluate(() => (window as unknown as { __buzzes: number[] }).__buzzes)
  455 |   ).slice(before);
  456 |   const fired = await page.locator(`${byTestId('debrief-events')} li`).count();
  457 | 
  458 |   expect(fired, 'the second flight fires events').toBeGreaterThan(0);
  459 |   expect(buzzes.length, `${fired} events, buzzes: ${buzzes.join(',')}`).toBe(fired);
  460 | 
  461 |   // Two lengths and no others, with the long one last: the flight ended.
  462 |   for (const ms of buzzes) expect([EVENT_MS, END_MS]).toContain(ms);
  463 |   expect(buzzes[buzzes.length - 1], `buzzes: ${buzzes.join(',')}`).toBe(END_MS);
  464 | });
  465 | 
  466 | test('and reduced motion silences them @mobile', async ({ page }) => {
  467 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  468 |   await page.addInitScript(() => {
  469 |     (window as unknown as { __buzzes: number[] }).__buzzes = [];
  470 |     Object.defineProperty(navigator, 'vibrate', {
  471 |       configurable: true,
  472 |       value: () => {
  473 |         (window as unknown as { __buzzes: number[] }).__buzzes.push(1);
  474 |         return true;
  475 |       },
  476 |     });
  477 |   });
  478 | 
  479 |   await page.goto('/', { waitUntil: 'load' });
  480 |   await ready(page);
  481 |   await page.mouse.click(5, 5);
  482 |   await expect(page.locator(byTestId('debrief'))).toHaveCount(1, { timeout: 90_000 });
  483 | 
  484 |   // A phone buzzing in someone's hand is motion in the most literal sense a
  485 |   // web page has, and the setting is a request not to be moved.
  486 |   expect(
  487 |     await page.evaluate(() => (window as unknown as { __buzzes: number[] }).__buzzes),
  488 |   ).toEqual([]);
  489 | });
  490 | 
```