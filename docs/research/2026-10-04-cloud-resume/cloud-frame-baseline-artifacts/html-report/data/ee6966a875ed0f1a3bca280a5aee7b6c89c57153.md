# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-budget.spec.ts >> full-frame visual budgets >> entry: CPU + GPU completion and actual cadence @mobile @visual-budget
- Location: tests/e2e/visual-budget.spec.ts:115:5

# Error details

```
TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic:
    - banner [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: Starship
        - generic [ref=e8]: Re-entry
        - generic [ref=e9]: Manual
      - generic [ref=e10]:
        - generic [ref=e11]: T+
        - generic [ref=e12]: 00:00:58
      - generic [ref=e13]:
        - button "Pause" [ref=e14]:
          - text: Pause
          - generic [ref=e15]: P
        - button "Cinematic" [ref=e17]
        - button "Sound" [pressed] [ref=e25]
        - button "Black box" [ref=e32]
        - button "Menu" [ref=e37]:
          - text: Menu
          - generic [ref=e38]: Esc
    - region "Flight data" [ref=e40]:
      - generic [ref=e41]:
        - generic [ref=e42]:
          - list [ref=e43]:
            - listitem [ref=e44]:
              - generic [ref=e45]: ENTRY
            - listitem [ref=e49]:
              - generic [ref=e50]: MAX-Q
            - listitem [ref=e54]:
              - generic [ref=e55]: FLIP
            - listitem [ref=e59]:
              - generic [ref=e60]: LANDING BURN
            - listitem [ref=e64]:
              - generic [ref=e65]: TOUCHDOWN
          - status [ref=e68]: PRE-FLIGHT→ ENTRY
        - button "Details" [expanded] [ref=e69]
      - status [ref=e72]:
        - generic [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]:
              - generic [ref=e76]: Altitude
              - generic [ref=e77]:
                - generic [ref=e78]: Dial range
                - text: 0–100KM
            - generic [ref=e83]:
              - generic [ref=e84]: "75.8"
              - generic [ref=e85]: KM
          - generic [ref=e86]:
            - generic [ref=e87]: Vertical speed
            - generic [ref=e90]:
              - generic [ref=e91]: "-118"
              - generic [ref=e92]: M/S
          - generic [ref=e93]:
            - generic [ref=e94]:
              - generic [ref=e95]: Speed
              - generic [ref=e96]:
                - generic [ref=e97]: Dial range
                - text: 0–8KM/S
            - generic [ref=e102]:
              - generic [ref=e103]: "7.0"
              - generic [ref=e104]: KM/S
        - generic [ref=e105]:
          - generic [ref=e107]:
            - generic [ref=e108]: Propellant
            - generic [ref=e109]: CH4
            - generic [ref=e113]: LOX
            - generic [ref=e117]:
              - generic [ref=e118]: "50"
              - generic [ref=e119]: T
          - generic [ref=e120]:
            - generic [ref=e121]: Engines
            - generic [ref=e122]: SL
            - generic [ref=e130]: Vac
          - generic [ref=e138]:
            - generic [ref=e139]: Attitude
            - generic [ref=e144]:
              - generic [ref=e145]: "-164"
              - generic [ref=e146]: °
        - generic [ref=e147]:
          - generic [ref=e148]:
            - generic "Horizontal speed" [ref=e149]: H/S
            - generic [ref=e150]:
              - generic [ref=e151]: "7036"
              - generic [ref=e152]: M/S
          - generic [ref=e153]:
            - generic "Speed as a multiple of the speed of sound" [ref=e154]: Mach
            - generic [ref=e155]: "24.40"
          - generic [ref=e157]:
            - generic "Dynamic pressure" [ref=e158]: Q
            - generic [ref=e159]:
              - generic [ref=e160]: "0.9"
              - generic [ref=e161]: KPA
          - generic [ref=e162]:
            - generic "Acceleration felt on board, in g" [ref=e163]: G
            - generic [ref=e164]: "0.7"
          - generic [ref=e166]:
            - generic "Thrust to weight ratio" [ref=e167]: TWR
            - generic [ref=e168]: "0.0"
          - generic [ref=e170]:
            - generic "Throttle" [ref=e171]
            - generic [ref=e172]:
              - generic [ref=e173]: "100"
              - generic [ref=e174]: "%"
          - generic [ref=e175]:
            - generic "Skin temperature" [ref=e176]: Heat
            - generic [ref=e177]:
              - generic [ref=e178]: "1262"
              - generic [ref=e179]: K
          - generic [ref=e180]:
            - generic "Distance to the landing site" [ref=e181]: Range
            - generic [ref=e182]:
              - generic [ref=e183]: "-1558.1"
              - generic [ref=e184]: KM
    - region "Trajectory map" [ref=e185]:
      - button "Trajectory" [expanded] [ref=e186]
    - generic [ref=e191]:
      - region "Engines" [ref=e192]:
        - button "Engines controls" [expanded] [ref=e194]:
          - generic [ref=e195]: Engines
        - generic [ref=e199]:
          - generic [ref=e200]:
            - button "Engines" [ref=e201]:
              - generic [ref=e203]: Space
            - group "Sea-level engines" [ref=e205]:
              - generic [ref=e206]: SL
              - button "Sea-level engine 1" [ref=e207]
              - button "Sea-level engine 2" [ref=e209]
              - button "Sea-level engine 3" [ref=e211]
            - group "Vacuum engines" [ref=e213]:
              - generic [ref=e214]: Vac
              - button "Vacuum engine 1" [ref=e215]
              - button "Vacuum engine 2" [ref=e217]
              - button "Vacuum engine 3" [ref=e219]
          - generic [ref=e221]:
            - generic [ref=e222]:
              - generic [ref=e223]: Throttle
              - generic [ref=e224]: "Off"
            - slider "Throttle" [ref=e225] [cursor=pointer]: "100"
          - button "Throttle guard" [ref=e226]:
            - generic [ref=e228]: "Off"
          - generic [ref=e229]: Throttles back to keep the speed under the safe dynamic-pressure limit.
      - region "Flight" [ref=e230]:
        - generic [ref=e231]:
          - button "Flight controls" [expanded] [ref=e232]:
            - generic [ref=e233]: Flight
          - button "Zoom out" [ref=e236]:
            - generic [ref=e237]: −
          - button "Zoom in" [ref=e238]:
            - generic [ref=e239]: +
        - generic [ref=e241]:
          - generic [ref=e242]: Ship
          - generic [ref=e243]:
            - generic [ref=e244]:
              - generic [ref=e245]: Attitude
              - generic [ref=e246]: Centre
            - slider "Attitude" [ref=e247] [cursor=pointer]: "0"
          - group "Autopilot" [ref=e248]:
            - button "Manual" [pressed] [ref=e249]
            - button "Lift off" [ref=e250]
            - button "Boost back" [ref=e251]
            - button "Hold attitude" [ref=e252]
            - button "Land" [ref=e253]
            - button "Deorbit" [ref=e254]
          - group "Systems" [ref=e255]:
            - button "Fins" [ref=e256]
            - button "Reaction control" [ref=e257]
            - button "Dump propellant" [ref=e258]
    - note "Getting started":
      - generic:
        - generic: First flight
        - button "Got it" [ref=e259]
      - paragraph: Take the controls
      - paragraph: Press Engines to light them, then push Throttle up to climb. Menu picks another flight.
      - paragraph:
        - generic:
          - generic: Space
          - text: engines
        - generic:
          - generic: W
          - text: throttle up
```

# Test source

```ts
  55  |   expect(approach, 'genuine guided descending catch approach before terminal state').toBe(true);
  56  | }
  57  | 
  58  | async function setupFailure(page: Page): Promise<void> {
  59  |   await visualScene(page, 'staging');
  60  |   // Synthetic material-domain load fixture, not a natural-flight physics claim.
  61  |   // Both bodies are changed while paused; their next shared step owns terminal capture.
  62  |   await page.evaluate(() => (window as unknown as WindowDebug).__simDebug.setState({ 'damage.hull.valid': false }));
  63  |   await tap(page, 'select-super-heavy');
  64  |   await page.evaluate(() => (window as unknown as WindowDebug).__simDebug.setState({ 'damage.hull.valid': false }));
  65  |   await tap(page, 'select-ship'); await foldControls(page);
  66  | }
  67  | 
  68  | /** Independent no-draw negative and issued-GPU-command positive controls. */
  69  | async function controlProbe(page: Page): Promise<void> {
  70  |   await page.goto('about:blank');
  71  |   const negative = await page.evaluate(async () => {
  72  |     const budget = (window as unknown as WindowDebug).__visualBudget;
  73  |     budget.start(0, 1);
  74  |     await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  75  |     return budget.result();
  76  |   });
  77  |   expect(negative.done, 'RAF callbacks without drawing cannot satisfy capture').toBe(false);
  78  |   // New document clears the unfinished control capture.
  79  |   await page.goto('about:blank');
  80  |   const positive = await page.evaluate(async () => {
  81  |     const budget = (window as unknown as WindowDebug).__visualBudget;
  82  |     const canvas = document.createElement('canvas'); document.body.append(canvas);
  83  |     const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  84  |     if (!gl) throw new Error('No WebGL backend: GPU completion cannot be measured');
  85  |     budget.start(0, 1);
  86  |     await new Promise<void>(resolve => {
  87  |       requestAnimationFrame(() => {
  88  |         const until = performance.now() + 4;
  89  |         while (performance.now() < until) { /* explicit CPU accounting control */ }
  90  |         gl.clearColor(1, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  91  |         requestAnimationFrame(() => resolve());
  92  |       });
  93  |       requestAnimationFrame(() => {
  94  |         const until = performance.now() + 3;
  95  |         while (performance.now() < until) { /* independently paid sibling callback */ }
  96  |         gl.clear(gl.COLOR_BUFFER_BIT);
  97  |       });
  98  |     });
  99  |     return budget.result();
  100 |   });
  101 |   expect(positive.done).toBe(true);
  102 |   expect(positive.frames[0]!.draws).toBeGreaterThan(0);
  103 |   expect(positive.frames[0]!.gpuFences).toBeGreaterThan(0);
  104 |   expect(positive.frames[0]!.callbacks).toBe(2);
  105 |   expect(positive.frames[0]!.cpuMs).toBeGreaterThanOrEqual(7);
  106 |   expect(positive.errors).toEqual([]);
  107 | }
  108 | 
  109 | test.describe('full-frame visual budgets', () => {
  110 |   test.skip(process.env.RUN_VISUAL_BUDGET !== '1', 'Opt in on an idle machine with RUN_VISUAL_BUDGET=1');
  111 |   // --workers=1 enforces idle-machine serialization without skipping later
  112 |   // scene measurements when an earlier scene legitimately exceeds its budget.
  113 |   test.describe.configure({ mode: 'default', timeout: 600_000 });
  114 |   for (const scene of [...VISUAL_SCENES, 'simultaneous-failure'] as const) {
  115 |     test(`${scene}: CPU + GPU completion and actual cadence @mobile @visual-budget`, async ({ page, browser }, info) => {
  116 |       expect(info.config.workers, 'run this opt-in measurement with --workers=1').toBe(1);
  117 |       const runtimeBefore = await visualRuntimeReceipt(browser, info);
  118 |       await attachVisualRuntimeReceipt(info, 'before', runtimeBefore);
  119 |       await page.addInitScript(installBudgetProbe);
  120 |       await controlProbe(page);
  121 |       const short = scene === 'landing' || scene === 'catch';
  122 |       const count = short ? 30 : 300;
  123 |       const segments: { frames: BudgetFrame[]; before: Record<string, number | boolean>;
  124 |         after: Record<string, number | boolean>;
  125 |         rendererBefore: DebugRendererMetadata; rendererAfter: DebugRendererMetadata }[] = [];
  126 |       const onset: BudgetFrame[] = [];
  127 |       let onsetMetadata: { before: DebugRendererMetadata; after: DebugRendererMetadata } | undefined;
  128 |       for (let segment = 0; segment < (short ? 10 : 1); segment++) {
  129 |         if (scene === 'catch') await setupCatch(page);
  130 |         else if (scene === 'simultaneous-failure') await setupFailure(page);
  131 |         else await visualScene(page, scene as VisualScene);
  132 |         const before = await state(page);
  133 |         const rendererBeforeOnset = await rendererMetadata(page);
  134 |         // Failure onset is separately measured without discarding the transition.
  135 |         if (scene === 'simultaneous-failure') {
  136 |           await page.evaluate(() => {
  137 |             const w = window as unknown as WindowDebug;
  138 |             w.__visualBudget.start(0, 30); w.__simDebug.resume();
  139 |           });
  140 |           await page.waitForFunction(() => (window as unknown as WindowDebug).__visualBudget.result().done,
  141 |             undefined, { polling: 100, timeout: 60_000 });
  142 |           onset.push(...(await probe(page)).frames);
  143 |           onsetMetadata = { before: rendererBeforeOnset, after: await rendererMetadata(page) };
  144 |           expect((await state(page))['damage.terminal.active']).toBe(true);
  145 |           await tap(page, 'select-super-heavy');
  146 |           expect((await state(page))['damage.terminal.active']).toBe(true);
  147 |           await tap(page, 'select-ship'); await foldControls(page);
  148 |         }
  149 |         const rendererBefore = await rendererMetadata(page);
  150 |         await page.evaluate(count => {
  151 |           const w = window as unknown as WindowDebug;
  152 |           w.__visualBudget.start(60, count); w.__simDebug.resume();
  153 |         }, count);
  154 |         // Timer polling avoids adding benchmark-owned RAF callbacks to the CPU sum.
> 155 |         await page.waitForFunction(() => (window as unknown as WindowDebug).__visualBudget.result().done,
      |                    ^ TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.
  156 |           undefined, { polling: 100, timeout: 60_000 });
  157 |         const measured = await probe(page);
  158 |         const after = await state(page);
  159 |         const rendererAfter = await rendererMetadata(page);
  160 |         await info.attach(`segment-${segment}.json`, {
  161 |           body: JSON.stringify({ scene, before, after, rendererBefore, rendererAfter, measured }, null, 2), contentType: 'application/json',
  162 |         });
  163 |         expect(measured.errors, 'unsupported GPU or context loss is a failed measurement').toEqual([]);
  164 |         expect(measured.contexts.length, 'must capture an actual GPU context').toBeGreaterThan(0);
  165 |         expect(measured.frames).toHaveLength(count);
  166 |         expect(measured.frames.every(frame => frame.gpuFences > 0 && frame.callbacks >= 2),
  167 |           'each measured aggregate must include drawing, completion fence and both production RAF loops').toBe(true);
  168 |         expect(Number(after['world.environmentTime'])).toBeGreaterThan(Number(before['world.environmentTime']));
  169 |         if (scene !== 'simultaneous-failure') {
  170 |           expect(after['status.landed'], 'active window must end before touchdown/catch').toBe(false);
  171 |           expect(after['failures.crashed']).toBe(false);
  172 |           expect(after['failures.inFlightBreakUp']).toBe(false);
  173 |           if (scene === 'launch' || scene === 'staging' || scene === 'landing')
  174 |             expect(Number(after['forces.thrust'])).toBeGreaterThan(0);
  175 |           if (scene === 'entry') expect(Number(after['forces.thermalPower'])).toBeGreaterThan(0);
  176 |           if (scene === 'catch') {
  177 |             expect(Number(after['kinematics.altitude'])).toBeLessThan(1000);
  178 |             expect(Number(after['kinematics.speedY'])).toBeLessThan(0);
  179 |           }
  180 |         }
  181 |         segments.push({ frames: measured.frames, before: { ...before }, after: { ...after }, rendererBefore, rendererAfter });
  182 |         await page.evaluate(() => (window as unknown as WindowDebug).__simDebug.pause());
  183 |       }
  184 |       const frames = segments.flatMap(segment => segment.frames);
  185 |       const intervals = segments.flatMap(segment => segment.frames.slice(1).map((frame, i) =>
  186 |         frame.timestamp - segment.frames[i]!.timestamp));
  187 |       const total = statistics(frames.map(frame => frame.cpuMs + frame.gpuWaitMs));
  188 |       const cadence = 1000 / statistics(intervals).mean;
  189 |       const phone = info.project.name !== 'chromium';
  190 |       const metadata = await probe(page);
  191 |       const report = { label: 'conservative GPU-fenced Chromium viewport emulation',
  192 |         identity: { sourceHead: runtimeBefore.source.head, sourceSha256: runtimeBefore.source.sha256,
  193 |           buildSha256: runtimeBefore.build.sha256, serviceWorkerVersion: runtimeBefore.build.serviceWorkerVersion },
  194 |         browser: runtimeBefore.browser, host: runtimeBefore.host,
  195 |         scene, project: info.project.name, viewport: page.viewportSize(), deviceDpr: metadata.dpr,
  196 |         contexts: metadata.contexts, cpuThrottling: 'none', warmFramesPerSegment: 60,
  197 |         measuredFrames: frames.length, segmentCount: segments.length, segmentLengths: segments.map(s => s.frames.length),
  198 |         excluded: 'setup/raw stepping, warmup and gaps between independently reset segments',
  199 |         cpu: statistics(frames.map(frame => frame.cpuMs)), gpuCompletionWait: statistics(frames.map(frame => frame.gpuWaitMs)),
  200 |         fullRAFWork: total, cadenceFps: cadence, frameIntervals: statistics(intervals),
  201 |         onset: onset.length ? { frames: onset, renderer: onsetMetadata,
  202 |           work: statistics(onset.map(f => f.cpuMs + f.gpuWaitMs)) } : null,
  203 |         segments, limitations: 'GPU wait includes queue drain, not isolated GPU execution; excludes compositor/presentation and non-RAF tasks. Phone viewport is not physical phone GPU.' };
  204 |       await info.attach('full-frame-budget.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
  205 |       await page.screenshot({ path: info.outputPath(`${scene}-budget.png`) });
  206 |       const runtimeAfter = await visualRuntimeReceipt(browser, info);
  207 |       await attachVisualRuntimeReceipt(info, 'after', runtimeAfter);
  208 |       expect(runtimeAfter.source.sha256, 'source cannot change during frame acceptance').toBe(runtimeBefore.source.sha256);
  209 |       expect(runtimeAfter.build.sha256, 'served build cannot change during frame acceptance').toBe(runtimeBefore.build.sha256);
  210 |       expect(frames.length).toBeGreaterThanOrEqual(300);
  211 |       expect(total.p95).toBeLessThanOrEqual(phone ? 33.33 : 16.67);
  212 |       expect(cadence).toBeGreaterThanOrEqual(phone ? 29.5 : 59);
  213 |       if (onset.length) expect(statistics(onset.map(f => f.cpuMs + f.gpuWaitMs)).max,
  214 |         'the single failure-onset spike cannot hide inside a percentile').toBeLessThanOrEqual(phone ? 33.33 : 16.67);
  215 |     });
  216 |   }
  217 | });
  218 | 
```