# Starship Simulator

A Starship flight simulator that runs in a browser. Land it yourself, or watch the
autopilot do it.

![Starship on final approach, one Raptor lit, StarBase behind, a cloud deck overhead and the trajectory map showing the descent](docs/screenshot.png)

Originally written in 2021 as a first project. This is v2: the same flight model,
extracted and rebuilt around it.

It works on a phone, and not by shrinking: the dials become digits and ticks, the
event timeline collapses to what just happened and what is next, and the flight
controls become bottom sheets with real touch targets.

<img src="docs/screenshot-phone.png" alt="The same landing on a phone: digits and ticks instead of dials, the timeline as one line of text, the controls as a tab bar" width="300">

### It looks like altitude

The camera opens up as you climb — 200 m of world at the pad, a kilometre by
20 km — and three layers move at three rates beneath it: the ground at true
scale, a cloud deck at 2.5 km, and a compressed-perspective earth that keeps the
world on screen the whole way instead of losing it at a hundred metres. Above
the air, velocity streaks carry the speed the world no longer can.

A trajectory map in the corner draws the profile you have flown and the
touchdown you are heading for — or says `NO SOLUTION — ORBIT` when there isn't
one. The ring on the ship is the flight-path marker: where the vehicle is
actually going, as against where its nose points. On a re-entry those differ by
ninety degrees.

<p>
<img src="docs/depth-1km.png" alt="One kilometre up: the ship large in frame, terrain below" width="270">
<img src="docs/depth-20km.png" alt="Twenty kilometres up: the ship smaller, the earth a band beneath a pale sky" width="270">
<img src="docs/depth-100km.png" alt="A hundred kilometres up: stars, and the earth below" width="270">
</p>

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

## The interface

It is built on the design language of a SpaceX launch webcast, which is a very
particular thing: the world fills the frame and the data annotates it from the
edges, legibility comes from one gradient rising off the bottom rather than from
boxes drawn around things, and the entire palette is white at four opacities.
Colour appears only where it means something — amber approaching a limit, red
past it.

The parts that carry it:

- **Dial-and-digit gauges.** The arc gives rate of change at a glance, the numeral
  inside gives the value, and the scale auto-ranges so an arc three quarters full
  means something at 200 m/s and at 8 km/s alike.
- **State is physical.** Engines are dots that light — and go red individually when
  one fails. Propellant is a bar that drains. Nothing says "on" by turning a word
  green.
- **A mission timeline**, derived from the simulation and never scripted: LIFTOFF,
  MAX-Q, MECO, ENTRY, FLIP, LANDING BURN, TOUCHDOWN. Fly badly and the events
  simply do not light, which is the honest thing for a game you can freestyle.
- **Cinematic mode** hides the flight controls, leaving exactly the broadcast. It is
  the one deliberate departure: a webcast never shows a button because the viewer
  cannot press anything, and this is a cockpit.

Every number on screen still goes through a single `requestAnimationFrame`
subscriber that diffs before it writes. The gauges and the timeline are attributes
rather than text, so they are diffed as integers — a still gauge costs nothing.

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
| First-load JS | ~3.5 MB, two CDNs | 194 kB gzip, no third-party origins |
| Offline | claimed | tested — a full flight with the network off |
| Interface | one desktop layout | three breakpoints, gated on four phone viewports |
| Depth | ground, then nothing above 100 m | three parallax layers, camera FOV 1x–5x with altitude |
| Tests | 0 | 1347 unit, 266 end-to-end across five browser projects |

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

The 2021 build is still in the repository, at `v2/tests/fixtures/legacy/`. It is retired
— not built, not served — but the parity tests **execute** it in a Node VM and compare
v2's simulation against it value for value. It is the evidence the port is faithful, and
the only thing that records what the original actually did.

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

The fidelity flags — planet-centered gravity, speed of sound from local temperature,
the full ISA table, and the collapsed trig ladders — are all off by default, because
CLAUDE.md lists the tuned feel of the 2021 model under what must never change. The last
of those is a good illustration of why the tiers are worth having: collapsing seven
quadrant ladders to seven one-line identities is provably the same mathematics, to within
one ULP over four million sampled angles, and it *still* moves a golden fixture, because
a third of those angles differ in the final bit and the simulation is a feedback loop. A
proof of mathematical identity is not a proof of bit-identity.

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
- [`docs/BROADCAST-UI-PLAN.md`](docs/BROADCAST-UI-PLAN.md) — the interface: what was studied,
  what was taken, and the one thing deliberately not copied.
- [`docs/DEPTH-AND-SPEED-PLAN.md`](docs/DEPTH-AND-SPEED-PLAN.md) — why a 356 m viewport makes
  orbital speed look like standing still, and the trajectory map that answers it.
- [`docs/SOUND-PLAN.md`](docs/SOUND-PLAN.md) — the silence, and what it would take to end it.

---

## Credits

Built by [SteveIsnthere](https://github.com/SteveIsnthere). The pig is at x = 0 and is
not negotiable.
