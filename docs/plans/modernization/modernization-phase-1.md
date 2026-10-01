# Phase 1 — Green gate and cut-over Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** A gate that is green on Steve's arm64 Mac and in hosted CI, with the app at the repo root, landed on `main` and served by GitHub Pages in place of the 2021 game.

**Architecture:** Promote `v2/` to the root in a pure-rename commit. Replace bit-exact golden comparison with a measured per-field tolerance, plus a bit-exact fingerprint that runs only on the platform that recorded the fixtures. Remove wall-clock assertions from the gated suites. Split Playwright into a fast `@smoke` tier for the merge gate and a full tier on demand. Then switch Pages to the Actions source, ship a kill-switch for the 2021 service worker, and merge to `main`.

**Tech Stack:** Node 22, Vite 8, Vitest 4, Playwright 1.62, GitHub Actions, GitHub Pages.

**Spec:** [modernization-roadmap.md](modernization-roadmap.md), Phase 1; evidence in [docs/research/2026-09-30-modernization-audit.md](../../research/2026-09-30-modernization-audit.md).

## Global Constraints

- Work on `claude/modernization`. Nothing reaches `main` before Task 9.
- Physics does not change in this phase. No file under `src/core/` changes behaviour; no golden fixture under `tests/golden/fixtures/` is regenerated.
- Never lower a coverage floor, delete an assertion without replacing what it proved, or widen a tolerance beyond what Task 3 measures.
- The light gate (Task 6) runs in ≤ 5 minutes on Steve's Mac; hosted CI finishes in ≤ 20 minutes.
- Read gate results by exit code, never through a pipe (`verification-and-gates`).

## Review Focus

- A clean clone on arm64 macOS with Node 22 or 25: `npm ci && npm run gate` must exit 0 with no extra setup beyond `npx playwright install chromium`.
- A real physics change of 1e-6 relative in one constant must still fail the golden replay after the tolerance change (Task 3 pins this with a test).
- Two agents running the browser tier at once in two worktrees must not cross-wire (Task 5 pins this with a dynamic port).
- A returning visitor with the 2021 service worker installed gets the new app on the next online visit (Task 8 pins this).
- If the Pages deploy fails after the merge, the live site can be put back on the 2021 build in one command (Task 9 records and dry-runs it).

---

### Task 1: Promote `v2/` to the repo root

**Files:**
- Move: every tracked path under `v2/` → the root (`git mv`)
- Modify: `.gitignore` (merge with `v2/.gitignore` if one exists), `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `tests/e2e/screenshot.spec.ts`, `README.md`, `AGENTS.md`, `.agents/skills/*/SKILL.md`, `docs/reference/*.md`

- [x] **Step 1: Pure rename commit.** Move everything, nothing else in the commit:

```bash
git ls-files v2 | sed 's#^v2/##' | xargs -n1 dirname | sort -u | xargs mkdir -p
for p in $(git ls-tree --name-only HEAD v2/); do git mv "$p" "${p#v2/}"; done
git commit -m "chore: the app moves from v2/ to the repo root"
git show --stat -M HEAD | grep -v '=>' | grep -c '|'   # expect 0: every line is a rename
```

If a name collides with a root file (`README.md`, `.gitignore`), keep the root one and merge the other's content into it in Step 2.

- [x] **Step 2: Fix every path in a second commit.**

```bash
git grep -n -e 'v2/' -e "working-directory: v2" -e "'../../../docs" -e 'v2/package-lock' -- ':!tests/fixtures/legacy'
```

Change each hit: drop `defaults.run.working-directory: v2` and `cache-dependency-path: v2/...` in both workflows; `path: v2/...` artifact paths become root paths; `../../../docs/` in `tests/e2e/screenshot.spec.ts` becomes `../../docs/design/screenshots/`; README image paths become `docs/design/screenshots/...`; `AGENTS.md`, the three skills and `docs/reference/*` drop the `v2/` prefix. Code comments that name `docs/<file>.png` point at `docs/design/screenshots/<file>.png`.

- [x] **Step 3: Verify and commit.**

Run: `npm ci && npm run lint && npm run build` — expected exit 0 (tests are still red on arm64 until Task 3).
Run: `git grep -n 'v2/' -- ':!tests/fixtures/legacy' ':!docs/research'` — expected: no output.

```bash
git commit -am "chore: every path follows the app to the root"
```

### Task 2: Pin the toolchain

**Files:**
- Create: `.nvmrc`
- Modify: `package.json`

- [x] **Step 1:** `.nvmrc` contains `22`. `package.json` gains `"engines": { "node": ">=22" }`.
- [x] **Step 2:** `npm audit --omit=dev` must report 0 vulnerabilities; run `npm audit fix` for the dev-only `brace-expansion` advisory only if it does not change a major version. If it would, leave it and note it in the commit body.
- [x] **Step 3:** `tests/golden/regenerate.ts` and `tests/diffs/*` are run with `npx vite-node`, which is in neither `package.json` nor the lockfile. Add `vite-node` as a pinned devDependency (or switch those scripts to `vitest`'s own runner) and add `"golden:regenerate"` to `package.json` scripts; update `physics-change-policy` to name that script.
- [x] **Step 4:** Commit: `chore: the Node version and the golden tooling are written down`.

### Task 3: Goldens that hold across machines without going blind

**Files:**
- Create: `tests/golden/compare.ts`, `tests/golden/compare.test.ts`, `tests/golden/fingerprint.test.ts`
- Modify: `tests/golden/replay.test.ts`

**Interfaces:**
- Produces: `export function relDiff(got: unknown, want: unknown): number` and `export const GOLDEN_REL_TOL: number` in `tests/golden/compare.ts`.

- [x] **Step 1: Measure before choosing.** Write a throwaway script (scratchpad, not committed) that replays every golden spec exactly as `replay.test.ts` does and records, per field, the max of `relDiff(got, want)` over every sample. Run it on Steve's Mac under the pinned Node. Record the overall max and the worst five fields in the commit body.

```ts
// tests/golden/compare.ts
/** Relative difference, robust at zero and for non-finite sentinels. */
export function relDiff(got: unknown, want: unknown): number {
  if (Object.is(got, want)) return 0;
  if (typeof got !== 'number' || typeof want !== 'number') return Infinity;
  if (!Number.isFinite(got) || !Number.isFinite(want)) return Infinity;
  const scale = Math.max(Math.abs(got), Math.abs(want), 1e-300);
  return Math.abs(got - want) / scale;
}
```

- [x] **Step 2: Decide by the measurement.**
  - If the max relative divergence is ≤ 1e-9: set `GOLDEN_REL_TOL` to 100× the measured max, rounded up to a power of ten, and never above 1e-8.
  - If it is larger (chaotic growth, or an autopilot branch flipped): do NOT raise the tolerance. Stop and record the scenario, step and field in `docs/plans/modernization/modernization-phase-1.md` under a new "Findings" heading, then compare those scenarios by sampled envelope instead: the same outcome, touchdown within 0.5 m/s and 1 m, and every sample before the first divergence within `GOLDEN_REL_TOL`. Write that rule into `compare.ts` with the measurement in its doc comment.

- [x] **Step 3: The sensitivity test, which must fail before Step 4 and pass after it.**

```ts
// tests/golden/compare.test.ts
import { describe, expect, it } from 'vitest';
import { relDiff, GOLDEN_REL_TOL } from './compare';

describe('the golden tolerance stays far below a real physics change', () => {
  it('a 1e-6 relative change in one value is outside it', () => {
    expect(relDiff(1.000001, 1)).toBeGreaterThan(GOLDEN_REL_TOL * 100);
  });
  it('identical values and identical sentinels compare equal', () => {
    expect(relDiff(Infinity, Infinity)).toBe(0);
    expect(relDiff(Number.NaN, Number.NaN)).toBe(0);
    expect(relDiff(0, 0)).toBe(0);
  });
  it('a sentinel never matches a number', () => {
    expect(relDiff(Infinity, 1e308)).toBe(Infinity);
  });
});
```

Also add one end-to-end check in `replay.test.ts`: replay `landing-burn-autoland` with `dryMass` scaled by `1 + 1e-6` (through the scenario's initial state, not by editing `core/`) and assert that the comparison reports a mismatch.

- [x] **Step 4:** In `expectSampleMatches`, replace `Object.is(got, want)` with `relDiff(got, want) <= GOLDEN_REL_TOL`, keeping the message format and adding the measured difference to it.

- [x] **Step 5: Bit-exact where it is meaningful.** `tests/golden/fingerprint.test.ts` folds the final state of each golden run with FNV-1a over `flattenState` (keys sorted, numbers via `Float64Array` bytes) and compares against a committed `tests/golden/fixtures/fingerprints.json`. It runs only when `process.platform === 'linux' && process.arch === 'x64' && process.versions.node.startsWith('22.')`. Otherwise it registers `it.skip` with that exact reason, and a second test asserts the skip condition, so a skip that stops being deliberate is caught. Generate `fingerprints.json` in hosted CI (download it from the run's artifact) — never on the Mac.

- [x] **Step 6: Collapse the batching variants.** The 1/2/4/8 and ragged variants cover the loop's batching, not the physics. Replace the five per-scenario variants with one test that runs `intro-demo` for 600 steps through each batching and asserts all of them are `Object.is`-identical to each other on the same machine. Delete the per-scenario copies.

- [x] **Step 7:** `npm run test` on the Mac: 0 failures. Commit: `test(golden): compare within a measured tolerance, and fingerprint bit-exact on the recording platform`.

### Task 4: No wall clock in the gated suites

**Files:**
- Modify: `tests/view/perf.test.ts`, `tests/budget.test.ts` (read it first), `package.json`
- Create: `scripts/bench.mjs` or `tests/bench/*.bench.ts`

- [x] **Step 1:** List every gated test that asserts on `performance.now`, `Date.now` or a timing ratio: `git grep -n -e 'performance.now' -e 'medianRatio' -e 'Date.now' -- tests`.
- [x] **Step 2:** For each, keep the work-count assertion (`sixteen.totalSteps / one.totalSteps ≈ 16`, pool usage, allocation counts) and move the timing assertion into a Vitest bench file run by a new `npm run bench`, which is not part of `gate`.
- [x] **Step 3:** `npm run coverage` passes under load: run it twice back to back while `npm run build` runs in another shell. Both exit 0.
- [x] **Step 4:** Find why coverage once died on `ENOENT coverage/.tmp`: run `npm run coverage` from a clean tree (`rm -rf coverage`) twice. If it reproduces, fix the cause (a `reportsDirectory` cleaned mid-run, or two runs sharing the directory) — do not just pre-create the directory.
- [x] **Step 5:** Commit: `test: timings move to a bench, the gate counts work`.

### Task 5: A browser tier that fits a merge gate

**Files:**
- Modify: `playwright.config.ts`, `package.json`, the specs tagged in Step 2, `tests/e2e/broadcast.spec.ts`, `tests/e2e/plume.spec.ts`, `tests/e2e/sound.spec.ts`

- [x] **Step 1: Port and browser.** Replace `const PORT = 4174` with `const PORT = Number(process.env.E2E_PORT ?? 4174)` and set `reuseExistingServer: false`. `preinstalledChromium()` also checks the macOS layout (`chrome-mac/Chromium.app/Contents/MacOS/Chromium`) and otherwise returns `undefined` so Playwright uses its own install. `playwright.subpath.config.ts` has its own copy of the lookup (taking the first revision rather than the highest): move one implementation into `tests/e2e/chromium.ts` and import it from both configs. Document `npx playwright install chromium` in `docs/reference/testing.md`.
- [x] **Step 2: The smoke tier.** Tag `@smoke` on the specs that prove the app is usable: it boots and the intro lands; each scenario starts from the menu; the menu opens and closes; a manual throttle-up lifts off; the offline reload works; the Black Box opens. Target ≤ 3 minutes on the chromium project.
- [x] **Step 3: Scripts.** `test:e2e` runs `--grep @smoke --project=chromium`; `test:e2e:full` runs all five projects. `gate` stays lint → build → test → coverage → test:e2e and gains `test:deploy`.
- [x] **Step 4: The three specs CI saw fail.** Run each in isolation 5 times on the Mac: `broadcast.spec.ts:96` (mission clock), `plume.spec.ts:273/299` (@mobile, "no plume at all"), `sound.spec.ts:216` (restore defaults). For each: if it fails on an idle machine, it is a defect — write the failing reason in the commit and fix the product. If it fails only under load, change its waits to the simulation's clock (`window` debug hooks the specs already use) instead of wall-clock timeouts.
- [x] **Step 5:** `npm run test:e2e` ≤ 3 min and green; `npm run test:e2e:full` green on the Mac with its measured time written in `docs/reference/testing.md`. Commit: `test(e2e): a smoke tier for the gate, the full suite on demand`.

### Task 6: CI that finishes and means something

**Files:**
- Modify: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

- [x] **Step 1:** Bump `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages` to their current major versions (check each repo's releases with `gh release list -R actions/<name> -L 1`). `node-version-file: .nvmrc`.
- [x] **Step 2:** `ci.yml` runs `npm run gate` (which now includes the smoke tier and `test:deploy`) with `timeout-minutes: 20`. Add a `workflow_dispatch`-only job `e2e-full` that runs `npm run test:e2e:full` with `timeout-minutes: 90`. No schedule.
- [x] **Step 3:** `deploy.yml` runs the same `npm run gate` before upload. Rewrite the long historical comments in both workflows as one or two lines of current fact each.
- [x] **Step 4:** Push `claude/modernization`. CI must be green on three consecutive pushes. If hosted CI cannot start because of billing or spending limits, record the exact message and continue on the complete local gate (Steve's standing rule).
- [x] **Step 5:** Commit: `ci: one gate, in twenty minutes, on the current actions`.

### Task 7: Docs follow the new truth

**Files:**
- Modify: `AGENTS.md`, `.agents/skills/verification-and-gates/SKILL.md`, `docs/reference/testing.md`, `docs/reference/architecture.md`, `README.md`

- [x] **Step 1:** Every statement about the gate, goldens, the e2e tiers, CI, ports and the repo layout matches what Tasks 1–6 built. Remove "the goldens reproduce only on x86-64 Linux" and "CI has passed 2 of 132" from `docs/reference/testing.md`, replacing them with the current behaviour.
- [x] **Step 2:** README: test counts are not stated as numbers (they go stale); the quick-start says `npm ci && npx playwright install chromium && npm run dev`.
- [x] **Step 3:** `bash ~/.agent-config/skills/repo-docs-maid/scripts/check.sh` exits 0. Commit: `docs: the gate as it now is`.

### Task 8: Retire the 2021 service worker

**Files:**
- Create: `public/serviceworker.js`, `tests/offline-classic.test.ts`

- [x] **Step 1: The failing test.** `tests/offline-classic.test.ts` reads `dist/serviceworker.js` after a build and asserts it: calls `self.registration.unregister()`, deletes every cache, and calls `client.navigate(client.url)` for each window client; and that the precache list in `dist/sw.js` does not include `serviceworker.js`.
- [x] **Step 2: The kill switch.** 2021 registered `serviceworker.js` at the default scope `/StarShipSimulator/`. Its update check fetches that same URL, so a file there replaces it:

```js
// public/serviceworker.js — replaces the 2021 worker for returning visitors.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
```

  Exclude it from the precache list in `scripts/build-sw.mjs` (next to the existing `sw.js` exclusion).
- [x] **Step 3:** `npm run build && npm run test` green. Commit: `feat(offline): returning 2021 visitors are handed to the new app`.

### Task 9: Cut over

**Files:**
- Modify: `AGENTS.md` (the integration-branch note), `docs/plans/modernization/modernization-roadmap.md`

- [x] **Step 1: Keep a way back.** Tag the untouched 2021 tree, and build a `classic` branch Pages can be pointed back at. A rollback must also release visitors who already have the NEW worker (`sw.js`, cache-first), or they stay on the new build: so `classic` is the 2021 tree plus one commit adding an `sw.js` kill switch (deletes `starship-*` caches only, unregisters, reloads each page — the mirror image of `public/serviceworker.js`).

```bash
git tag -a v0-classic 51ac6a0 -m "The 2021 game, as served until the rebuild cut-over"
git push origin v0-classic
git worktree add ../StarShipSimulator-classic -b classic 51ac6a0
# add sw.js (kill switch for the new worker), commit, push origin classic
```

  Preflight before Step 3: `gh api repos/SteveIsnthere/StarShipSimulator/pages` must succeed and `gh auth status` must show the `repo` scope (owner token); otherwise stop and record the blocker.

  Write the rollback into `docs/reference/architecture.md` under "Deploy":
  `gh api -X PUT repos/SteveIsnthere/StarShipSimulator/pages -f build_type=legacy -f 'source[branch]=classic' -f 'source[path]=/'`

- [x] **Step 2: Review.** `/code-review high` on `main...claude/modernization`, then `cross-agent-review` (this is the live site). Fix what is real.
- [x] **Step 3: Switch the source, then merge.**

```bash
gh api -X PUT repos/SteveIsnthere/StarShipSimulator/pages -f build_type=workflow
git checkout main && git pull --ff-only
git merge --no-ff claude/modernization -m "Merge claude/modernization: the rebuild replaces the 2021 game"
git push origin main
```

  Pages keeps serving the last legacy deployment until `deploy.yml` publishes, so there is no blank window.
- [x] **Step 4: Verify live.** Watch the Deploy run to completion (`gh run watch`), confirm it deployed the merge commit, then:
  - `curl -fsS https://steveisnthere.github.io/StarShipSimulator/` → 200 and the body contains `data-testid="world-canvas"` or the new app's root script (not the 2021 `backend/` scripts).
  - `curl -fsS -o /dev/null` on `.../manifest.webmanifest`, `.../sw.js` and `.../serviceworker.js` → 200.
  - `E2E_BASE_URL=https://steveisnthere.github.io/StarShipSimulator/ npm run test:deploy` → the four subpath specs pass against the live site (assert a non-zero test count in the output).
  - If any of these fail and cannot be fixed forward within the hour, run the rollback from Step 1 and record why.
- [x] **Step 5:** Commit: `test: timings move to a bench, the gate counts work`.

### Task 5: A browser tier that fits a merge gate

**Files:**
- Modify: `playwright.config.ts`, `package.json`, the specs tagged in Step 2, `tests/e2e/broadcast.spec.ts`, `tests/e2e/plume.spec.ts`, `tests/e2e/sound.spec.ts`

- [x] **Step 1: Port and browser.** Replace `const PORT = 4174` with `const PORT = Number(process.env.E2E_PORT ?? 4174)` and set `reuseExistingServer: false`. `preinstalledChromium()` also checks the macOS layout (`chrome-mac/Chromium.app/Contents/MacOS/Chromium`) and otherwise returns `undefined` so Playwright uses its own install. `playwright.subpath.config.ts` has its own copy of the lookup (taking the first revision rather than the highest): move one implementation into `tests/e2e/chromium.ts` and import it from both configs. Document `npx playwright install chromium` in `docs/reference/testing.md`.
- [x] **Step 2: The smoke tier.** Tag `@smoke` on the specs that prove the app is usable: it boots and the intro lands; each scenario starts from the menu; the menu opens and closes; a manual throttle-up lifts off; the offline reload works; the Black Box opens. Target ≤ 3 minutes on the chromium project.
- [x] **Step 3: Scripts.** `test:e2e` runs `--grep @smoke --project=chromium`; `test:e2e:full` runs all five projects. `gate` stays lint → build → test → coverage → test:e2e and gains `test:deploy`.
- [x] **Step 4: The three specs CI saw fail.** Run each in isolation 5 times on the Mac: `broadcast.spec.ts:96` (mission clock), `plume.spec.ts:273/299` (@mobile, "no plume at all"), `sound.spec.ts:216` (restore defaults). For each: if it fails on an idle machine, it is a defect — write the failing reason in the commit and fix the product. If it fails only under load, change its waits to the simulation's clock (`window` debug hooks the specs already use) instead of wall-clock timeouts.
- [x] **Step 5:** `npm run test:e2e` ≤ 3 min and green; `npm run test:e2e:full` green on the Mac with its measured time written in `docs/reference/testing.md`. Commit: `test(e2e): a smoke tier for the gate, the full suite on demand`.

### Task 6: CI that finishes and means something

**Files:**
- Modify: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

- [x] **Step 1:** Bump `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages` to their current major versions (check each repo's releases with `gh release list -R actions/<name> -L 1`). `node-version-file: .nvmrc`.
- [x] **Step 2:** `ci.yml` runs `npm run gate` (which now includes the smoke tier and `test:deploy`) with `timeout-minutes: 20`. Add a `workflow_dispatch`-only job `e2e-full` that runs `npm run test:e2e:full` with `timeout-minutes: 90`. No schedule.
- [x] **Step 3:** `deploy.yml` runs the same `npm run gate` before upload. Rewrite the long historical comments in both workflows as one or two lines of current fact each.
- [x] **Step 4:** Push `claude/modernization`. CI must be green on three consecutive pushes. If hosted CI cannot start because of billing or spending limits, record the exact message and continue on the complete local gate (Steve's standing rule).
- [x] **Step 5:** Commit: `ci: one gate, in twenty minutes, on the current actions`.

### Task 7: Docs follow the new truth

**Files:**
- Modify: `AGENTS.md`, `.agents/skills/verification-and-gates/SKILL.md`, `docs/reference/testing.md`, `docs/reference/architecture.md`, `README.md`

- [x] **Step 1:** Every statement about the gate, goldens, the e2e tiers, CI, ports and the repo layout matches what Tasks 1–6 built. Remove "the goldens reproduce only on x86-64 Linux" and "CI has passed 2 of 132" from `docs/reference/testing.md`, replacing them with the current behaviour.
- [x] **Step 2:** README: test counts are not stated as numbers (they go stale); the quick-start says `npm ci && npx playwright install chromium && npm run dev`.
- [x] **Step 3:** `bash ~/.agent-config/skills/repo-docs-maid/scripts/check.sh` exits 0. Commit: `docs: the gate as it now is`.

### Task 8: Retire the 2021 service worker

**Files:**
- Create: `public/serviceworker.js`, `tests/offline-classic.test.ts`

- [x] **Step 1: The failing test.** `tests/offline-classic.test.ts` reads `dist/serviceworker.js` after a build and asserts it: calls `self.registration.unregister()`, deletes every cache, and calls `client.navigate(client.url)` for each window client; and that the precache list in `dist/sw.js` does not include `serviceworker.js`.
- [x] **Step 2: The kill switch.** 2021 registered `serviceworker.js` at the default scope `/StarShipSimulator/`. Its update check fetches that same URL, so a file there replaces it:

```js
// public/serviceworker.js — replaces the 2021 worker for returning visitors.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
```

  Exclude it from the precache list in `scripts/build-sw.mjs` (next to the existing `sw.js` exclusion).
- [x] **Step 3:** `npm run build && npm run test` green. Commit: `feat(offline): returning 2021 visitors are handed to the new app`.

### Task 9: Cut over

**Files:**
- Modify: `AGENTS.md` (the integration-branch note), `docs/plans/modernization/modernization-roadmap.md`

- [x] **Step 1: Keep a way back.** Tag the untouched 2021 tree, and build a `classic` branch Pages can be pointed back at. A rollback must also release visitors who already have the NEW worker (`sw.js`, cache-first), or they stay on the new build: so `classic` is the 2021 tree plus one commit adding an `sw.js` kill switch (deletes `starship-*` caches only, unregisters, reloads each page — the mirror image of `public/serviceworker.js`).

```bash
git tag -a v0-classic 51ac6a0 -m "The 2021 game, as served until the rebuild cut-over"
git push origin v0-classic
git worktree add ../StarShipSimulator-classic -b classic 51ac6a0
# add sw.js (kill switch for the new worker), commit, push origin classic
```

  Preflight before Step 3: `gh api repos/SteveIsnthere/StarShipSimulator/pages` must succeed and `gh auth status` must show the `repo` scope (owner token); otherwise stop and record the blocker.

  Write the rollback into `docs/reference/architecture.md` under "Deploy":
  `gh api -X PUT repos/SteveIsnthere/StarShipSimulator/pages -f build_type=legacy -f 'source[branch]=classic' -f 'source[path]=/'`

- [x] **Step 2: Review.** `/code-review high` on `main...claude/modernization`, then `cross-agent-review` (this is the live site). Fix what is real.
- [x] **Step 3: Switch the source, then merge.**

```bash
gh api -X PUT repos/SteveIsnthere/StarShipSimulator/pages -f build_type=workflow
git checkout main && git pull --ff-only
git merge --no-ff claude/modernization -m "Merge claude/modernization: the rebuild replaces the 2021 game"
git push origin main
```

  Pages keeps serving the last legacy deployment until `deploy.yml` publishes, so there is no blank window.
- [x] **Step 4: Verify live.** Watch the Deploy run to completion (`gh run watch`). Then:
  - `curl -sI https://steveisnthere.github.io/StarShipSimulator/` → 200; the body contains the new app's root element.
  - `curl -sI https://steveisnthere.github.io/StarShipSimulator/manifest.webmanifest` and `.../sw.js` and `.../serviceworker.js` → 200.
  - Run the smoke tier against the live URL with the subpath config (`E2E_BASE_URL=https://steveisnthere.github.io/StarShipSimulator/ npx playwright test --config playwright.subpath.config.ts --grep @smoke`; add `E2E_BASE_URL` support to that config if missing).
  - If any of these fail and cannot be fixed forward within the hour, run the rollback from Step 1 and record why.
- [x] **Step 5:** `AGENTS.md`: remove the integration-branch paragraph; `main` is the base, branches come from `main`. Tick Phase 1 in the roadmap. Commit on `main` via a short branch and merge, per `git-conventions`.

## Execution log — decisions and findings

Recorded by the run that executed this phase (2026-10-01), for whoever reads the plan next.

- **Task 1:** the move was done per top-level entry of `v2/` (`git mv v2/<entry> <entry>`), not with the loop above, which the plan review showed nests `src/src/`. Verified: 302 renames, 0 insertions, 0 deletions; lint, build and the unit suite unchanged.
- **Task 3:** measured max relative divergence on arm64 macOS / Node 25.8.1 was 2.03e-11, so the measured-tolerance branch applied (`GOLDEN_REL_TOL = 1e-8`) and the envelope fallback was never needed. The separate fingerprint fixture was dropped: on x86-64 Linux / Node 22 the tolerance is 0, which is the same bit-exact check without a second fixture. The sensitivity test perturbs propellant mass and checks only `kinematics.*`, so it proves propagation, not the perturbed input.
- **Task 4:** wall-clock tests moved to `*.timing.test.ts` (`npm run bench`); the coverage ENOENT did not reproduce from a clean tree.
- **Task 5:** see the commit for the three CI failures; none was a product regression: `sound.spec.ts:216` was a stale spec, `plume.spec.ts:299` is load-sensitive, `broadcast.spec.ts:96` passed. The subpath spec had never run and needed its canvas locator fixed.
- **Task 8:** both service workers now delete only their own caches — the Pages origin is shared.

**Plan review (ChatGPT Pro, 2026-10-01; Codex unavailable: its configured model is not supported with a ChatGPT login).** Accepted and applied: the move loop; the shared-origin cache deletion; the rollback needing a kill switch for the new worker; the live check using GET and the real deploy spec; the sensitivity test excluding the perturbed input; the >100x assertion that could not pass at the 1e-8 cap; credential preflight for the Pages API; bug-fix precedence in Phase 2 (GOAL now says so); bounded diagnosis of flaky specs (GOAL now says so); completion evidence for realism coverage and landings (GOAL now says so). Rejected: moving the debug API into Phase 1 — the three failing specs were fixed with existing interfaces, so nothing in Phase 1 needed it.
- **Task 9:** independent review by a fresh subagent (Codex unavailable) drove the migration and the rollback in a real Chromium; both worked, and its five fixable findings were fixed before the merge (`bd909a4`). Pages switched to `build_type=workflow` with the 2021 site still serving, then `main` merged (`f14aadb`); Deploy run 36835200006 succeeded; the live site serves the new build, and the subpath deploy specs pass against the live URL (5/5). The local subpath flake was Python's `http.server`, now replaced.
