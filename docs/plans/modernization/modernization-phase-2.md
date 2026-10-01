# Phase 2 — Truth harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Physics correctness is judged by truths that hold independently of this code — closed forms, cited published numbers, invariants — and the harness proves its own detectors fire, so Phases 5–7 can move the goldens safely.

**Architecture:** flight_sim's three tiers, at TypeScript scale. Tier 1: closed-form tests, never re-blessed (most already exist in `tests/core/`). Tier 2: a typed registry of cited reference bands, probed by running the real simulation, with a report and an in-band ratchet. Tier 3: the existing goldens. Around them: property-based invariants with fast-check, a small mutation matrix that must turn the suite red, and a `window.__simDebug` API so browser witnesses can set up a moment deterministically and carry a positive control.

**Tech Stack:** TypeScript, Vitest 4, fast-check, Playwright.

**Spec:** [modernization-roadmap.md](modernization-roadmap.md), Phase 2; the flight_sim checklist in [docs/research/2026-09-30-modernization-audit.md](../../research/2026-09-30-modernization-audit.md) § flight_sim as the bar.

## Global Constraints

- Starts after Phase 1 is merged to `main`. Paths are root-relative (the app is no longer under `v2/`).
- No behaviour change in `src/core/` except a Bug fix a new test exposes (the GOAL's precedence rule: failing test first, trajectory audit, independent review). This phase adds tests, tooling and one debug surface.
- The light gate stays ≤ 5 minutes on Steve's Mac. Anything slower runs on demand (`npm run mutation`, `npm run truth:report`) and in CI's manual `e2e-full` job.
- Zero known-reds. A Tier-2 row that is out of band today is reported, not gated, until it first comes in band (the ratchet in Task 2).
- Never tune a constant to bring a row in band (`physics-change-policy`).

## Review Focus

- A row whose source is a forum post or an estimate must not gate: only tier-A rows enter the ratchet.
- The property tests must reach states the scenarios never visit (zero propellant, vacuum, supersonic, inverted), not just replay the presets.
- A mutation that the suite does not catch must make `npm run mutation` exit non-zero and name the mutation.
- `window.__simDebug` must not exist in a normal production page load.
- A witness whose positive control does not fire must fail.

---

### Task 1: The reference-band registry

**Files:**
- Create: `tests/reference/bands.ts`, `tests/reference/anchors.ts`, `tests/reference/probes.ts`, `tests/reference/bands.test.ts`

**Interfaces:**
- Produces:

```ts
// tests/reference/bands.ts
export type Tier = 'A' | 'B';
export interface Band {
  id: string;              // 'raptor2.sl.thrust'
  quantity: string;        // human description with unit
  min: number;
  max: number;
  unit: string;            // SI
  tier: Tier;              // A: manufacturer-stated or physical law; B: telemetry reading or credible estimate
  source: string;          // citation: publisher, document or URL, date
  conditions: string;      // when it holds: altitude, throttle, propellant, scenario
  probe: () => number;     // runs the real simulation and returns the measured value
}
export type Verdict = { id: string; value: number; status: 'IN' | 'OUT'; factor: number };
export function judge(b: Band): Verdict;   // factor = value / nearest bound when OUT, 1 when IN
```

- [ ] **Step 1: Failing tests for `judge`.** In band → `IN`, factor 1; above → `OUT` with factor `value / max`; below → `OUT` with factor `min / value`; a non-finite probe result → `OUT` with factor `Infinity`.
- [ ] **Step 2: Implement `judge`.** Run `npx vitest run tests/reference/bands.test.ts` → PASS.
- [ ] **Step 3: Probes.** `tests/reference/probes.ts` holds small pure helpers that build a `SimState` from `src/core/scenarios.ts` or by hand, step it with `step()`, and read one value: sea-level thrust per engine, vacuum thrust per engine, specific impulse from thrust / (mass flow × g0), full-propellant mass, dry mass, belly-flop terminal speed at 1 km (drop from 10 km at 90° pitch, engines off, read speed when altitude < 1 km), peak deceleration and peak heat flux on the `reentry` preset, circular orbit speed at 200 km.
- [ ] **Step 4: The rows.** `tests/reference/anchors.ts` exports `BANDS: Band[]`. Bands are about ±25% unless the source is tighter. Each source string names the publisher and date. Rows for this phase (more come in Phases 6–7):

| id | quantity | tier | source |
|---|---|---|---|
| `raptor2.sl.isp` | sea-level Isp, s | A | SpaceX-stated Raptor 2 figures |
| `raptor2.vac.isp` | vacuum Isp of the sea-level engine, s | B | published Raptor 2 estimates |
| `raptor2.sl.thrust` | sea-level thrust per engine, N | A | SpaceX-stated Raptor 2 figures |
| `ship.propellant.capacity` | propellant mass at full load, kg | A | SpaceX Starship user's guide |
| `ship.dry.mass` | dry mass, kg | B | public estimates |
| `ship.bellyflop.terminal` | terminal speed at 1 km in belly-flop attitude, m/s | B | flight-test telemetry readings |
| `orbit.circular.200km` | circular speed at 200 km, m/s | A | vis-viva with R⊕ = 6,371 km |

  Look each number up at implementation time (WebSearch) and write the exact figure, the band and the citation into the row. If no credible source exists for a row, delete the row and say so in the commit — never invent a number.
- [ ] **Step 5:** Commit: `test(reference): a cited band registry, probed from the real simulation`.

### Task 2: The report and the ratchet

**Files:**
- Create: `scripts/truth-report.ts`, `tests/reference/in-band.json`, `tests/reference/ratchet.test.ts`
- Modify: `package.json` (`"truth:report"`)

- [ ] **Step 1:** `npm run truth:report` prints one line per row: `IN   raptor2.sl.isp   327.0 s   [300, 360]   A` or `OUT  orbit.circular.200km  7,763 m/s  [7,780, 7,790]  ×0.998  A`, then a count. Exit 0 always; it is a report.
- [ ] **Step 2: The ratchet test, failing first.** `ratchet.test.ts` loads `in-band.json` (an array of ids) and asserts every listed row judges `IN`, and that every listed id has tier A. Seed the file with the tier-A rows that are `IN` today.
- [ ] **Step 3:** A second assertion: every tier-A row that is `IN` today is in `in-band.json`, so a row that comes in band cannot silently stay ungated. The failure message says "add <id> to tests/reference/in-band.json".
- [ ] **Step 4:** `npm run test` green. Paste the report output into the commit body. Commit: `test(reference): a report for every row, and a ratchet so an in-band truth stays in band`.

### Task 3: Property-based invariants

**Files:**
- Modify: `package.json` (devDependency `fast-check`, pinned)
- Create: `tests/core/invariants.test.ts`, `tests/core/arbitraries.ts`

**Interfaces:**
- Produces: `arbitraryState(): fc.Arbitrary<SimState>` and `arbitraryInput(): fc.Arbitrary<ControlInput>` in `tests/core/arbitraries.ts` — built from a scenario's initial state with altitude, velocity, pitch, angular rate, propellant and engine flags drawn across their physical domains (including 0 propellant, vacuum above 150 km, Mach 0–25, pitch ±π). Use the real `SimState` and input types from `src/core/state.ts`.

- [ ] **Step 1:** Write each property, run it, and confirm it is exercised (`fc.assert(..., { numRuns: 200, seed: 42 })` — a fixed seed so the gate is deterministic; a nightly or manual run may pass `FC_SEED`):
  1. **Finite:** after 120 steps from any arbitrary state and input sequence, every numeric field of `flattenState` is finite or one of the documented sentinels.
  2. **Mass never increases;** propellant never goes below 0.
  3. **Engines off, no wind:** specific mechanical energy (½v² − μ/r) never increases by more than the integrator's measured per-step error bound across 120 steps.
  4. **Determinism:** the same state, dt and input sequence give `Object.is`-identical states twice.
  5. **Time warp is repetition:** stepping N times at dt equals the app loop at warp N for one frame (use the loop helper the batching test uses).
- [ ] **Step 2:** If a property finds a real counterexample, that is a Bug fix: stop, write a focused failing test from the shrunk counterexample, fix under `physics-change-policy`, and note it in the commit.
- [ ] **Step 3:** The file runs in < 20 s. Commit: `test(core): invariants over the whole state space, not just the presets`.

### Task 4: The mutation matrix

**Files:**
- Create: `tests/mutations.json`, `scripts/mutation-check.mjs`
- Modify: `package.json` (`"mutation"`)

- [ ] **Step 1: The matrix.** Each entry is `{ "id", "file", "find", "replace", "expect": "<test file glob that must fail>" }`, exact-string. At least: gravity sign flipped in `src/core/physics/gravity.ts`; drag force zeroed in `aero.ts`; `dt` doubled in the position update of `step.ts`; the sea-level and vacuum Isp anchors swapped in `constants.ts`; the RNG counter not advanced in `rng.ts`; the propellant decrement removed in `mass.ts`. Copy each `find` string from the file at implementation time — the script must refuse an entry whose `find` occurs zero or more than one time.
- [ ] **Step 2: The runner.** `scripts/mutation-check.mjs` copies the repo (minus `node_modules`, `dist`, `.git`) to a temp dir under `os.tmpdir()`, symlinks `node_modules`, and for each entry: applies it, runs `npx vitest run <expect>` there, records CAUGHT only if Vitest reports at least one named assertion failure in the selected files (parse the JSON reporter; an import error, a missing file or zero selected tests is ERROR, not CAUGHT), and restores the file. Before any mutation it runs the same selection unmodified and requires it to pass. It never edits the working tree. It prints a table and exits non-zero if any mutation SURVIVED.
- [ ] **Step 3:** Run `npm run mutation`. Every entry CAUGHT. If one survives, that is a missing test: add the test that catches it (in the suite named by `expect`), then re-run.
- [ ] **Step 4:** Add `npm run mutation` to CI's manual `e2e-full` job, not the gate. Commit: `test: a mutation matrix the suite must turn red`.

### Task 5: `window.__simDebug` and the first witnesses

**Files:**
- Create: `src/app/debug.ts`, `tests/app/debug.test.ts`, `tests/e2e/witness-plume.spec.ts`, `tests/e2e/witness-reentry.spec.ts`
- Modify: the app's start-up wiring (`src/main.ts` or the loop owner), `eslint.config.js`, `.agents/skills/sim-core-conventions/SKILL.md`

**Interfaces:**
- Produces:

```ts
// src/app/debug.ts
export interface SimDebug {
  setScenario(id: ScenarioId): void;
  setState(patch: Partial<FlatState>): void;   // keys as flattenState names them
  pause(): void;
  resume(): void;
  step(n: number): void;                       // fixed-dt steps while paused
  setTimeScale(warp: number): void;
  telemetry(): Readonly<Record<string, number>>; // flattenState of the live state
}
export function installSimDebug(target: Window, deps: { loop: LoopHandle }): void;
```

- [ ] **Step 1: Failing unit test.** `installSimDebug` attaches nothing unless `import.meta.env.DEV` is true or the page URL has `?debug=1`; when attached, `step(60)` advances `totalSteps` by exactly 60 while paused.
- [ ] **Step 2: Implement.** This is the one sanctioned global. Wall 6 forbids assigning to `globalThis`; add a scoped ESLint override for `src/app/debug.ts` only, with a comment naming why, and add one line to `sim-core-conventions` under the walls: "`src/app/debug.ts` is the only file that may attach a global, and only behind `DEV` or `?debug=1`." Add a lint-walls fixture proving the override does not leak to other files.
- [ ] **Step 3: Two witnesses, each with a positive control.**
  - `witness-plume.spec.ts`: `?debug=1`, set the landing-burn scenario, step to engines lit, measure plume pixels below the nozzle with `tests/e2e/pixels.ts` → expect > threshold. **Control:** same setup with engines off → the same measurement must read < threshold; the spec fails if the control does not.
  - `witness-reentry.spec.ts`: set the re-entry scenario at peak heating (by step count from `telemetry()`), measure sheath luma on the windward side → expect present. **Control:** same state with airspeed set low → sheath absent.
- [ ] **Step 4:** Both run in the full tier, and the plume witness also carries `@smoke`. Commit: `test(e2e): a debug surface for deterministic setup, and witnesses that prove they can fail`.

### Task 6: Docs and the phase close

**Files:**
- Modify: `docs/reference/testing.md`, `.agents/skills/physics-change-policy/SKILL.md`, `.agents/skills/verification-and-gates/SKILL.md`, `docs/plans/modernization/modernization-roadmap.md`

- [ ] **Step 1:** `testing.md` gains "Truth tiers": which files are Tier 1, the registry and ratchet, the goldens; the invariants; the mutation matrix; the debug API and witness pattern.
- [ ] **Step 2:** `physics-change-policy`: a physics change now also runs `npm run truth:report` and pastes it into the commit body; a row leaving the band is a failure, never a re-bless.
- [ ] **Step 3:** `verification-and-gates`: add `truth:report`, `mutation` and the witness rule ("a witness without a positive control is not evidence").
- [ ] **Step 4:** Full gate green; `npm run mutation` all CAUGHT. `/code-review high`; merge to `main`; tick Phase 2 in the roadmap; write the Phase 3 plan from the roadmap with `superpowers:writing-plans`.
