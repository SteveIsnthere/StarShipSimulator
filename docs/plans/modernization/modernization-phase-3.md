# Phase 3 — Design pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decide how every surface of the simulator looks and is organised before any of it is rebuilt in React, written down as a design system and an information architecture, and shown to Steve as rendered prototypes.

**Architecture:** Three documents under `docs/design/` (the design system, the information architecture, the UX critique of the current build), and static prototypes built from flight_sim's actual tokens and primitives so they are a preview of Phase 4, not a drawing of it. The prototypes are published as one private review page; the run continues into Phase 4 without waiting (GOAL: "Phase 3 publishes, then proceeds").

**Tech Stack:** Markdown; React 19 + Tailwind 4 prototypes in a throwaway Vite page under `design/prototypes/` (not shipped, not in the gate); Playwright for screenshots; the Artifact tool for the review page.

**Spec:** [modernization-roadmap.md](modernization-roadmap.md) Phase 3; the UX audit in [docs/research/2026-09-30-modernization-audit.md](../../research/2026-09-30-modernization-audit.md) § UX; flight_sim's `docs/design/design-system.md` and `docs/design/ui-quality-checklist.md` (read-only).

## Global Constraints

- flight_sim is read-only. Copy its tokens and primitives into the prototype page; never edit flight_sim.
- Visual language: flight_sim's — monochrome chrome, 0 px radii, Inter / Inter Tight / JetBrains Mono, one dashed focus owner, motion tiers, translucent black backing only for in-flight chrome — with a Starship brand layer in place of the Flying Bricks tail mark, brick loading field and copy rules.
- The world (sky, plume, earth, stars) keeps its colour; only chrome is monochrome. Caution / alarm / good keep fixed semantic roles.
- Every 2021 control keeps a working equivalent (capability parity). Layout, labels and keys may change.
- Density by pointer type, never by viewport width: 32 px targets for a fine pointer, 44 px for coarse or gamepad.
- No product code changes in this phase. `src/` is untouched.

## Review Focus

- A phone in portrait while throttling: speed, altitude and vertical speed must stay visible with the engine controls open.
- A first-time player who has never seen a Starship flight: the first screen must say what to press and why, in words that match the on-screen labels.
- A landing at night or in re-entry plasma: HUD text must keep 4.5:1 against the actual scene behind its backing, not a flat colour.
- Keyboard-only and gamepad-only play: every control reachable, Escape closes the top layer first, the sim pauses under a menu.
- A colour-blind player: caution / alarm / good never carried by hue alone.

---

### Task 1: The UX critique

**Files:**
- Create: `docs/design/ux-critique.md`

- [ ] **Step 1:** Run the current build (`npm run build && npm run preview`) and walk every surface at 1280×720, 1024×768 and 390×844 in the browser: first load and the intro, the first-flight hint, the HUD during a landing burn, a re-entry, the engine and yoke panels, the menu (scenarios, flight editor, time warp, settings, about, guide), the black box, the debrief, cinematic mode, the trajectory map. Screenshot each into `docs/design/screenshots/critique/`.
- [ ] **Step 2:** Write the critique as an Apple-level reviewer would: per surface, what the player is trying to do there, what gets in the way, and the one change that matters most. Start from the audit's measured defects (Escape, focus trap, pause, first-flight copy, phone top bar, engine sheet occluding flight data, Black Box radians and ±π spikes, flat hierarchy, developer labels R1/R2/R3, TOGGLE-ALL, DUMPFUEL, FS 200 M/S) and add what the walk finds.
- [ ] **Step 3:** Commit: `docs(design): what is wrong with the interface today, surface by surface`.

### Task 2: The design system

**Files:**
- Create: `docs/design/design-system.md`

- [ ] **Step 1:** Use flight_sim's `docs/design/design-system.md` as the structure: character, non-negotiables, tokens, type, geometry and density, motion tiers, live-scene chrome, loading, responsive, ownership. Carry its rules over where they hold for a space flight simulator, and say where Starship departs and why.
- [ ] **Step 2:** The Starship brand layer: a wordmark (text-based, Inter Tight, no SpaceX logo or imitation of it), the loading moment (real progress only — no fake percentages), and the copy vocabulary (flight words a player understands: "Engines", "Throttle", "Land", not "TOGGLE-ALL" or "DUMPFUEL"). State that the product is an unofficial fan simulator.
- [ ] **Step 3:** The in-flight HUD rules: what is primary (altitude, speed, vertical speed, propellant, throttle and engine state, attitude), what is secondary, what appears only when relevant (re-entry heating, max-Q, landing cues); tapes or readouts for each; units and their switching; the engines-off state; the translucent backing and its contrast rule against the live scene.
- [ ] **Step 4:** Commit: `docs(design): the Starship design system, on flight_sim's foundation`.

### Task 3: The information architecture

**Files:**
- Create: `docs/design/ia.md`

- [ ] **Step 1:** Every surface and how a player reaches it: the HUD; the controls (engines, throttle, attitude, autopilot modes, utilities) and their grouping by how often they are used; the menu as tabs (Fly — scenarios; Flight setup — the editor with validated fields and units; Settings — sound, controls, display; About); the black box; the debrief with a grade and comparison to the previous attempt; the guided first flight and per-scenario objectives; the phone layout.
- [ ] **Step 2:** The input model: the new keymap (pause, Escape closes the top layer, no Control or Backspace bindings), rebinding, gamepad mapping, the on-screen key legend, what the sim does while a layer is open (pauses).
- [ ] **Step 3:** Map every 2021 control to its new home, as a table, so capability parity is visibly kept.
- [ ] **Step 4:** Commit: `docs(design): where everything lives, and how a player gets there`.

### Task 4: Prototypes and the review page

**Files:**
- Create: `design/prototypes/` (a standalone Vite + React + Tailwind 4 page; its own `package.json`; excluded from the app build, lint and gate)

- [ ] **Step 1:** Copy flight_sim's `web/src/ui/tokens.css`, `styles/` and the primitives the prototypes need into `design/prototypes/src/kit/`, with a note naming the flight_sim commit. This is a throwaway copy; Phase 4 vendors the kit properly.
- [ ] **Step 2:** Build static prototypes over a captured frame of the real game (from Task 1's screenshots) for: the HUD in a landing burn (desktop and phone portrait), the menu (each tab), the flight editor, the first-flight guide, the debrief, the black box. Mock data, no simulation.
- [ ] **Step 3:** Screenshot each at 1280×720 and 390×844 with Playwright into `docs/design/screenshots/prototypes/`.
- [ ] **Step 4:** Publish one private review page (Artifact tool, after loading `artifact-design`) showing current against proposed for each surface, with the critique's point beside each. Link it from `docs/design/ia.md`.
- [ ] **Step 5:** Commit: `docs(design): prototypes of every surface, and a page to review them`. Tick Phase 3 in the roadmap and continue to Phase 4.
