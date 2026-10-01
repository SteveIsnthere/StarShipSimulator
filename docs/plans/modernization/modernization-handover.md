# Modernization — handover

The unattended run's report. Updated as phases land; the last section is always current.

## Status at a glance

| phase | state | merged |
|---|---|---|
| 1 Green gate and cut-over | done, live | `f14aadb` (2026-10-01) |
| 2 Truth harness | done | `53e3c26` |
| 3 Design pass | done (review page published) | `53e3c26` |
| 4 React shell | in progress on `claude/react-shell` | — |
| 5 Guidance on real physics | not started | — |
| 6 Ship realism | not started | — |
| 7 Super Heavy | not started | — |
| 8 UX to flight_sim level | not started | — |

## Shipped

- **The rebuild is live** at https://steveisnthere.github.io/StarShipSimulator/ in place of the 2021 game. Returning visitors' 2021 service worker is retired by a kill switch; the 2021 game is tag `v0-classic`, and branch `classic` is the one-command rollback (`docs/reference/architecture.md`).
- **A gate that is green on your Mac and in hosted CI.** Before: 48 of 1,585 unit tests red on arm64, CI green 2 of 132 runs. Now: `npm run gate` about 3 minutes locally, CI about 8 minutes, green on every push since.
- **A truth harness.** Cited reference bands with a ratchet (`npm run truth:report`), property invariants over every configurable flight, a mutation matrix the suite must turn red (`npm run mutation`, 9 of 9 caught), a debug surface and a browser witness with a positive control.
- **Two real physics bugs fixed**, both found by the new tests: the tank went negative on the emptying step, and the flight editor accepted negative propellant (a vehicle lighter than its own structure).
- **The design pass**: `docs/design/ux-critique.md`, `design-system.md`, `ia.md`, and the review page below.

## For you to look at

- **The prototype review page** (private): https://claude.ai/artifact/9rAusShWLCkpoHMhoVy5TR — today's interface against the proposed one, surface by surface. Your verdict feeds Phase 4/8 as a scope change.

## Decided on your behalf

- **Pages cut-over executed** as part of Phase 1 (it was in the plan), after an independent review that drove the migration and rollback in a real browser.
- **Goldens**: a measured tolerance (1e-8) off the recording platform, exact on it.
- **Fonts**: Inter / Inter Tight / JetBrains Mono, subset to 52 kB, replacing Barlow.
- **Kit reuse**: flight_sim's `web/src/ui` vendored byte for byte, type-checked under its own settings; nothing in flight_sim changed.
- **Layers pause the flight**, Escape closes the top layer, P pauses (from the IA).

## Parked — yours to decide

- **No LICENSE** in a public repo. Choose one before this grows further.
- **Two dead remote branches**, `origin/exp` and `origin/feat/modernize-app`: nothing in either is worth keeping. Delete when you agree.
- **Codex can't run as a peer reviewer**: `~/.codex/config.toml` names `gpt-6.1-sol`, which a ChatGPT login does not support. ChatGPT Pro and fresh subagents reviewed instead.

## Blocker

None.
