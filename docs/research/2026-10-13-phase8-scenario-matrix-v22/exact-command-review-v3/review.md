# V22 independent exact-command readiness recheck v3

**Disposition: HIGH_READINESS_ONLY for the reviewed exact command.** This is a static readiness finding, not invocation authority. Execution remains on HOLD because the separate scenario-start/mission contract decision is unresolved.

## Scope

I independently rechecked the corrected V22 packet at `docs/research/2026-10-13-phase8-scenario-matrix-v22/flight-audit-packet`, including its current README, `command.txt`, sidecar, rebound `run-once.sh`, runner, route/static preflight records, source/runtime manifests, cache and coverage snapshots, and the current source/config inputs. I did not run the command, preflight programs, npm, Node runner, test, build, browser, or simulation workload, and did not modify any candidate or packet input. The prepared preflight records say the ordered standalone build passed before the active cache rebaseline and that the scenario packet workload has not run; I did not repeat the build.

## Corrected packet and command binding

The corrected packet README is 1,378 bytes, SHA-256 `c43431e946bded47bd6f05694336e1fc70dca86b23d49b801edefb1aec89aeaa`; it now accurately says the selected file has **30 test cases, including all 18 required scenario × vehicle rows**. The test source has nine scenario IDs: nine definite-outcome cases, 18 matrix cases, one separate re-entry case, and two intro cases. The previous README wording issue is closed in these current bytes.

The current `packet-pins.sha256` is 4,825 bytes, SHA-256 `a2b2cabbc843790223b8843ffdf157adf1930eb42d389ae4c24f750d40457b3c`. All 27 unique regular-file rows independently match. The wrapper is 4,010 bytes, SHA-256 `7e91d20355559b5e74b4c81606e1629ee422668478e419e0715dbe55dd2c0bfe`; its embedded expected sidecar digest matches the current sidecar exactly. The wrapper separately receives this review’s direct hash because the sidecar cannot self-pin the wrapper while the wrapper embeds the sidecar digest. The command is pinned separately and selects only the intended packet wrapper route. The packet sidecar’s file paths, including their ancestors, are regular non-symlink paths.

## Independent live input and runtime checks

The active source manifest contains 803 unique rows totaling 18,375,495 bytes; every file hash matches, and its path list has the same 803 entries. Runtime-content pins contain 34,983 rows totaling 1,953,878,291 bytes; every file hash matches. I independently rebuilt the runtime lstat manifest: all 38,096 rows match the pinned manifest, including types, modes, ownership, links, sizes, and symlink targets. Runtime symlinks resolve within the pinned roots and outside generated `.vite` and `.vite-temp` cache trees.

The live `.vite` tree matches the active post-build snapshot at 8 metadata rows, and `.vite-temp` matches at 1 row; both saved active baselines also match. The prior pre-build cache snapshot remains separately retained and packet-pinned. The live coverage tree matches the four-row metadata baseline and all three coverage content pins. The repository remains on branch `claude/visuals`, HEAD `8b8a8e30ec692cc16f91e6bfdec1db2c93456671`.

Managed runtime identities match the packet records: Node v22.23.3 at the pinned managed path and hash, npm 10.9.9 with the pinned CLI path and hash, and `/usr/bin/cp` with its pinned hash. The project `.npmrc` is absent. The unchanged default native qualification and sidecar match their pins and retain `productionAcceptance:false`.

## Environment, route, and limits

The exact route remains `functions.exec_command(login=false, tty=false)`, source the managed `activate.sh`, change to `/workspace/StarShipSimulator`, then source `run-once.sh`. The recorded clean non-login shell boundary is `hBc` with the expected `BASHOPTS`, `BASH_ENV`/`ENV` unset, xtrace and alias expansion off, and zero inherited traps, functions, or aliases. The wrapper preserves only approved proxy/CA variables, clears other exported variables and loader, Node, npm, Vitest, and native-route controls, sets fixed managed runtime/browser/cache paths, verifies the embedded packet-sidecar digest and every sidecar row, then execs the managed Node runner.

The runner verifies the source, runtime, cache, coverage, qualification, route, and packet state before claiming the one-shot marker. The stale default native qualification is rejected and the preserved route uses ordinary SSR Vitest selection; no native-flight acceptance is inferred. The selected invocation is one test file with one worker, the existing 30,000 ms per-test timeout, zero retries, no coverage, the 900-second / 108,000-step scenario horizon, and a 300,000 ms owned-command deadline. Output, HOME/TMP/XDG, npm configs, cache, and logs are isolated under the new attempt output. The runner uses a process owner with bounded output capture and cleanup, verifies process closure before restoring caches, and performs post-run source/runtime/cache/coverage checks. An external hard kill can interrupt receipt/recovery; retain recovery snapshots and follow the documented manual-recovery process if that occurs.

The one-shot marker and `actual-v1` output path are absent. No test, browser, or simulation acceptance is claimed.

## Decision boundary

The packet mechanics are ready for the exact reviewed command, but the workload is **not eligible to run**. The current V22 README states that the unresolved scenario-start/mission contract decision gates any scenario workload; the broader scenario/vehicle support-contract review remains HOLD. The narrow Ship/RTLS arming correction and this HIGH readiness review do not resolve that product decision. This review grants no invocation authority and makes no flight, performance, or Phase 8 acceptance claim.

The full packet rows, direct review inputs, live manifest identities, runtime/cache/coverage counts, output absence, and this report hash are recorded in `pins.json`.
