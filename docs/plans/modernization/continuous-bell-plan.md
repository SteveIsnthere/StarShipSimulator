# Continuous exhaust bell implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. Steve already authorized native independent execution of the full roadmap; no additional handover approval is pending.

**Goal:** Make the existing pressure-expanded exhaust bell continuous and visible rather than relying on random soft particles to define its silhouette.

**Architecture:** Add a deterministic nozzle-frame emissive field alongside the existing particle pool. One preallocated mesh per existing Raptor mount represents the continuous gas; unchanged particles retain small-scale detail. Geometry reads the existing pressure curves and bell configuration, and all drawing remains in `view/` with lifecycle wiring in the scene.

**Tech Stack:** TypeScript, existing PixiJS meshes and generated textures, Vitest and real Playwright/WebGL witnesses; no new dependencies.

**Spec:** `modernization-GOAL.md`, `modernization-roadmap.md` (physically driven engine visuals), and `../../research/2026-10-02-phase6b-body-moment/fallback-browser-cycle3-review.md`.

## Global constraints

- This is cycle3attempt2's rendering representation change, not another claimed particle implementation bug. It brings the minimum continuous-bell prerequisite forward from the approved engine-visual scope; Phase8 remains unfinished.
- Simulation, core constants, goldens, intro timing/trajectory, presets, pig, legacy fixtures, deploy and service workers remain unchanged.
- Existing emitter constants, pressure curves, seeds, sample count/interval, detector thresholds200/100, plume numeric acceptance bounds and retries remain unchanged.
- No per-frame allocation. Meshes, geometry buffers, texture and model output are allocated once. No React/store work on frames. Do not append children to the fixed particle pool.
- No brightness sweep against failing screenshots. The authored field is an explicit visual representation, not a quantitative radiation model or a new claim of radiance conservation.
- Use the existing `RAPTORS` table for engine count and mount offsets. Existing bell start/end tint, alpha, speed, drag, life and size define its longitudinal field. Draw one contribution per running engine rather than changing those emitter parameters.
- Preserve the original full gate, mutation, five-project browser suite and independent release reviews. A focused green witness is not release acceptance.

## Review focus

- Engine shutdown, failure and flight restart leave no continuous gas from a preceding flight.
- A paused flight keeps its frozen nozzle-frame field; hiding particles for a background capture hides this field too.
- A rotated vehicle and changing camera scale preserve attachment and the prescribed pressure envelope.
- One engine and an engine-out flight remain visible without inventing running engines or changing control capabilities.
- Normal smoke still occludes additive gas; all renderer recovery and sampling witnesses remain valid.

---

### Task 1: Deterministic bell geometry and renderer

**Files:** Create `src/view/emissive-bell.ts`; test `tests/view/emissive-bell.test.ts` and `tests/e2e/renderer/post-witness.ts`.

**Interfaces:** Export `createEmissiveBell(): EmissiveBell` and `EmissiveBell { readonly container: Container; update(state: SimState, scale: number, nozzleX: number, nozzleY: number, worldDt: number): void; reset(): void; destroy(): void }`. Export `writeBellGeometry(positions: Float32Array, uvs: Float32Array, expansion: number, spread: number, reach: number, frontAge: number): void` for pure geometry witnesses; buffers contain a fixed sequence of five vertices per age row from birth to nominal bell life.

- [x] Write pure tests for finite geometry, a zero-age nozzle section, smooth increasing envelope as pressure drops, and reused buffer identity. Read `EFFECTS.raptorPlume`, `plumeScaleFactor`, `plumeSpreadFactor`, `RAPTORS` and existing colour helpers first.
- [x] Implement geometry from the existing bell's closed-form travel and size, without a new empirical width constant. For each fixed age fraction `t`, use:

```ts
const tEffective = Math.min(t, frontAge / EFFECTS.raptorPlume.life);
const age = tEffective * EFFECTS.raptorPlume.life;
const size = 0.9 * expansion * reach;
const travel = EFFECTS.raptorPlume.speed / EFFECTS.raptorPlume.drag
  * (1 - Math.exp(-EFFECTS.raptorPlume.drag * age)) * size;
const angle = EFFECTS.raptorPlume.spread * spread;
const fan = travel * Math.sin(angle);
const radius = fan + (EFFECTS.raptorPlume.startSize
    + (EFFECTS.raptorPlume.endSize - EFFECTS.raptorPlume.startSize) * tEffective) * size / 2;
const axial = travel * Math.cos(angle);
```

  Write five positions at x `[-radius,-fan,0,fan,radius]`, y `axial`; UVu `(x / radius + 1) / 2` across the whole envelope (see cycle3attempt3 ruling), UVv `tEffective`. Repeated birth vertices are intentionally degenerate, with no epsilon width. Allocate32 rows once; this is geometric tessellation, not a new plume calibration.
- [x] Generate one startup coloured texture whose longitudinal tint and alpha interpolate the existing bell start/end values against `t`; the unchanged soft radial profile spans the whole transverse envelope. Extract and reuse that profile; actual-image review rejected the initial constant interior plateau (history below). This is authored continuous gas, not a photometry correction. Reuse existing packed colour helpers. Do not add a test-specific contrast gain, backdrop, exposure or pressure switch.
- [x] Create one reusable mesh per `RAPTORS` entry, using that shared texture and additive blending. On update, show only actually running nonfailed engines under actual positive thrust; scale by the actual viewport and existing power/reach calculation; place mount offsets perpendicular to the vehicle axis from the existing rendered nozzle. Match the existing nozzle-frame pitch convention. All per-frame writes mutate preallocated buffers/transforms and visibility only. Advance preallocated per-engine frontAge by worldDt up to nominal life; dt0 holds, engine off/failure and flight reset clear it. Each mount adds one field contribution, never multiplied again by the total engine count. Share one owned texture/source and destroy it exactly once; each mesh owns its geometry.
- [x] Add real-renderer controls: emission-off absence, running-engine presence, the same prescribed nozzle/camera across subpixel phases, pressure expansion with the original detector, and both normal-smoke draw orders. Run build before focused units/browser. Record actual rendered appearance and failure inputs; reject a hard-edged artificial cone or detached field instead of weakening acceptance.
- [x] Review and commit a coherent component checkpoint after the meaningful checks pass.

### Task 2: Scene lifecycle and original acceptance

**Files:** Modify `src/ui/session/scene.ts` and optional `src/app/debug.ts` on-demand metadata; add actual scene witness `tests/e2e/emissive-bell.spec.ts`; `tests/ui/session.test.ts` only if its mock interface changes, `tests/e2e/plume.spec.ts` only for on-demand diagnostic metadata (its assertions do not change), and `docs/reference/presentation.md`.

**Interfaces:** Scene owns `EmissiveBell`; the existing `setParticlesVisible(boolean)` hides/restores both particle detail and continuous gas, and `resetFlight()` clears both.

- [x] Add the field as a sibling behind particle detail in `effectsBehind`, keeping pool shape and mixed draw order intact.
- [x] Call `bell.update` after `effects.update`, passing `effects.nozzle.x/y`, current scale/state and worldDt. Keep capture visibility on the field parent so child updates cannot reveal a hidden field. Reset before each new flight, destroy before renderer destruction, and retain the frozen field while paused. Add restart/off-state tests covering actual scene lifecycle.
- [x] Run the unchanged original five-project plume checks with retained actual subject/background pairs and HTML reporter. This is cycle3attempt2; record its result before another diagnosis. Keep all seven renderer quality witnesses.
- [x] Document the continuous field honestly as authored engine visualization driven by existing geometry/state, with particles supplying detail; do not claim quantitative photometry or Phase8 completion.
- [x] If original acceptance still fails, obtain an evidence-backed review of this representation for the third attempt. Never run unchanged code for luck or tune old emitter constants.

### Task 3: Close Phase6b and continue the entire roadmap

**Files:** Existing modernization contract/handover/roadmap, Phase6b plan, reference docs, backlog and saved release evidence.

- [ ] Obtain high-depth and independent source acceptance, preserving rejected approaches and all actual failure evidence.
- [ ] Run complete gate, mutation alone, final five-project full suite and required reviews on unchanged runtime. Retain21 Linux core pins/eight fixture identities; no new Linux regeneration unless simulation changes.
- [ ] Commit/push, merge to main, run main gate, verify hosted deployment/live build identity and live smoke, then tick6b and close/delete finished plans.
- [ ] Write and execute Phase7, then8 and9. This component is not a substitute for the remaining visuals, SuperHeavy, UX, final truth registry, published review pages, main gates or live final build.

## Technical review ruling — 2026-10-02

Fresh plume_cycle3_review accepted five columns with finite existing-size feather; clip longitudinal texture age alongside geometry, reset on actual off/failure/restart and never advance while paused. Actual rendered appearance and unchanged original acceptance remain mandatory. Cost if wrong: visible field artifacts require a new evidence-backed correction before release.

## Execution ledger

Task1 component checkpoint ede66f8: independent review fixes watched red-to-green; seven new tests/83focused/1992full units green; build/lint green; eight desktop post witnesses green before descriptor/teardown repair. Task2 in progress. Scene witness watched absence red, then actual frozen hide/restore and restart green. Optional on-demand bell count exposes actual mesh visibility for shutdown/failure witnesses; no per-frame diagnostics allocation.

## Cycle3attempt3 ruling — actual appearance overrides provisional model

The51numericchecks pass, but fresh independent actualPNGreview rejects flatwhiteinterior. Replace the plateau UV by `(x / radius + 1) / 2` (birthcentre remains0.5), retaining allfivevertices, geometry, pressure curves, perengine contributions, color/alpha and softprofile. This supersedes Task1’s centreUV plateau representation; no gain/oldconfig/threshold change. Actualappearance plus unchanged originalacceptance required. Effectiveparentvisibility regression watchedred then5projectsgreen. Task2 remainsinprogress until appearance accepted; Task3notstarted.

## Task2 accepted checkpoint

Actual-image review accepts the complete-envelope profile. Fullgate1993units/coverage plus smoke/subpath green;84focused,51original/renderer/scene and corrected6scenechecks pass. Stronglow-altitude saturation/distalbeadedtail recordedforPhase8. Finalsourcecommit follows; nextTask3fullrelease acceptance/mutationALONE/fullbrowser,thenmain/liveclosureandremainingphaseplans.

## Final branch verification checkpoint

Task1 and2 complete. Final complete gate, mutation control848/all21faults and five-project fullbrowser480pass/0failed/11configuredskips/0retries pass at unchanged reviewed source. HostedCI37065061174 is green. Task3 still requires final evidence acceptance, main merge/gate/deploy/live verification. Remaining7–9 execution belongs to the active modernization goal; this component plan closes after6b lands, without claiming later phases complete.
