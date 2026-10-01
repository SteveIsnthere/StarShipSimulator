---
name: verification-and-gates
description: Use before claiming any change works, before committing, before merging, and whenever a check fails or CI is red — which commands make up the gate, the order they must run in, what each one proves, the coverage floors, what hosted CI does and does not cover, and the rules for reading a gate honestly. Owns how this repo is verified. The tiers a physics change owes are `physics-change-policy`; the merge rule itself is the global `git-conventions`.
---

# Verification and gates

How the harness is built is explained in [docs/reference/testing.md](../../../docs/reference/testing.md). This file is what to run and how to read it.

## The gate

All commands run in the repo root.

| step | command | proves |
|---|---|---|
| lint | `npm run lint` | ESLint, including the seven walls (`sim-core-conventions`) |
| build | `npm run build` | `svelte-check`, the Vite build, the service worker, and the bundle/font/audio budgets |
| unit | `npm run test` | Vitest: core, goldens, proofs, HUD, view, UI, audio, offline |
| coverage | `npm run coverage` | the per-module floors on `src/core/**` in `vitest.config.ts` |
| browser smoke | `npm run test:e2e` | the `@smoke` Playwright specs on desktop Chromium: the app boots, flies, lands, works offline |
| deploy shape | `npm run test:deploy` | the build works under the GitHub Pages subpath |

`npm run gate` runs all six in that order. Off the gate, on demand:

- `npm run test:e2e:full` — every spec on all five projects (desktop plus four phone viewports). Run it before a release or after UI work.
- `npm run bench` — the wall-clock budgets (`*.timing.test.ts`), on an idle machine.

First run on a machine: `npx playwright install chromium` (prefix `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem` if Node rejects the certificate chain).

**Build before test, always.** `tests/offline.test.ts` asserts on the shipped output, so `dist/` is its fixture. In the other order, it fails on ENOENT on a clean checkout.

While iterating, run the narrowest thing that covers the change (`npx vitest run tests/core/<file>`); run the full gate once before merging.

## Coverage floors

`npm run coverage` exits non-zero below the floors, so they cannot regress: aggregate 99% branches/lines/statements and 98% functions over `src/core/**`; `src/core/physics/**` at 100% branches, lines and functions; control and autopilot at their own floors in `vitest.config.ts`. Never lower a floor to get green. A floor moves up when the measured number does.

## Reading a gate honestly

- **Never read a gate through a pipe.** `| tail` hides the exit code. Read the exit status.
- **Compare failing test sets by name, not pass counts.** "Same number failing" can hide a new failure behind a fixed one.
- **A green log line from your own container is not evidence for anyone else.** Hosted CI and the owner's machine are. Say which environment a result came from.
- **No wall-clock assertions in gated tests.** Count steps or work instead. A timing assertion is flaky under load and turns the gate red for no reason.
- **A skipped test needs an assertion that it is skipped for the stated reason.** A skip nothing asserts is indistinguishable from a test that stopped running.
- **Never weaken a tolerance or delete an assertion to make a gate pass.** Find the cause.

## Hosted CI

`.github/workflows/ci.yml` runs `npm run gate` on every push, on the `.nvmrc` Node, in ≤ 20 minutes. Its manual `e2e-full` job (workflow dispatch) runs the full browser suite and the bench. `deploy.yml` runs the same gate and publishes `dist` to GitHub Pages on pushes to `main`.

If hosted CI cannot start because of billing or spending limits, record the exact message and rely on the complete local gate (Steve's standing rule).

## Parallel agents

Each agent runs from its own worktree with its own `node_modules`; sharing one has corrupted runs. Two browser runs at once need different ports: `E2E_PORT` (default 4174) and `E2E_SUBPATH_PORT` (default 4188). Servers are never reused, so a run never tests someone else's build.
