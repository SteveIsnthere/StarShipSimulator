# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-budget.spec.ts >> full-frame visual budgets >> launch: CPU + GPU completion and actual cadence @mobile @visual-budget
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
        - generic [ref=e8]: Launch Pad
        - generic [ref=e9]:
          - generic [ref=e10]: Autopilot ·
          - text: Lift off
      - generic [ref=e11]:
        - generic [ref=e12]: T+
        - generic [ref=e13]: 00:00:53
      - generic [ref=e14]:
        - button "Pause" [ref=e15]:
          - text: Pause
          - generic [ref=e16]: P
        - button "Cinematic" [ref=e18]
        - button "Sound" [pressed] [ref=e26]
        - button "Black box" [ref=e33]
        - button "Menu" [ref=e38]:
          - text: Menu
          - generic [ref=e39]: Esc
    - region "Flight data" [ref=e41]:
      - generic [ref=e42]:
        - generic [ref=e43]:
          - list [ref=e44]:
            - listitem [ref=e45]:
              - generic [ref=e46]: LIFTOFF
            - listitem [ref=e50]:
              - generic [ref=e51]: MAX-Q
            - listitem [ref=e55]:
              - generic [ref=e56]: MECO
            - listitem [ref=e60]:
              - generic [ref=e61]: APOGEE
            - listitem [ref=e65]:
              - generic [ref=e66]: FLIP
            - listitem [ref=e70]:
              - generic [ref=e71]: LANDING BURN
            - listitem [ref=e75]:
              - generic [ref=e76]: TOUCHDOWN
          - status [ref=e79]: LIFTOFF→ MAX-Q
        - button "Details" [expanded] [ref=e80]
      - status [ref=e83]:
        - generic [ref=e84]:
          - generic [ref=e85]:
            - generic [ref=e86]:
              - generic [ref=e87]: Altitude
              - generic [ref=e88]:
                - generic [ref=e89]: Dial range
                - text: 0–20KM
            - generic [ref=e94]:
              - generic [ref=e95]: "9.5"
              - generic [ref=e96]: KM
          - generic [ref=e97]:
            - generic [ref=e98]: Vertical speed
            - generic [ref=e101]:
              - generic [ref=e102]: "361"
              - generic [ref=e103]: M/S
          - generic [ref=e104]:
            - generic [ref=e105]:
              - generic [ref=e106]: Speed
              - generic [ref=e107]:
                - generic [ref=e108]: Dial range
                - text: 0–500M/S
            - generic [ref=e113]:
              - generic [ref=e114]: "373"
              - generic [ref=e115]: M/S
        - generic [ref=e116]:
          - generic [ref=e118]:
            - generic [ref=e119]: Propellant
            - generic [ref=e120]: CH4
            - generic [ref=e124]: LOX
            - generic [ref=e128]:
              - generic [ref=e129]: "226"
              - generic [ref=e130]: T
          - generic [ref=e131]:
            - generic [ref=e132]: Engines
            - generic [ref=e133]: SL
            - generic [ref=e141]: Vac
          - generic [ref=e149]:
            - generic [ref=e150]: Attitude
            - generic [ref=e155]:
              - generic [ref=e156]: "17"
              - generic [ref=e157]: °
        - generic [ref=e158]:
          - generic [ref=e159]:
            - generic "Horizontal speed" [ref=e160]: H/S
            - generic [ref=e161]:
              - generic [ref=e162]: "100"
              - generic [ref=e163]: M/S
          - generic [ref=e164]:
            - generic "Speed as a multiple of the speed of sound" [ref=e165]: Mach
            - generic [ref=e166]: "1.24"
          - generic [ref=e168]:
            - generic "Dynamic pressure" [ref=e169]: Q
            - generic [ref=e170]:
              - generic [ref=e171]: "30.5"
              - generic [ref=e172]: KPA
          - generic [ref=e173]:
            - generic "Acceleration felt on board, in g" [ref=e174]: G
            - generic [ref=e175]: "1.8"
          - generic [ref=e177]:
            - generic "Thrust to weight ratio" [ref=e178]: TWR
            - generic [ref=e179]: "2.3"
          - generic [ref=e181]:
            - generic "Throttle" [ref=e182]
            - generic [ref=e183]:
              - generic [ref=e184]: "100"
              - generic [ref=e185]: "%"
          - generic [ref=e186]:
            - generic "Skin temperature" [ref=e187]: Heat
            - generic [ref=e188]:
              - generic [ref=e189]: "497"
              - generic [ref=e190]: K
          - generic [ref=e191]:
            - generic "Distance to the landing site" [ref=e192]: Range
            - generic [ref=e193]:
              - generic [ref=e194]: "1.2"
              - generic [ref=e195]: KM
    - region "Trajectory map" [ref=e196]:
      - button "Trajectory" [expanded] [ref=e197]
    - generic [ref=e202]:
      - region "Engines" [ref=e203]:
        - button "Engines controls" [expanded] [ref=e205]:
          - generic [ref=e206]: Engines
        - generic [ref=e210]:
          - generic [ref=e211]:
            - button "Engines" [pressed] [ref=e212]:
              - generic [ref=e214]: Space
            - group "Sea-level engines" [ref=e216]:
              - generic [ref=e217]: SL
              - button "Sea-level engine 1" [pressed] [ref=e218]
              - button "Sea-level engine 2" [pressed] [ref=e220]
              - button "Sea-level engine 3" [pressed] [ref=e222]
            - group "Vacuum engines" [ref=e224]:
              - generic [ref=e225]: Vac
              - button "Vacuum engine 1" [ref=e226]
              - button "Vacuum engine 2" [ref=e228]
              - button "Vacuum engine 3" [ref=e230]
          - generic [ref=e232]:
            - generic [ref=e233]:
              - generic [ref=e234]: Throttle
              - generic [ref=e235]: 100 %
            - slider "Throttle" [ref=e237] [cursor=pointer]: "100"
          - button "Throttle guard" [pressed] [ref=e238]:
            - generic [ref=e240]: "On"
          - generic [ref=e241]: Throttles back to keep the speed under the safe dynamic-pressure limit.
      - region "Flight" [ref=e242]:
        - generic [ref=e243]:
          - button "Flight controls" [expanded] [ref=e244]:
            - generic [ref=e245]: Flight
          - button "Zoom out" [ref=e248]:
            - generic [ref=e249]: −
          - button "Zoom in" [ref=e250]:
            - generic [ref=e251]: +
        - generic [ref=e253]:
          - generic [ref=e254]: Ship
          - generic [ref=e255]:
            - generic [ref=e256]:
              - generic [ref=e257]: Attitude
              - generic [ref=e258]: Centre
            - slider "Attitude" [ref=e259] [cursor=pointer]: "0"
          - group "Autopilot" [ref=e260]:
            - button "Manual" [ref=e261]
            - button "Lift off" [active] [pressed] [ref=e262]
            - button "Boost back" [ref=e263]
            - button "Hold attitude" [ref=e264]
            - button "Land" [ref=e265]
            - button "Deorbit" [ref=e266]
          - group "Systems" [ref=e267]:
            - button "Fins" [ref=e268]
            - button "Reaction control" [ref=e269]
            - button "Dump propellant" [ref=e270]
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