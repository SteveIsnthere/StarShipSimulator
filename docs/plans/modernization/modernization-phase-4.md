# Phase 4 — React shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The UI shell is React 19 + Tailwind 4 on flight_sim's vendored kit, built straight into the structure Phase 3 designed, with no Svelte left and the framework-free layers (core, view, HUD binder, audio, loop) unchanged.

**Architecture:** First pull everything `App.svelte` orchestrates — loop, view, audio, recorder, timeline, input, preferences, flight start and restart — into a framework-free session controller with a small Zustand store for the state the UI renders, while the Svelte UI still runs on it and the gate stays green. Then build the React shell on that controller surface by surface, following `docs/design/ia.md` and `docs/design/design-system.md`, keeping every `data-testid` so the e2e suite carries over. The per-frame path stays outside React: the HUD binder writes text nodes React rendered once, exactly as it writes Svelte's today.

**Tech Stack:** React 19, react-dom, @vitejs/plugin-react 6 (Vite 8), Tailwind CSS 4 + @tailwindcss/vite, Zustand 5, Radix dialog / popover / select, clsx, tailwind-merge, lucide-react, GSAP (off the boot path), jsdom + @testing-library/react for component tests.

**Spec:** [modernization-roadmap.md](modernization-roadmap.md) Phase 4; [docs/design/design-system.md](../../design/design-system.md); [docs/design/ia.md](../../design/ia.md); [docs/design/ux-critique.md](../../design/ux-critique.md); the review page linked from `ia.md`.

## Global Constraints

- flight_sim is read-only. The kit is copied from `/Users/stevewang/dev/flight_sim/web/src/ui/` at a named commit; never edit flight_sim.
- No change to `src/core/`; the goldens do not move.
- First-load JS stays ≤ 300 kB gzip (`scripts/check-budget.mjs`; re-baselined from 250 for React DOM, see Execution log). GSAP, the black box's charts and the menu's heavier tabs load lazily.
- Every `data-testid` in `src/ui/testids.ts` keeps its meaning; labels may change. `tests/e2e/parity.spec.ts` (capability parity) stays green with updated labels.
- No framework code on the per-frame path; zero allocation per frame; the HUD binder owns per-frame DOM writes.
- Files ≤ 500 lines; one Zustand slice per concern; no rendering, input or side effects inside a store.

## Review Focus

- A phone in portrait with the engine sheet open: the primary flight strip stays visible (an e2e asserts its bounding box is not covered).
- Escape with the menu open, then again: the first closes the menu and resumes the flight, the second opens nothing (an e2e asserts the sim clock does not advance while the menu is open).
- A first-load bundle that silently grows past the budget because the kit's barrel pulls GSAP or Radix into the entry chunk (the entry-graph check fails the build).
- A player with reduced motion on: no animation plays, every state is reachable.
- Keyboard-only: every control reachable in a sensible order, focus visible on the live scene (the dashed focus owner).

---

### Task 1: Toolchain

**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `src/ui/index.css`

- [ ] Add, pinned exactly: react, react-dom 19; @vitejs/plugin-react 6; tailwindcss 4 + @tailwindcss/vite; zustand 5; @radix-ui/react-dialog, react-popover, react-select (flight_sim's versions); clsx, tailwind-merge, lucide-react, gsap; dev: jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, @types/react, @types/react-dom.
- [ ] Svelte and React plugins both active while the port runs. `tsconfig` gains `"jsx": "react-jsx"`; the walls keep `react` and `react-dom` out of `core/` (add them to wall 1's patterns, with a lint-walls fixture).
- [ ] `npm run build` green; record the first-load size in the commit body.

### Task 2: Vendor the kit

**Files:** create `src/ui/kit/` (copied), `src/ui/kit/PROVENANCE.md`, `scripts/kit-drift.mjs`; modify `package.json` (`"kit:drift"`), `vitest.config.ts`

- [ ] Copy flight_sim's `web/src/ui/` except `BrickField/` (the Flying Bricks loading field is their brand) into `src/ui/kit/`, with its co-located tests. Rewrite `@ui/` imports to relative ones.
- [ ] `PROVENANCE.md`: the flight_sim commit (`git -C ~/dev/flight_sim log -1 --format=%H -- web/src/ui`), what was excluded and why, and the rule: kit files are not edited here; a change goes to flight_sim first and is re-synced.
- [ ] `scripts/kit-drift.mjs`: when `../flight_sim/web/src/ui` exists, list files that differ from the vendored copy (ignoring the import rewrite) and exit 0; it reports, it never fails.
- [ ] The kit's tests run in Vitest under jsdom (`// @vitest-environment jsdom` per file, or a `environmentMatchGlobs` entry for `src/ui/**`), and pass.

### Task 3: The session controller

**Files:** create `src/app/session.ts`, `src/app/session-store.ts`, `tests/app/session.test.ts`; modify `src/ui/App.svelte`

- [ ] Move out of `App.svelte` into `createSession({ canvas, host })`: loop creation and the rAF frame, `onStep` (camera, recorder, watch, timeline), view creation, audio, input binding, preferences, `startFlight`, `restart`, pause, time setting, camera mode, cinematic, the debug surface wiring. It returns commands and a Zustand store (`session-store.ts`) holding only what the UI renders: scenario, phase, menu/black-box/debrief open, paused, debrief card, hint state, preferences.
- [ ] `App.svelte` becomes a thin view over the session; the full gate stays green on Svelte. This is the commit that proves the controller is complete.
- [ ] Unit tests drive the session headless with a fake canvas/view where needed: start a scenario, pause, restart, the store reflects each.

### Task 4: The React shell, surface by surface

**Files:** create under `src/ui/shell/` (one folder per surface: `StatusBar/`, `PrimaryCluster/`, `EngineGroup/`, `FlightGroup/`, `Menu/` (with `FlyTab`, `SetupTab`, `SettingsTab`, `AboutTab`), `BlackBox/`, `Debrief/`, `FirstFlight/`, `TrajectoryCard/`, `PhoneLayout/`); `src/main.tsx`

- [ ] Each surface follows `ia.md` and `design-system.md`, uses kit primitives (Button, Toggle, SliderRow, NumberField, TabStrip, Dialog, KeyCap, InputLegend, Surface, MetricStrip, LabeledValue), keeps its `data-testid`s, and has a component test.
- [ ] The HUD binder resolves the React-rendered elements by test id once at mount, as today.
- [ ] Menu and black box are kit `Dialog`s: focus trapped and returned, Escape closes the top layer, the session pauses while open.
- [ ] The flight-setup tab validates each field against its range and shows the unit as a suffix.
- [ ] Phone portrait: the primary strip sits above a single sheet; a test asserts no sheet overlaps it.
- [ ] Switch `index.html` to `src/main.tsx` when every surface exists; run the full e2e suite (all five projects) and update spec selectors that relied on Svelte DOM structure rather than test ids.

### Task 5: Svelte out

- [ ] Delete `src/ui/*.svelte`, `svelte.config.js`, the Svelte deps and ESLint plugin; `svelte-check` in `build` becomes `tsc --noEmit -p tsconfig.json`. No `.svelte` file remains.

### Task 6: The design scanners

**Files:** `scripts/check-design-contract.mjs` + `scripts/lib/designContract/{rules,selfTest}.mjs`, `scripts/check-ui-contract.mjs` + `lib/uiContract/{rules,selfTest}.mjs`, `scripts/check-frontend-boundaries.mjs`, `scripts/check-entry-graph.mjs`; modify `package.json` `build`

- [ ] Adapt flight_sim's scanners (read them there; copy the rules engine and self-test, not the migration and ownership machinery): design contract (no grey ramps, radius, shadow, blur, local focus, opacity grading, raw colours in components); UI contract with Starship copy rules (no `TOGGLE-ALL`, `DUMPFUEL`, `R1`-style labels in rendered text); frontend boundaries (the kit imports only react, clsx, tailwind-merge, lucide-react, radix, gsap); entry graph (GSAP, uPlot and the black box are never in the boot chunks). Each runs its self-test first and is chained into `npm run build`.

### Task 7: Conventions and close

- [ ] Write `.agents/skills/frontend-conventions/SKILL.md` with `establish-conventions`, modelled on flight_sim's (layer map `shell/` → `kit/`, component folders, Zustand discipline, 500-line ceiling, the per-frame rule, "the sim core is the source of truth"); add it to `AGENTS.md`'s skills table; update `AGENTS.md`'s repo map (`src/ui` is React now), `docs/reference/presentation.md`.
- [ ] Full gate green; `npm run test:e2e:full` green on all five projects; `/code-review high`; merge to `main`; verify the deploy; tick Phase 4; write the Phase 5 plan.
