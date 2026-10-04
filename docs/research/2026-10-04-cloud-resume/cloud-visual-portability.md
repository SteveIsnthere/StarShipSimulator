# Cloud visual and timing acceptance portability

Steve explicitly superseded the Mac-exclusive execution restriction: “it shouldnt be mac exclusive, everything should beable to run in this env, if not fix it”. Gate, timing, browser, visual inspection and motion checks may run in this managed cloud environment. Their acceptance bounds, physical limits, coverage floors and review requirements remain unchanged. This is execution authorization, not a passing receipt or a claim about native GPU or physical phone hardware.

The supported cloud renderer is Chromium software WebGL through SwiftShader. The dedicated configs select that policy explicitly; `E2E_GPU_POLICY=default` requests Chromium's available default backend, while `metal` is supported only on macOS. Receipts record policy and actual renderer separately. This environment exposes no observed DRI/NVIDIA device nodes. Software GPU completion and cadence can be measured here; actual handset/native-GPU conclusions cannot be inferred from them.

Run commands serially after fixing the genuine default catch setup and preparing the exact reviewed source. Source activation is required for every cloud shell call. Full source manifests include tracked deletions and untracked implementation files; receipts pin those manifests, the Git head and all shipped build bytes before/after each capture. A changed source or build fails the capture instead of silently mixing evidence. Service-worker build version, browser version, launch flags, root/filter resolution and antialias state, observed WebGL renderer, host CPU model/resources and cgroup limits accompany the artifacts.

```bash
source /workspace/cloud-bootstrap/starship-v*/activate.sh
npm run gate
npm run bench
RUN_VISUAL_BUDGET=1 npx playwright test --config playwright.visual-budget.config.ts
npx playwright test --config playwright.visual-motion.config.ts
```

The frame config uses exactly 1280×720/DPR1, 390×844/DPR2 and 844×390/DPR2, one worker and zero retries. It retains all six base scenes, simultaneous failure/onset, warmup/sample counts, original p95/cadence/spike bounds and GPU completion controls. Normal full-suite phone descriptors remain unchanged. `npm run bench` serializes its own timing files on every host; other heavy work must also be stopped during measurement.

The motion config records full-viewport video and source/build/runtime receipts for the six-scene, natural-damage, staging and shake witnesses. Video recording is separate from the frame-budget run so capture overhead does not change its timing work. Existing paired cause-off PNGs and pixel assertions remain available. Inspect the actual motion/captures against the reference ledger; structure tests alone cannot accept photographic appearance. Ordinary gate runs do not enable the extra motion receipts/video work.

**Remaining genuine motion capture:** the canonical six-scene setup currently pauses and advances raw fixed steps before taking a snapshot. Recording a video of that witness preserves setup and rendered snapshots; it does not prove sustained actual session motion in all six scenes. A future bounded capture task must record resumed production-loop clips at the six physical scene moments, including the genuine descending catch approach and physical catch transition rather than only the already-caught endpoint. Natural damage must also receive an animated loss/breakup clip with rendered fire/smoke disabled for structural inspection, while retaining inherited motion and actual authority-loss evidence. Existing shake witnesses do exercise actual image motion, but they do not replace these six-scene and damage clips. This document reports tooling availability and outstanding work, not an executed browser or motion acceptance result.

WebGPU completion is unsupported by the current probe and is an explicit failed measurement if selected, rather than an automatic skip or a software result called native. The approved cloud route uses WebGL, so no speculative WebGPU replacement is necessary. No current portability change claims a frame-budget, gameplay, visual-quality or release pass; those receipts must come from the executed checks.
