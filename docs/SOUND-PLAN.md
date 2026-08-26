# Sound — the M8 plan

Owner decision, 2026-08-25: plan it now, build it after M7.

The simulator has been silent for its entire life — 2021 and v2 alike. It is the
largest single immersion lever left, and the one thing on the backlog that has
been described as "biggest feel-per-effort upgrade available" since the original
rebuild plan was written. This document is what it would take.

---

## 1. Why silence is the wrong default here

Sound is not decoration in a vehicle simulator; it is an instrument. A pilot
knows the throttle setting, the airflow and the moment of ignition by ear before
any gauge moves. Three specific things the current build cannot tell you without
looking away from the vehicle:

- **Engine state.** Three Raptors at 40% and two at 100% produce nearly the same
  thrust number and sound nothing alike.
- **Dynamic pressure.** The onset of aerodynamic noise is the most direct
  feedback there is that the vehicle is going too fast too low — and Q is a
  number in a strip most players never expand.
- **The transition to vacuum.** Silence is the single most affecting thing about
  leaving the atmosphere, and it is impossible to convey to someone who has had
  silence the whole time.

That last one is the reason this milestone is worth doing properly rather than
adding a rumble loop: **the payoff is not the noise, it is the contrast.** M7
makes the vehicle look like it is moving; M8 makes it stop sounding like it,
exactly when the air runs out.

---

## 2. What it costs, stated up front

This is a new asset class and it touches three budgets that have been carefully
held all the way through the rebuild.

| Cost | Detail |
|---|---|
| **Assets** | The project currently ships images and fonts. Audio is new: a format decision, a licence trail per file, a subsetting/encoding step |
| **Budget** | A new line, as `--font` got in M6.1. Proposal: **≤ 250 kB total, all sources, compressed** |
| **Offline** | Everything joins the service-worker precache, and the offline playthrough e2e has to keep passing |
| **First load** | Audio must not block the first frame. Decoded lazily, after mount, never on the critical path |
| **Autoplay policy** | Browsers refuse audio before a user gesture. The intro demo plays *before* any gesture, so the sound has to arrive gracefully partway through rather than assuming it can start |
| **Mobile** | Silent switches, interruptions, and the tab going to the background |

None of these is hard. All of them are the kind of thing that turns into a bug
if it is discovered late, which is why they are on the first page.

---

## 3. The design

### 3.1 Synthesis, not samples

**Recommendation: generate the continuous sounds with the Web Audio API rather
than shipping loops.** This is the decision the whole milestone turns on, and it
goes against the obvious instinct.

The continuous sounds here — engine rumble, aerodynamic noise, RCS hiss — are
all *filtered noise with a parameter that moves*. That is three oscillator nodes
and a filter, and it has properties a sample loop cannot match:

- **It is a function of SimState**, exactly like every readout and metric in
  `hud/`. Throttle moves, the timbre moves — continuously, with no crossfade
  between a "low" loop and a "high" loop.
- **It costs no bytes.** A rumble loop long enough not to sound looped is
  hundreds of kB; a noise generator is a few lines.
- **It is testable.** The parameter curves are pure functions of state and get
  pinned at the throttle settings and dynamic pressures the seven scenarios
  actually reach — the same treatment `view/atmosphere-look.ts` got in M6.7.

Samples are still right for **transients**: ignition, shutdown, touchdown,
structural failure. Those are events, not states, and synthesising a convincing
one is a research project. Budget them at a handful of short files.

So the split is:

**Amended in build, 2026-08-26 (M8.4): the transients are synthesised too.** Not
because the reasoning below is wrong — synthesising a convincing impact really is
harder than playing one — but because shipping third-party audio into this
repository is a decision whose licence trail the owner has to be able to audit,
and choosing those files from a library whose terms could not be verified would
have satisfied this table in form and not in substance. An unverifiable licence
trail is worse than no samples. § 7's mitigation applies in reverse: the layer is
behind one interface, so real recordings can replace the synthesised ones
per-sound without touching anything else. **This is the one point in M8 where the
owner may want to substitute samples, and it is a change to
`v2/src/audio/transients.ts` and nothing else.**

| Sound | How | Driven by |
|---|---|---|
| Engine rumble | synthesis — filtered noise + low oscillators | running engines, `throttleCurrent` |
| Aerodynamic noise | synthesis — band-passed noise | `dynamicPressure`, `machSpeed` |
| RCS | synthesis — high-passed noise burst | `forces.rcsThrust` |
| Ignition, shutdown | sample | engine edges, as `effects.ts` already detects them |
| Touchdown, crash, breakup | sample | `status.landed`, `failures.*` |
| Warning tone | synthesis | heat and Q past the caution threshold |

### 3.2 The vacuum rule

Everything aerodynamic — and most of what you hear of your own engine —
attenuates with ambient pressure. `atmosphere.airPressure` is already in
SimState and M6.7 already draws with it.

The engine does not go fully silent in vacuum, because structural conduction is
real and because total silence during a burn reads as a bug rather than as
physics. The curve should fall to a floor, not to zero, and the floor is a
tuning decision to make with ears rather than a formula.

**Sound is a function of `airPressure`, and the fade to near-silence above
~50 km is the point of the entire milestone.**

### 3.3 Where it lives

A new top-level directory, because it fits none of the existing five:

```
v2/src/audio/    Web Audio graph, mixer, the SimState→sound bindings.
                 May import core/. Never imported BY core/.
```

It follows the `hud/` pattern exactly, and for the same reasons: **one
subscriber, driven from the existing rAF tick, diffed before writing.** An
`AudioParam` set to the value it already holds is a wasted call, and a
`setTargetAtTime` per parameter per frame at 120 Hz is how a Web Audio graph
starts stuttering. The parameter curves are pure functions of SimState in
`audio/params.ts`; the graph is built once at unlock and never rebuilt.

The sixth wall follows too: **`core/` may not import from `audio/`.**

### 3.4 The mute control, and the first gesture

Off is a first-class state, not an afterthought.

- A speaker toggle beside the cinematic toggle, persisted per device with the
  same guarded `localStorage` read M6.4 uses (a browser that throws on storage
  must not break the simulator).
- **Default: on, but the audio context starts suspended**, which is what the
  browser requires anyway. The first interaction resumes it. The intro demo
  therefore plays silently until the player touches something, and that is
  correct rather than a compromise — the sound arriving as you take control is
  a better moment than sound that fights the browser's autoplay policy and
  loses.
- Muting suspends the context rather than setting a gain to zero, so a muted
  simulator does no audio work at all.

---

## 4. Tasks

The task list is `docs/ROADMAP-TASKS.md` § M8.

| Task | What |
|---|---|
| M8.1 | The audio layer: graph, unlock, mute, budget, the sixth wall |
| M8.2 | Engine rumble, synthesised, as a function of throttle and engine count |
| M8.3 | Aerodynamic noise and the vacuum fade — the milestone's whole point |
| M8.4 | Transients: ignition, shutdown, touchdown, loss |
| M8.5 | Mix, warnings, mobile, offline, ship |

---

## 5. Constraints, all pre-existing

- **`core/` does not change and the seven golden digests do not move.** Sound is
  an output. If a physics value is needed and is not in SimState, the answer is
  to derive it in `audio/`, not to add it to core.
- **One subscriber, driven from the existing tick.** Diffed like every other
  binder; no framework code in the frame path.
- **Zero allocation in the frame path.** The graph is built once; per frame only
  `AudioParam` values move, and only when they changed.
- **Offline.** Every sample precached, and the full offline playthrough e2e
  stays green.
- **Budgets.** First-load JS ≤ 250 kB gzip, fonts ≤ 80 kB, and a new audio line
  at ≤ 250 kB — with audio decoded lazily so it never blocks the first frame.
- **Five Playwright projects**, and headless Chromium has no audio device. § 6.

---

## 6. Testing sound, which is the interesting problem

Headless browsers do not make noise, and no CI checks a mix. So the testable
claims have to be chosen deliberately rather than hoped for:

- **The parameter curves are pure functions** and get the same treatment as
  M6.7's look curves: pinned at the throttle settings, dynamic pressures and
  altitudes the seven scenarios reach, asserted monotonic, bounded, and — for
  the vacuum fade — reaching its floor by the altitude that matters.
- **The graph is built once.** Node count is constant over a long flight, which
  is the audio version of the M3.7 leak test that would have caught the 2021
  particle leak.
- **Writes are diffed**, counted against stubs exactly as the HUD binders are.
- **The wall is lint-enforced**: `core/` may not import `audio/`, tested by the
  same fixture mechanism as the other six walls.
- **OfflineAudioContext** renders a few seconds deterministically in a test, so
  "the engine is louder at 100% than at 40%" is an assertion about a buffer's
  RMS rather than an opinion.
- **e2e** asserts the context reaches `running` after a gesture and `suspended`
  when muted — not that anything was audible.

What no test will cover is whether it sounds good. That is a listening
decision, and the plan should say so rather than pretend otherwise.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Synthesised engines sound like a hairdryer | it is a tuning problem with a real fallback — the layer is behind one interface, so a sampled loop can replace the synth per-sound without touching anything else |
| Audio work on the frame path causes stutter | diffed writes, `setTargetAtTime` rather than per-frame ramps, node count asserted constant |
| Autoplay policy makes the intro feel broken | the intro is silent by design until the first gesture; § 3.4 |
| The budget grows one sample at a time | a stated cap, enforced in `check-budget.mjs` the way fonts were in M6.1 |
| Sound is off by default on a silent phone and looks broken | the toggle shows state, and nothing else depends on audio |
