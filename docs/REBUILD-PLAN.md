# Starship Rebuild Plan

**Roadmap v3 — implementation-ready.** Conventions now live as the enforced constitution
in root `CLAUDE.md`; the live task checklist is `docs/ROADMAP-TASKS.md`; implementation
is driven with Claude Code's built-in `/goal` command (goal prompts below). No
application code yet — M0.1 is the first code commit.

Branch: `claude/first-project-rebuild-bjniik`
Baseline: 52 commits, 4,663 lines, summer 2021.
Decided: **Svelte 5 + TypeScript + Vite · PixiJS v8 · fidelity behind flags.**

---

## The read

The simulator works, and the physics and guidance logic are genuinely good. The
scaffolding around them (355 globals, no build, no tests, sim loop welded to frame rate)
is what a first project outgrows. So: not a rewrite, an **extraction**. The 2021
equations and tuning port verbatim, get locked by tests, and only then evolve —
deliberately, behind flags, judged by feel.

---

## Goals

| # | Goal | Measured by |
|---|---|---|
| G1 | **Deterministic flight** — same scenario, seed, inputs → same flight everywhere | Bit-identical trajectories at 30/60/144 fps in CI |
| G2 | **Honest physics, orbit included** — every term faithful-to-2021 or provably better, by flag; fly fast enough sideways and you genuinely stop falling | Orbit demo passes headless; every flag ships with a before/after trajectory diff |
| G3 | **Next-level feel** — modern renderer, real effects, locked frame rate | 60 fps mid-range phone; zero per-frame allocations |
| G4 | **Maintainable by construction** — conventions are lint/CI failures, not prose | Boundary lints active; CLAUDE.md in repo; CI required |
| G5 | **Small and offline** — quarter of today's payload; PWA promise kept | First-load ≤ 250 kB gzip (today ~1,143 kB); airplane-mode playthrough |

---

## Keep — the soul

Ported verbatim, then locked by tests: the flight model and its tuned constants; the
autopilot library and staged landing program (aero descent → computed belly-flop trigger
→ flip → horizontal adjustment → final descent, with 1/2/3-engine branches; boost-back's
aero-then-propulsive fallback); **the intro landing** (non-negotiable); all six scenario
presets, the nine black-box plots, keybinds, tilt control, the starhopper, and the pig
at x = 0.

---

## The physics ledger

### Orbital mechanics — the big one

The 2021 code *tries* to model orbit: `orbitGravityAccCompensation` is exactly the
"fly fast enough sideways and you stop falling" term. It fails three ways:

1. **Linear where physics is quadratic.** Game: `g·|vx|/v_orb`. Reality: `vx²/r`.
   They agree only at exactly orbital velocity; at half orbital velocity the game grants
   2× the correct relief.
2. **Frozen denominator.** `orbitalVelocityAtCurrentAltitude` is computed once at spawn
   (initBackEnd.js:50) and never updated, while the radius is faithfully recomputed
   every frame.
3. **Clamped at g** (physics.js `updateOrbitGravityAccCompensation`). Net upward
   acceleration from speed is impossible — elliptical arcs, lofting, and escape are
   structurally unreachable.

Verified numbers (closed-form):

| Quantity | True | Game |
|---|---|---|
| Net fall rate, Re-entry preset (80 km, 7,300 m/s) | 1.58 m/s² | 0.68 m/s² — falls at 43% of correct rate |
| Centrifugal relief at ½ orbital velocity | 2.37 m/s² | 4.90 m/s² |
| Net accel at 1.2× orbital velocity | +3.86 m/s² upward | 0 (clamped) |

**The fix is architectural, not a patch.** The core simulates in planet-centered
coordinates: state is position/velocity in a 2D frame at the planet's center, gravity is
`−GM·r̂/|r|²`, altitude is `|r| − R`, downrange is the arc angle. Orbits, ellipses, and
escape then *emerge from gravity itself*; the compensation hack and constant-g are
deleted rather than repaired. The world already wraps at the planet's circumference, so
the geometry is native, and the autopilot keeps seeing local vertical/horizontal
components so guidance ports unchanged. Ships as the flagged **planet-centered gravity**
fidelity switch, with the faithful 2021 flat model kept as reference.

### Everything else found

| Finding | Tier | Effect today |
|---|---|---|
| Six quadrant ladders in the acceleration components are identities | Refactor | 143 lines → ~12; proven ≤ 1 ULP over 4M sampled angles; proof committed as a test |
| `upperStrato()` never called | Bug | Atmosphere wrong above 11 km — the whole reentry regime |
| `getReentryHeatPower(noseRadius)` called with cross-sectional area | Bug | Heating scales by √(ρ/area); heat limit triggers at wrong speeds |
| Fin effective-area fraction initialised as an area, updated as a fraction | Bug | ~24× unit discrepancy on frame one |
| `pitchRateOfChange` divides by `renderTimeInterval`, ×3600 papers over it | Bug | Correct only at 60 fps; gates `pitchHold`, so attitude-hold varies per device |
| Ignition delay double-divides by `timeAccel` and runs on wall-clock `setTimeout` | Bug | Real wait shrinks as timeAccel²; engines light timeAccel× early in *simulated* terms (0.75 s → 0.1875 s at 4× warp). Breaks pause and determinism → becomes dt-ticked timer in SimState |
| Stale/linear/clamped orbit relief | Fidelity | Subsumed by planet-centered gravity |
| Gravity constant 9.807 at all altitudes | Fidelity | 4% high at 100 km, 7% at 200 km — deleted automatically under planet-centered gravity |
| Speed of sound constant 343 m/s | Fidelity | Real value at 11 km is 295 m/s → Mach understated ~14%, skewing the Mach-keyed drag coefficient |
| Full ISA atmosphere to 86 km | Fidelity | Replaces the three-layer model and its dead branch |
| Engine-shutdown effect allocates container+emitter per cutoff, never freed | Bug | Unbounded growth; fixed by pooling in the render layer |
| `dynamicPressure` commented `//psi`, computed in kPa | Refactor | Units/comment cleanup |

---

## The physics change policy

**Nothing changes physics silently.** Every core change declares a tier:

| Tier | Meaning | Must ship with |
|---|---|---|
| **Refactor** | Behaviour must not change | Numerical proof over the input domain, max \|Δ\| ≤ 1 ULP, committed as a test |
| **Bug fix** | Provably wrong today | Failing test first; before/after trajectories on all six scenarios; note on feel |
| **Fidelity** | More accurate, deliberately changes feel | Behind a flag, both versions golden-tested; becomes default only after being flown and approved |

Approved fidelity flags: **planet-centered gravity**, **temperature-true speed of
sound**, **full ISA atmosphere**.

---

## Conventions, enforced by machines

The rules that actually broke v1 become build failures:

```
core/ may not import from render/, ui/, or app/    ← the architectural boundary
core/ may not reference document, window, or PIXI  ← getElementById was in the physics loop
core/ may not call Math.random                     ← unseeded randomness blocks golden tests
core/ may not call Date.now or performance.now     ← time enters the sim only as dt
core/ may not call setTimeout or setInterval       ← ignition ran on wall-clock timers
no assignment to globalThis, anywhere              ← the 355
```

Plus:

- **Branded angle types.** `Rad`/`Deg` as branded numbers — degrees into a radians
  parameter is a compile error. Angles only; branding everything is ceremony.
- **Port verbatim, rename later.** Functions port name-intact so the port is a
  line-by-line diff. After goldens lock behaviour, one mechanical rename pass
  (gimbol→gimbal, lowwer→lower, aera→area, faliure→failure, lunchpad→launchpad, …)
  lands with its mapping table committed — goldens prove it changed nothing.
- **CLAUDE.md at the repo root** — architecture, change policy, lint rules and their
  reasons. Read automatically by every future AI session. Highest-leverage file here.

### Performance rules

- The framework never runs inside a frame (measured framework spread: 0.06 ms —
  architecture protects the budget, not framework choice).
- Zero allocation in the per-frame path; particles pooled.
- DOM references cached at startup (old HUD: 45 `getElementById` per frame).
- Budgets in CI: sim step < 1 ms @ 240 Hz · HUD update < 2 ms · first-load ≤ 250 kB gz.
  Plotly (1,008 kB gz) leaves the critical path and cannot return.
- Don't optimise the physics maths — any "optimisation" that changes results is a
  Refactor owing a 1-ULP proof.


---

## Implementation kit

Everything a session needs to start M0 without re-deciding anything.

### Repo layout

The 2021 tree stays untouched at the repo root until M5 retires it. All new code is a
self-contained project under `v2/`:

```
v2/
  package.json  vite.config.ts  tsconfig.json  eslint.config.js
  src/
    core/          # PURE sim — the protected zone (see CLAUDE.md walls)
      state.ts       constants.ts   units.ts    rng.ts    flags.ts
      step.ts        scenarios.ts
      physics/       # atmosphere, aero, thermal, engines, gravity/orbit
      control/       # actuation + low-level autopilot primitives
      autopilot/     # pitchHold, boostBack, autoLand, takeOff
    app/           # loop.ts (fixed dt + accumulator + interpolation), input.ts, wiring
    view/          # PixiJS v8: scene, camera, pooled particles, sky
    hud/           # binder.ts — the single-rAF readout writer
    ui/            # Svelte 5 components: panels, menu, editor, black box (lazy)
  tests/
    golden/        # trajectory fixtures + runner
    proofs/        # 1-ULP equivalence proofs (trig collapse lives here)
    lint-walls/    # violation fixtures proving the walls reject them
.github/workflows/ci.yml
CLAUDE.md          docs/ROADMAP-TASKS.md
```

### Legacy → new map

| 2021 file | Destination |
|---|---|
| `backend/physics.js` | `core/physics/{atmosphere,aero,thermal,engines,gravity}.ts` |
| `backend/initBackEnd.js` | `core/state.ts` + `core/constants.ts` |
| `backend/updateBackEnd.js` | `core/step.ts` |
| `backend/flightcontrol/flightControl.js` | `core/control/actuation.ts` |
| `backend/flightcontrol/autoPilotLowLevelFunctions.js` | `core/control/primitives.ts` |
| `backend/flightcontrol/autoPilotModes.js` | `core/autopilot/*.ts` |
| `backend/utilities/switches.js` | commands into `core/`, button state into `ui/` |
| `utilities/eventListener.js` | `app/input.ts` |
| `render/pixi_init.js`, `pixi_setup.js`, `drawMethods/` | `view/` |
| `displayComponents/dispUpdate.js` | `hud/binder.ts` + `ui/` |
| `backend/utilities/plotting.js` | `ui/blackbox/` (lazy-loaded, uPlot) |

### The six walls as ESLint (flat config, scoped to `src/core`)

```js
{
  files: ['src/core/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [{
      group: ['**/view/**', '**/ui/**', '**/hud/**', '**/app/**', 'pixi.js', 'svelte', 'svelte/*'],
      message: 'core/ is pure: no renderer, UI, or app imports.' }] }],
    'no-restricted-globals': ['error',
      { name: 'document', message: 'No DOM in core/.' },
      { name: 'window',   message: 'No DOM in core/.' }],
    'no-restricted-properties': ['error',
      { object: 'Math', property: 'random', message: 'Use core/rng streams.' },
      { object: 'Date', property: 'now',    message: 'Time enters core/ only as dt.' },
      { object: 'performance', property: 'now', message: 'Time enters core/ only as dt.' }],
    'no-restricted-syntax': ['error',
      { selector: "CallExpression[callee.name=/^(setTimeout|setInterval)$/]",
        message: 'No wall-clock timers in core/.' },
      { selector: "AssignmentExpression[left.object.name='globalThis']",
        message: 'No globals. The 2021 tree had 355.' }]
  }
}
```

The `globalThis` rule applies to all of `v2/`, not just core. `tests/lint-walls/` feeds
one violating fixture per rule to ESLint programmatically and asserts each fails — the
walls themselves are under test.

### Tooling

Svelte ^5 · TypeScript ^5 · Vite (current stable) · Vitest · Playwright (Chromium is
pre-installed in the remote env — never run `playwright install`) · PixiJS ^8 ·
uPlot (lazy, M4.5). Pin exact versions in `v2/package.json` at M0.1 and let CI be the
arbiter thereafter.

---

## Driving implementation: `/goal`

### The M6 goal prompt (current — the Broadcast overhaul, planned 2026-08-25)

```
/goal The Broadcast overhaul is finished: all eight M6 tasks in docs/ROADMAP-TASKS.md are checked off in order, each to its acceptance line, built to the design in docs/BROADCAST-UI-PLAN.md, one id-prefixed commit per task, all pushed to origin claude/first-project-rebuild-bjniik. Proof shown in command output at the end: (1) cd v2 && npm run lint && npm run test && npm run build all exit 0 and npx playwright test green INCLUDING the phone-viewport projects M6.6 adds; (2) git diff v2/src/core against the M6 start commit prints nothing, and the seven golden digests in tests/golden/unification.test.ts are byte-identical to their M2.14 values — the overhaul changed pixels, provably not physics; (3) the neumorphic shadow string appears nowhere in v2/src (grep shown), D-DIN or its test-chosen fallback loads in the offline e2e with its OFL license committed, and the tabular-digits test is green; (4) the mission-event timeline derivation replayed over all seven golden fixtures asserts each scenario's event order; (5) the budget report shows first-load JS <= 250 kB gzip and fonts <= 80 kB, with uPlot still lazy; (6) fresh screenshots at desktop and phone-portrait are committed and the README carries both. Constraints throughout: every 2021 control still exists and works (capability parity — the e2e checklist passes via the data-testid contract); the frozen tree at v2/tests/fixtures/legacy/ is never modified; Svelte renders on interaction only and every per-frame write goes through the single-rAF binder, re-benchmarked under 2 ms on the new DOM. This goal is also met if progress becomes impossible without a new owner decision — in that case the final message states exactly what is blocked, why, and what decision is needed.
```

Claude Code ships a built-in `/goal` command: it sets a **completion condition**, and
after every turn a fast evaluator model reads the transcript and judges whether the
condition is met — if not, Claude keeps working, autonomously, turn after turn.
`/goal` alone shows status; `/goal clear` cancels. An active goal even survives session
resume. Docs: https://code.claude.com/docs/en/goal

The *how* lives in `CLAUDE.md` (which every session reads automatically), so goal
conditions stay short and measurable. Drive the roadmap one milestone at a time.

**M0, ready to paste:**

```
/goal Milestone M0 in docs/ROADMAP-TASKS.md is complete: tasks M0.1 through M0.6 are all checked off, each implemented to its acceptance line under the rules in CLAUDE.md, one commit per task prefixed with its id, pushed to origin claude/first-project-rebuild-bjniik. Proof shown in command output: (1) cd v2 && npm run lint && npm run test && npm run build all exit 0; (2) the lint-walls test shows each of the six forbidden patterns failing ESLint; (3) git ls-files | grep DS_Store prints nothing; (4) git status is clean and git log --oneline shows the M0.x commits. Constraints: the 2021 tree (backend/, render/, utilities/, displayComponents/, index.html) is not modified except as task M0.5 specifies; no box is checked whose acceptance line was not met. Stop if blocked on a decision only the owner can make.
```

**Template for later milestones** (swap the milestone id and its proof line):

```
/goal Milestone <Mx> in docs/ROADMAP-TASKS.md is complete: every task in its section is checked off, each implemented to its acceptance line under CLAUDE.md, one id-prefixed commit per task, pushed to origin claude/first-project-rebuild-bjniik. Proof shown in command output: cd v2 && npm run lint && npm run test && npm run build all exit 0, plus each task's own acceptance check demonstrated. Constraints: the 2021 tree is untouched unless a task says otherwise; golden fixtures change only under a declared Bug-fix or Fidelity tier; no box is checked whose acceptance line was not met. Stop if blocked on an owner decision (M2.10 is one).
```

**ENDGAME PROMPT — current, 2026-08-25.** The roadmap stands at 41 of 44 with every open
question decided by the owner (see the decisions entry at the end of the roadmap Log). The
remaining work is M2.10 (full-fidelity unification, no flags), then M2.9 (heatLimit
recalibration + 150 km presets + deorbit targeting + the orbit demo), then M5.4's v1.0
tag — **in that order**: the owner ordered M2.9 after M2.10 so the orbit work lands on the
final physics. The task specs in the roadmap carry the verified implementation notes from
the 2026-08-25 dry run; read them before starting. Ready to paste:

```
/goal The Starship rebuild is finished at full fidelity: all 44 tasks in docs/ROADMAP-TASKS.md are checked off, the last three completed in the owner-ordered sequence M2.10 → M2.9 → M5.4, each to its rewritten acceptance line under CLAUDE.md, one id-prefixed commit per task (M2.9's three parts may be separate M2.9-prefixed commits, the Bug-fix part first), all pushed to origin claude/first-project-rebuild-bjniik. Proof shown in command output at the end: (1) cd v2 && npm run lint && npm run test && npm run build all exit 0, bundle budget included, and npx playwright test green; (2) grep -rn "flags" v2/src --include="*.ts" --include="*.svelte" finds no fidelity-flag machinery — the unified physics is the only physics; (3) during M2.10, before the old fixtures are deleted, the unified reentry-autoland fixture rows are shown byte-identical to the M1.9 all-flags fixture from commit 115879c, and after it the golden suite passes with exactly one fixture set; (4) the recalibrated heatLimit is justified in its commit by the margin measurement from executing the frozen legacy tree, with the failing reentry-lands test shown failing first; (5) the orbit demo test passes: Circularize preset, circular at 150 km, a full coasted lap, autopilot-timed deorbit burn, survived entry, touchdown at StarBase with the measured landing error asserted and reported honestly; (6) git status is clean, git ls-files | grep DS_Store prints nothing, and the v1.0 tag exists on the final commit and is pushed. Constraints throughout: the frozen tree at v2/tests/fixtures/legacy/ is never modified; goldens regenerate only under the declared tiers these tasks name; the parity suite is re-scoped to "v2 equals 2021 except exactly the five declared departures" — never weakened to silence, every departure pinned to its replacement formula; no box is checked whose acceptance line was not met. This goal is also met if progress becomes impossible without a new owner decision — in that case the final message states exactly what is blocked, why, and what decision is needed.
```

**Historical full-drive prompt** (superseded 2026-08-25 — kept because the Log references
it; note its "fidelity flags stay off by default" constraint is the one the owner has since
overridden):

Why per-milestone rather than one mega-goal for M0–M5: each milestone ends at a state
you should look at (M2.10 is explicitly your flying-and-choosing task), and the
evaluator judges better against one concrete proof bundle than against 44 tasks at once.

---

## Target architecture

```
Layer 4  Shell        Svelte — menus, editor, black box. Interaction-driven only.
Layer 3  Instruments  HUD binder — one rAF subscriber, diffs state, writes text nodes.
Layer 2  View         Pixi v8 — sprites, pooled particles, camera, sky. Converts
                      planet-centered state to the local frame. No game logic.
Layer 1  Core         Pure TypeScript — physics (planet-centered under flag), flight
                      control, autopilot, failures, seeded RNG streams. Zero DOM,
                      zero Pixi, zero globals, zero wall-clock. Runs in Node.
```

Fixed timestep with interpolation; time warp = run the step loop N× per frame, never
scale dt (2021 scales dt and was measured 19% slow at 33 fps). Orbit makes warp
essential: a full lap at 1× is ~87 minutes.

---

## Milestones

Task-level breakdown with acceptance lines lives in `docs/ROADMAP-TASKS.md` (44 tasks).

**M0 — Foundations locked.** Scaffold beside the untouched 2021 tree; six boundary
lints active day one; CLAUDE.md; CI with budgets.
*Accept: CI green and required · a deliberate DOM import in core/ fails the build.*

**M1 — Faithful core, behaviour locked.** Verbatim port over typed `SimState` (incl.
trig collapse + committed proof); ignition on the sim clock; seeded per-stream RNG;
fixed-timestep loop; golden trajectories for all six scenarios; then the rename pass,
proven safe by goldens.
*Accept: six scenarios bit-identical at 30/60/144 fps · sim runs in Node · rename lands green.*

**M2 — Honest physics.** Bug-tier fixes on by default (failing-test-first, six-scenario
diffs). Fidelity flags off by default: planet-centered gravity, true speed of sound,
full ISA. New presets: Circularize, Deorbit Burn.
*Accept: orbit demo passes headless — circularize at 100 km, coast one full lap, deorbit,
land at StarBase · every flag has a trajectory-diff report · defaults chosen by feel.*

**M3 — The glow-up.** Pixi v8 renderer with existing art; pooled effects (shutdown leak
dies here); bloom, heat shimmer/shock, parallax StarBase, altitude-graded sky.
*Accept: intro landing plays and looks better · zero per-frame allocations · 60 fps mid phone.*

**M4 — Full game.** Svelte panels + HUD binder; keybinds/tilt/touch; 40 inline onclicks
become typed events; scenario editor incl. orbital presets; black box lazy-loaded.
*Accept: feature parity vs 2021 checklist complete · first-load ≤ 250 kB gzip.*

**M5 — Shipped.** Service worker caches everything, no CDNs; real README; deploy; 2021
tree retires after the new build has flown every scenario.
*Accept: full playthrough in airplane mode · old tree removed · v1.0 tagged.*

---

## How we'll know nothing broke

Golden trajectories (drift fails CI) · autopilot outcome tests (results, not
intermediates) · determinism test across frame rates · proof-of-equivalence tests for
every Refactor · bundle and frame budgets in CI.

---

## Open questions & backlog

- **Sound** — biggest feel-per-effort upgrade available; one word and it becomes M4.5.
- **Shareable flights** (backlog) — determinism makes a flight = seed + scenario +
  input log; a URL replays it anywhere. Cheap after M2.
- **Fidelity defaults** — chosen in M2, stick in hand. The 2021 model stays selectable
  as reference forever.
- **The pig** — resolved. The pig stays.
