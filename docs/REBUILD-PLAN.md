# Starship Rebuild Plan

**Roadmap v2.** Fidelity approach approved; conventions and physics policy folded in;
orbital mechanics promoted to a core-architecture item. No application code written yet.

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
| Ignition delay double-divides by `timeAccel` and runs on wall-clock `setTimeout` | Bug | Engines light 16× faster at 4× warp; breaks pause and determinism → becomes dt-ticked timer in SimState |
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
