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
| browser | `npm run test:e2e` | Playwright, five projects (desktop chromium plus four phone viewports) |
| deploy shape | `npm run test:deploy` | the build works under the GitHub Pages subpath |

`npm run gate` runs lint, build, test, coverage and test:e2e in that order. It does not run `test:deploy`.

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

`.github/workflows/ci.yml` runs on every push to every branch, in the repo root, on Node 22: lint, build with the budget, unit, coverage, the desktop chromium Playwright project, and the subpath deploy check. It does not run the four phone projects, so `@mobile`-only specs run in no CI job. `deploy.yml` publishes `dist` to GitHub Pages on pushes to `main`.

## Parallel agents

The Playwright web server uses a fixed port and `reuseExistingServer`, and agents sharing one worktree's `node_modules` have corrupted each other's runs. Run browser checks from your own worktree, one at a time.
