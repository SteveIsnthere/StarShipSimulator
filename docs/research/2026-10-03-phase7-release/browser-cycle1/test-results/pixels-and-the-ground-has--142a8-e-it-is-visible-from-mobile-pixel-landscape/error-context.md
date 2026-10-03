# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pixels.spec.ts >> and the ground has structure at every altitude it is visible from @mobile
- Location: tests/e2e/pixels.spec.ts:294:1

# Error details

```
Error: 40000 m is flat
  200 m: spread 10.46, 5 buckets, top 47%
 6000 m: spread 19.69, 6 buckets, top 19%
40000 m: spread 0.70, 1 buckets, top 73%

expect(received).toBeGreaterThan(expected)

Expected: > 2.5
Received:   0.7023435197510194
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic:
      - banner [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: Starship
          - generic [ref=e8]: Booster Sep
          - generic [ref=e9]: Manual
        - generic [ref=e10]:
          - generic [ref=e11]: T+
          - generic [ref=e12]: 00:00:00
        - generic [ref=e13]:
          - button "Pause" [ref=e14]:
            - text: Pause
            - generic [ref=e15]: P
          - button "Cinematic" [ref=e17]
          - button "Sound" [pressed] [ref=e24]
          - button "Black box" [ref=e30]
          - button "Menu" [ref=e34]:
            - text: Menu
            - generic [ref=e35]: Esc
      - region "Flight data" [ref=e37]:
        - generic [ref=e38]:
          - status [ref=e40]:
            - generic [ref=e41]: PRE-FLIGHT
            - generic [ref=e42]: → BOOSTBACK
          - button "Details" [ref=e43]
        - status [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: Altitude
              - generic [ref=e52]:
                - generic [ref=e53]: "40.0"
                - generic [ref=e54]: KM
            - generic [ref=e58]:
              - generic [ref=e59]: V/S
              - generic [ref=e62]:
                - generic [ref=e63]: "0"
                - generic [ref=e64]: M/S
            - generic [ref=e65]:
              - generic [ref=e66]: Speed
              - generic [ref=e69]:
                - generic [ref=e70]: "60"
                - generic [ref=e71]: M/S
          - generic [ref=e75]:
            - generic [ref=e77]:
              - generic [ref=e78]: Propellant
              - generic [ref=e79]:
                - generic [ref=e80]: CH4
                - generic [ref=e85]: LOX
              - generic [ref=e90]:
                - generic [ref=e91]: "500"
                - generic [ref=e92]: T
            - generic [ref=e93]:
              - generic [ref=e94]: Attitude
              - generic [ref=e99]:
                - generic [ref=e100]: "45"
                - generic [ref=e101]: °
          - generic [ref=e102]:
            - generic [ref=e103]:
              - generic [ref=e104]: Centre · 3
              - generic [ref=e105]: 0 lit · 0 start · 0 fail
            - generic [ref=e106]:
              - generic [ref=e107]: Inner · 10
              - generic [ref=e108]: 0 lit · 0 start · 0 fail
            - generic [ref=e109]:
              - generic [ref=e110]: Outer · 20
              - generic [ref=e111]: 0 lit · 0 start · 0 fail
      - region "Trajectory map" [ref=e112]:
        - button "Trajectory" [ref=e113]
      - generic [ref=e116]:
        - region "Engines" [ref=e117]:
          - button "Engines controls" [ref=e119]:
            - generic [ref=e120]: Engines
        - region "Flight" [ref=e123]:
          - generic [ref=e124]:
            - button "Flight controls" [ref=e125]:
              - generic [ref=e126]: Flight
            - button "Zoom out" [ref=e129]:
              - generic [ref=e130]: −
            - button "Zoom in" [ref=e131]:
              - generic [ref=e132]: +
  - button "select to enable accessibility for this content" [ref=e133]
```

# Test source

```ts
  227 |     ellipses at one alpha over a blue sky are two values with a hard edge between
  228 |     them, and two values far apart is what a large standard deviation measures.
  229 | 
  230 |     These are the statistics that actually say "not a cutout", measured before
  231 |     and after on the same frame:
  232 | 
  233 |                                       before    after
  234 |       pure-white share of the band     0.147    0.0002
  235 |       mid-tone share of cloud pixels   0.261     0.932
  236 |       distinct tone buckets                5         6
  237 |   */
  238 |   expect(blownShare, `the deck still burns out to flat white\n${message}`).toBeLessThan(0.02);
  239 |   expect(midShare, `the deck is two values with an edge between them\n${message}`).toBeGreaterThan(
  240 |     0.7,
  241 |   );
  242 |   /*
  243 |     A floor rather than a target. The band is a fixed fraction of the frame and a
  244 |     portrait phone's frame is very tall, so the same deck fills 29% of it on the
  245 |     desktop project and 7% on a Pixel 7 — the deck has not changed, the frame
  246 |     has. What this guards against is measuring the shares above over nothing.
  247 |   */
  248 |   expect(cloudy / pixels, `there is no deck to measure\n${message}`).toBeGreaterThan(0.04);
  249 | });
  250 | 
  251 | test('the ground band is ground @mobile', async ({ page }) => {
  252 |   test.setTimeout(120_000);
  253 |   await page.goto('/', { waitUntil: 'load' });
  254 |   await ready(page);
  255 |   await preset(page, 'booster-sep', { altitude: '6000', speedX: '60', speedY: '0' });
  256 | 
  257 |   const report = await readFrame(page, SPEC);
  258 |   const scale = await metrePixels(page);
  259 |   const message = describeFrame(report, scale);
  260 |   const ground = report.regions['ground']!;
  261 | 
  262 |   // Opaque, mid-toned, and not the sky. Everything a band of earth has to be.
  263 |   expect(ground.meanLuma, `the ground band is unlit\n${message}`).toBeGreaterThan(80);
  264 |   expect(ground.meanLuma, `the ground band is blown out\n${message}`).toBeLessThan(210);
  265 |   expect(ground.darkFraction, `the ground band is night\n${message}`).toBeLessThan(0.2);
  266 | 
  267 |   /*
  268 |     THE MEASUREMENT M9.8 MOVED, now asserted rather than recorded.
  269 | 
  270 |     M9.1 found this band to be ONE COLOUR at six kilometres: luma spread 0.47 on
  271 |     the desktop project, a single tone bucket, and a 4-bit colour histogram in
  272 |     which one bin held 100% of the pixels. No screenshot ever said that out loud
  273 |     and it was the whole of M9.8's case. After it:
  274 | 
  275 |       altitude    spread   tone buckets   dominant bin
  276 |         200 m       9.82        3             0.42
  277 |        6 000 m      9.63        3             0.41
  278 |       40 000 m      8.69        3             0.40
  279 |   */
  280 |   expect(ground.lumaSpread, `the ground band is one flat value again\n${message}`).toBeGreaterThan(
  281 |     3,
  282 |   );
  283 |   expect(
  284 |     ground.topColours[0]!.fraction,
  285 |     `one colour has taken the whole band back\n${message}`,
  286 |   ).toBeLessThan(0.8);
  287 |   console.log(
  288 |     `ground band: spread ${ground.lumaSpread.toFixed(2)}, ` +
  289 |       `${ground.toneBuckets} tone bucket(s), top colour ${ground.topColours[0]!.rgb} ` +
  290 |       `at ${(ground.topColours[0]!.fraction * 100).toFixed(0)}%`,
  291 |   );
  292 | });
  293 | 
  294 | test('and the ground has structure at every altitude it is visible from @mobile', async ({
  295 |   page,
  296 | }) => {
  297 |   test.setTimeout(180_000);
  298 |   await page.goto('/?debug=1', { waitUntil: 'load' });
  299 |   await ready(page);
  300 | 
  301 |   /*
  302 |     THE ACCEPTANCE LINE'S "THREE ALTITUDES". Two hundred metres is scenery
  303 |     distance, six kilometres is above the cloud deck, forty is where the band is
  304 |     a strip near the horizon — and before M9.8 all three measured the same
  305 |     single value, because a flat fill does not care how far away it is.
  306 |   */
  307 |   const report: string[] = [];
  308 |   for (const altitude of ['200', '6000', '40000']) {
  309 |     // This is a terrain photograph at the named altitude. Waiting while a
  310 |     // free-falling flight runs can move 200 m below the far-earth threshold.
  311 |     // The app initializes the camera at the new scenario; paint it while paused.
  312 |     await page.evaluate((height) => {
  313 |       const debug = (window as unknown as { __simDebug: import('../../src/app/debug').SimDebug }).__simDebug;
  314 |       debug.pause();
  315 |       debug.setScenario('booster-sep', { altitude: Number(height), speedX: 60, speedY: 0 });
  316 |     }, altitude);
  317 |     await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  318 |     const photographedAltitude = await page.evaluate(() =>
  319 |       Number((window as unknown as { __simDebug: import('../../src/app/debug').SimDebug }).__simDebug.telemetry()['kinematics.altitude']));
  320 |     expect(photographedAltitude, 'photograph the configured terrain altitude').toBe(Number(altitude));
  321 |     const frame = await readFrame(page, { regions: { ground: GROUND }, map: { cols: 48, rows: 14 } });
  322 |     const band = frame.regions['ground']!;
  323 |     report.push(
  324 |       `${altitude.padStart(5)} m: spread ${band.lumaSpread.toFixed(2)}, ` +
  325 |         `${band.toneBuckets} buckets, top ${(band.topColours[0]!.fraction * 100).toFixed(0)}%`,
  326 |     );
> 327 |     expect(band.lumaSpread, `${altitude} m is flat\n${report.join('\n')}`).toBeGreaterThan(2.5);
      |                                                                            ^ Error: 40000 m is flat
  328 |     expect(
  329 |       band.topColours[0]!.fraction,
  330 |       `${altitude} m is one colour\n${report.join('\n')}`,
  331 |     ).toBeLessThan(0.8);
  332 |   }
  333 |   console.log(report.join('\n'));
  334 | });
  335 | 
```