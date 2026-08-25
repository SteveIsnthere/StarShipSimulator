# Starship Simulator

A Starship flight simulator that runs in a browser. Land it yourself, or watch the
autopilot do it.

![Starship on final approach, one Raptor lit, StarBase behind](docs/screenshot.png)

Originally written in 2021 as a first project. This is v2: the same flight model,
extracted and rebuilt around it.

---

## Playing it

It opens with the autopilot landing a Starship. When it touches down the vehicle is
yours — full tanks, engines off.

- **Fly it**: the yoke on the right pitches the nose; the slider on the left is the
  throttle; `R1`/`R2`/`R3` and `Toggle-All` light the Raptors.
- **Or don't**: `Lift-Off`, `Boost-Back`, `Att-Hold` and `Auto-Land` will do it for you.
  `Auto-Land` from any altitude is worth watching at least once.
- **Menu** → scenario presets, from a booster separation at 70 km to a landing burn at
  200 m, plus two orbital ones. Or type your own numbers into the six fields.
- **Black Box** → nine plots of the flight you just flew.
- **Keyboard**: WASD or the arrow keys, `Space` for all engines, `1`/`2`/`3` for one,
  `F` fins, `R` RCS, `T` attitude hold, `Backspace` boost-back, `=`/`-` zoom. The full
  list is in the guide, and it is generated from the binding table, so it cannot drift.

Works offline. Install it and it keeps working with the network off — the whole thing
is precached, including the chart library.

---

## What this is, really

The 2021 version worked, and it was a mess in ways that are worth naming, because
every one of them is a rule in this codebase now:

- 355 globals on `globalThis`
- physics that ran at a different speed depending on your frame rate
- `document.getElementById` inside the simulation loop
- engine ignition timed with `setTimeout`, so it fired early under time warp
- 3.5 MB of Plotly from a CDN on every page load, for charts almost nobody opened
- an About screen claiming it worked offline, while loading two CDNs

The rebuild's central bet was **extraction, not rewrite**. The flight model is the
thing worth keeping — it took a long time to tune and it feels right. So it was ported
line by line, misspellings included, then locked behind golden trajectory fixtures
before anything was allowed to change. Only then was it safe to refactor.

That order matters. A rewrite would have produced a cleaner codebase flying a subtly
different vehicle, and nobody would have been able to say which parts changed.

### The result

| | 2021 | v2 |
|---|---|---|
| Globals | 355 | 0 (lint-enforced) |
| Simulation step | frame-rate dependent | fixed 120 Hz, ~4–7 µs |
| HUD | 12 Hz, 18 `getElementById` per update | 120 Hz, zero lookups, diffed writes |
| First-load JS | ~3.5 MB, two CDNs | 183 kB gzip, no third-party origins |
| Offline | claimed | tested — a full flight with the network off |
| Tests | 0 | 991 unit, 43 end-to-end |

---

## Architecture

Dependencies point down. Only down.

```
v2/src/ui/     Svelte 5 — panels, menu, editor, black box. Interaction-driven only.
v2/src/hud/    The HUD binder. One rAF subscriber, diffs state, writes text nodes.
v2/src/view/   PixiJS v8 — sprites, pooled particles, camera, sky. No game logic.
v2/src/app/    The loop, input, the flight recorder, offline support.
v2/src/core/   Pure TypeScript simulation. The protected zone.
```

`core/` is pure: state in, state out. It runs in Node with no browser, which is what
makes any of this testable.

**Six walls**, each an autopsy of a specific 2021 failure, each an ESLint error, each
with a test that feeds it a violation and asserts it fails:

1. `core/` may not import from `view/`, `ui/`, `hud/` or `app/`.
2. `core/` may not touch `document`, `window` or PIXI.
3. `core/` may not call `Math.random` — seeded streams only, counters in state.
4. `core/` may not call `Date.now` or `performance.now` — time enters as `dt`.
5. `core/` may not call `setTimeout` or `setInterval`.
6. Nothing anywhere in `v2/` may assign to `globalThis`.

### Determinism

`step(state, dt, input)` is pure: same state, same dt, same input, identical output.
Randomness comes from a counter-based generator seeded per stream, with the counters
stored in the state, so a flight replays exactly. Time warp runs the step loop N times
per frame; it never scales `dt`, because a step must always mean the same thing.

Golden trajectory fixtures in `v2/tests/golden/` are the behavioural contract. A
refactor that moves them fails CI.

### Nothing changes physics silently

Every change to `core/` declares one tier in its commit message:

| Tier | Meaning | What it owes |
|---|---|---|
| Refactor | behaviour must not change | numerical proof over the input domain, ≤ 1 ULP, committed as a test |
| Bug fix | provably wrong today | failing test first, then the fix, then a before/after trajectory diff |
| Fidelity | more accurate, changes feel | behind a flag, off by default, both paths golden-tested |

The bug fixes so far: a pitch-rate term that was only correct at exactly 60 fps, a
heating correlation given an area where it wanted a radius, an unclamped keyboard
throttle that could command 210%, and a random-failure toggle that did nothing.

---

## Development

```bash
cd v2
npm install
npm run dev        # vite dev server
npm run lint       # eslint, including the six walls
npm run test       # vitest — 991 tests
npm run build      # svelte-check, vite build, service worker, bundle budget
npm run test:e2e   # playwright — 43 tests, needs a build
npm run test:deploy  # the same build served from a subdirectory, as Pages does
```

The build fails if first-load JS exceeds 250 kB gzip. That is deliberate: the budget is
a test, not a guideline.

### Deploying

Pushing to `main` builds, runs every gate, and publishes to GitHub Pages. Pages serves a
project site from a subdirectory rather than a domain root, which is why the build uses
vite's `base: './'` and the service worker precaches scope-relative paths — and why
`npm run test:deploy` exists to serve the real build from a subdirectory and prove it.
An absolute path anywhere in the build works perfectly on localhost and 404s in
production; that is not a bug worth finding from a user's bug report.

### Documents

- [`CLAUDE.md`](CLAUDE.md) — the constitution. Read it before changing anything.
- [`docs/REBUILD-PLAN.md`](docs/REBUILD-PLAN.md) — the plan and its reasoning.
- [`docs/ROADMAP-TASKS.md`](docs/ROADMAP-TASKS.md) — every task, and a log of what each one found.
- [`docs/PARITY.md`](docs/PARITY.md) — v2 against the 2021 feature list, line by line.
- [`docs/RENAME-MAP.md`](docs/RENAME-MAP.md) — the mechanical rename, old name to new.

---

## Credits

Built by [SteveIsnthere](https://github.com/SteveIsnthere). The pig is at x = 0 and is
not negotiable.
