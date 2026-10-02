# Phase 6b final branch release verification — 2026-10-02

Candidate: `9bb03f91f94b69dfece97359355403ec8702ab4e`, pushed before verification. Runtime and tests are byte-identical to independently reviewed `142881e203428833cf52c2b83d5578dfef1a288f`.

- Complete local gate: exit 0, 1,993 unit tests and 1,993 coverage tests, unchanged floors, smoke and subpath checks. Raw `phase6b-final-gate.log`.
- Mutation: exit 0, unmodified control 848 passes, all 21 named faults caught, no survivor or harness error. Raw `phase6b-final-mutation.log`.
- Final full browser: exit 0, 480 passes, zero failures or flaky results, 11 configured skips, five Chromium viewport projects, workers 1 and retries 0, 56.7 minutes. All ten original plume checks pass. Full raw log, HTML/data, extracted report, provenance and SHA256 manifest in `full-browser/`.
- Seven skips are optional screenshot writers without `CAPTURE_SCREENSHOT=1`. Four are the existing landscape hint checks; the complementary no-room witness passes. This is Chromium viewport evidence, not Safari or hardware-phone evidence.
- Final full run did not enable optional plume diagnostic capture: its report contains zero frozen-pair attachments. Earlier accepted focused attempt 3 preserves all 60 ordered byte-identical subject/frozen-repeat pairs and actual image review; those are not claimed as final full-run captures.
- Hosted CI 37065061174 succeeded at the candidate. Configured gate and hygiene passed; hosted full-browser and bench jobs were skipped. Raw log and exact provenance retained. Earlier doc pushes were cancelled by concurrency, not reported green. Hosted menu smoke at `menu.spec.ts:17` failed its initial visibility assertion and passed existing retry #1 (raw lines1665–1702); this remains the already deferred Phase9 menu readiness issue. Final local fullsuite has no retries.
- Fresh whole-phase independent high-depth source review has no actionable findings. Final evidence acceptance is requested separately; main gate, hosted deployment and live verification remain required.

Main/live remain `080f108`; Phase 6b is not yet checked off. Phases 7–9 remain in scope. No additional unchanged-source diagnosis or fallback feasibility campaign is needed.
