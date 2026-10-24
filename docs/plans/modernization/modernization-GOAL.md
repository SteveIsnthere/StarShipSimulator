# Modernization — active goal contract

Updated 2026-10-18 UTC (2026-10-17 Vancouver). This is the current execution
contract. [Earlier plan text](../../research/2026-10-18-modernization-remaining-audit/plans-before-update/manifest.json)
is preserved byte for byte as history. Its commands and superseded next steps
are not instructions to rerun completed work. Prior explicit approvals and
physical boundaries remain binding as summarized below and in Phase 8.

## Objective and authority

Complete only the [modernization roadmap](modernization-roadmap.md), including
Phase 8 V3 physics, progressive flight damage, reference-based rendering and
performance acceptance, followed by all Phase 9 UX work and final release.
The pause is cleared. Routine implementation, scientific diagnosis, in-scope
visual/UX decisions, coherent commits/pushes, fresh independent reviews, clean
phase merges and deployment verification are already authorized. No Jira board.
Plans, handover, reference docs and backlog are the system of record.

Steve's instruction, “it shouldnt be mac exclusive, everything should beable to
run in this env, if not fix it”, moves implementation and acceptance to the
reconciled cloud environment. Keep every original numerical budget. Record the
actual CPU, browser, renderer and viewport; software rendering and phone
emulation establish results for that configuration, not physical-handset or
hardware-GPU results. Unavailable global guidance uses Steve's “follow best
practise” direction; do not invent a skill run or waive independent review.

## Read order and startup

1. Discover workspace startup instructions; read `/workspace/AGENTS.md`, the
   checkout's `AGENTS.md` and its four checked-in skills. Run the versioned
   `task-start.sh` fallback and require reconciliation/Chromium functional
   success. Source its sibling `activate.sh` in subsequent shells. Preserve
   managed proxy/CA and strict TLS; import no personal configs/credentials.
2. Read this file first among project plans, then the
   [handover](modernization-handover.md), [Phase 8 plan](modernization-phase-8.md),
   [vehicle-realism index](../../research/2026-10-03-vehicle-realism/README.md),
   [remaining-work audit](../../research/2026-10-18-modernization-remaining-audit/README.md)
   and [completion plan](modernization-completion-plan.md).
3. Use the existing isolated checkout. Inventory branch, HEAD, dirty files and
   remote state before mutation. Do not create another worktree, reset, rebase,
   discard work, overwrite dirty files or rewrite history.

## Current verified state and first task

Eight of ten phases are merged: 1–7, including 6b. This is 80% by phase count,
not an effort estimate. Phase 8 and Phase 9 remain open. At the fresh audit,
main/latest successful Pages are `e8a06ffe3e0fc5b28f6aad0ad733e6be25917428`;
the fetched visual branch is `cd0118c0d9aeefdf2729581b9168caabb6eb75af`.
The requested `dd72908e9e5e277f63af27fbdb64d560bc9af355` is its ancestor.
Recheck remotes before later integration; these are observed pins, not a request
to check out an older revision over current work.

**C0 source-basis admission is complete via the reviewed successor route.**
Continue on `claude/visuals` from committed basis `8126077a` plus the
[source-pinned allocation delta](../../research/2026-10-18-phase8-successor/allocation/result.json).
The [successor record](../../research/2026-10-18-phase8-successor/README.md)
documents the bounded search and independent review. It does not establish
exact recovery or transfer absent acceptance. The latest
V22 source manifest has 803 paths; the pre-change committed basis matches 726, differs in
52 and lacks 25. Exact historical V22 matrix bytes and several result bundles
remain absent; the newly reconstructed 18-row successor is present and pinned. The bounded exact-content search found none of the 77 expected
later digests in its stated domain. If a newer complete snapshot becomes
available, verify its base, patch digest, applicability and every restored hash
before importing it; do not restart the search without new evidence. Apply an
applicable complete recovery exactly once only to its verified clean base. Never chain snapshots or apply a historical patch over
current implementation. The original pause and Recovery08 patches are
historical here; their valid digests do not make them applicable.

The approved fallback has been selected: preserve the gap and make fresh
reviewed changes from committed source and the approved specification.
Keep unknown bytes/results unknown; a reconstructed successor cannot inherit
absent runtime acceptance. Continue independent authorized work while a genuinely
missing access or product answer is pending. Preserve the current docs/audit
edits and checkpoint durable work with reviewed commits/pushes when possible.

Current production checkpoint is `df16fb2c59cf69883cf1440d90795b135dfc2a40`
on `claude/visuals`, after terminal coallocation `3fa8c522` and C1 WIP
`d30d23f9`. The [early-acquisition packet](../../research/2026-10-18-phase8-successor/early-acquisition/README.md)
preserves the reviewed nominal design and recorded 3 s constraints. Acquisition
source and its RED boundary test are not implemented. Next write that boundary
witness, implement only supported paid acquisition, then obtain independent
HIGH source/readiness review before one changed before-flip test. Keep one
arrival clock, real central cohorts and orientation-gated ignition; no free
coast authority or deadline reset. Reentry/orbital range remains separate.

## Remaining work and dependencies

Execute [C0–C6](modernization-completion-plan.md) as bounded work packages.
**C1 is underway; reviewed source is checkpointed as unfinished WIP.**
Constructor Refactor `f76d740c` and debug/catch `bd018042` are bounded checkpoints,
not whole-phase acceptance. Preserve newer dirty work and inspect actual HEAD.
The reviewed test-only failure deadline is frozen at `Tground + TKepler + 900 s`
for the four orbital rows; structural checks pass 4/4. This is a physical
scheduling envelope, not a theorem that current guidance meets it. The new
successor matrix contains all 18 rows. Constructor Refactor proof/existing
checks pass 53/53; four mocked sequencing/contact units are not flight evidence.
Across separate real selections, Ship/landing-burn, Super Heavy/landing-burn
and Super Heavy/intro pass; Super Heavy/before-flip and reentry fail. Reentry
also exceeds the unchanged 30 s case budget. The reviewed descending-auto-land
initializer has 25/25 direct/boundary checks; full Fidelity acceptance is open.
See [source-pinned results](../../research/2026-10-18-phase8-successor/README.md).

The single declared physical/CPU capture reproduced both impacts with all
components attached and valid hull domains beforehand. Reentry impacts about
716 km short. The independently reviewed terminal coallocation correction now prevents the
earlier tumble. Its one changed before-flip row still impacts at 16.658 s:
catch-plane pitch/downspeed pass, but lateral error −129.26 m and speed +11.84 m/s
reject contact. Next address earlier lateral/range acquisition with a reviewed
scheduling-feasibility design. [Torque evidence](../../research/2026-10-18-phase8-successor/terminal-coallocation/README.md)
retains RED, corrected checks, 299.2/300 kB build and separate 2/2 built-render smoke. CPU
profiles supported the independently reviewed [scoped root-kernel Refactor](../../research/2026-10-18-phase8-successor/root-reuse/README.md).
Original helper/getter/material prefixes remain; 43 focused tests across
selections and identical truth pass, build 299.6 kB. One changed reentry capture
retains its entire recorded trace and crash byte-for-byte. Reduced work is
proved, but observed 23.015 s versus 23.429 s is no wall-time cure. Broad CPU/
gate acceptance and the held ISA theory remain open. For booster orbital targeting, first establish one paid
scheduling/trajectory witness under unchanged caps; do not borrow Ship's fitted
entry range. The orbital deadline decision is resolved and must not be reasked.
The allocation fix closes one C3 debt. A fresh body-presence optical attempt
passed five scenes but timed out setting up catch; it provides no full realism,
plume, motion or frame acceptance. The subsequently reviewed progress getter
and 31/31 focused checks enabled a changed catch body-presence/absence assertion
pass in 18.5 s; saved shell 0 conflicts with outer tool exit 1. Retain both, the
actual SwiftShader metadata and the separate source epoch. [Exact next tasks](../../research/2026-10-18-phase8-successor/next-diagnostics.md).
Finish Phase 8 before Phase 9 implementation. Do not redo completed RTLS
scheduling feasibility, Phase 7 release or Phase 6b fallback work.

**Mission ruling — Steve, 2026-10-18 UTC:** “Keep starts and targets; approve a
physically derived orbital mission horizon.” All nine IDs × both vehicles
remain required. Preserve preset starts and Ship landing/Super Heavy tower
targets. The independent pre-flight review froze the source-derived deadline;
do not fit it to a successful flight. Actual paid preparation, burn, transit and
handoff still need witnesses within that same clock before mission acceptance.
Only orbital mission duration is newly authorized. Non-orbital 900-second
horizons, per-case wall time, physical/controller/work/health/catch limits and
every land/catch assertion remain unchanged. The ruling is not acceptance of
the missing matrix or evidence that current booster orbital guidance works.

Historical predecessor documents report a 20/30 scenario result with ten failures, narrow
natural-damage witnesses, and truth 25/26 with all 17 Tier A rows IN. Those
reports are historical until source/result correspondence is recovered. The
previous conversation also records a gate stopped at 12 unit failures; raw
gate custody is absent. Do not describe any of these as a current green gate.
Full visual/frame acceptance remains failed/open. The prior frame trace
diagnosis identified no actionable source bottleneck; the separate optical
catch setup has a reviewed removable telemetry cost, not a proven frame cause. Preserve failed evidence and select one falsifiable source hypothesis before another bounded measurement.

## Protected contracts and budgets

- Preserve the intro choreography/framing intent, scenario presets, pig at x=0,
  every 2021 capability, seven lint walls and deterministic pure TypeScript
  core. No Rust, WASM or new language runtime. Archived legacy and flight_sim
  remain read-only; the vendored UI kit is never edited here.
- Apply `physics-change-policy`: Refactor requires a numerical proof ≤1 ULP;
  Bug fix requires failing witness first and all-golden trajectory audit;
  approved V3/progressive work is Fidelity under the Phase 8 amendment. Never
  re-bless analytic truth, tune constants/bands to pass, delete truth rows or
  relabel historical hardware as V3. Label surrogate material/geometric data.
- Keep the 1,533 K equilibrium tile stop, 50 kPa and 13 g stops, original
  thermal/health/reserve/aim/landing/catch bounds, control authority, RNG,
  forecast deadlines, candidate/trial caps and mechanical-work budgets.
  Ship's shipped reserve is 18 t; changes need measurement and health tests.
- Keep the non-orbital 900 s / 108,000-step scenario horizon, 30,000 ms unit case timeout,
  existing distinct coverage timeout, zero added retries, worker contracts and
  no gated wall-clock assertions. A new product ruling must be explicit before
  any other scenario contract change. The explicit mission ruling above permits
  only a physically derived orbital horizon with starts/targets preserved.
- Preserve the paid planner's maximum four mechanical advances per scheduler
  call and existing source-publication deadlines. The approved coast-only
  determinism-test exception uses the existing 4,000-advance cap and asserts
  at most four per call; it changes no production deadline or budget.
- Preserve aggregate core coverage floors 99% branches/lines/statements and
  98% functions, physics 100% branches/lines/functions and every configured
  per-module floor. No allowance, skip, exclusion or seal change to get green.
  Renew coverage seals only after independently auditing affected closures;
  uncertainty uses full coverage.
- First-load JS ≤300 kB gzip; retain font/audio budgets. Ordered gate ≤300 s
  in the cloud acceptance environment; hosted CI ≤1,200 s. These remain open
  performance requirements, not automatically satisfied by command exit 0.
- Desktop full-session work p95 ≤16.67 ms and cadence ≥59 fps; reduced phone
  p95 ≤33.33 ms and cadence ≥29.5 fps. Keep original warmup/control contracts,
  at least 300 measured frames per scene/profile, GPU-completion accounting,
  both phone orientations and simultaneous-damage onset checks. Cosmetic
  quality may be bounded only while required visual cues and controls survive.
- Detached rigid pieces ≤12 per body/24 combined; cosmetic particles ≤4,000
  per body/8,000 combined. Physical damage cannot depend on visibility. Preserve
  mass/energy/momentum ledgers and inherited rigid-body velocity without an
  artistic physical impulse.
- Phase 6b closed under the independently confirmed approved broadside
  fallback. Body-axis/paired-fin/translational-RCS/Earth-rate models remain
  explicitly parked. Do not reopen them, claim them shipped, or use that
  fallback to waive V3, damage or later-phase requirements. The approved
  600 s reentry golden recording window remains its narrow existing contract.

## Execution and review

Product implementation is primary. Use the smallest useful failing witness
and bounded diagnosis. After at most three recorded failed diagnoses, obtain a
fresh independent high-depth review and record a new evidence-backed approach
before another cycle. Standing approval covers this without another permission
request. Never retry unchanged failures for luck or rerun consumed one-shots.
Historical launcher packets are evidence, not ready-to-run commands on a new
machine. Requalify only what the actual change/environment requires; do not
expand unrelated runner, process-census or infrastructure campaigns.

Build before tests, always; keep heavy checks serial and never install
concurrently. Focused checks while implementing, complete `npm run gate` at
phase integration, plus full five-project browser suite, truth, mutation and
required CPU/frame benches. Save raw output, exit, source pin and environment
for each required acceptance run. Compare failures by name. Do not repeatedly
run passing heavy checks without a change or unresolved failure that warrants it.

Use `code-review` at high and independent protected-surface review before each
phase merge. If unavailable, use the documented other-agent/Pro/fresh-reviewer
fallback; authentication failure is not a review. Reviewers are independent
of implementation; physics/goldens stay serial and workers never share mutable
source/dependency ownership. Fix real findings and retain dispositions. No
whole-program PR: each reviewed phase merges to main with its merge record.
Continue the existing Phase 8 `claude/visuals` lineage after reconciling the
audit/documentation branch; Phase 9 uses its own branch from accepted updated
main. A documentation checkpoint does not authorize merging unaccepted runtime.
Commit coherent checkpoints using `type(scope): outcome`, push durable work,
and preserve honest WIP history until coherent Fidelity acceptance is complete.

After each phase: promote shipped decisions into reference docs, keep skills
and backlog truthful, record the merge/deployment, tick only after acceptance,
close/delete the completed phase plan and write the next phase plan before
implementation. Ask only for genuinely missing access or a new product/scope
decision; continue independent work while awaiting the answer. Publish the
planned review pages and proceed without awaiting the owner's visual verdict.

## Completion — all conditions required

- [ ] Every roadmap phase is checked and merged, with phase merge records and
      a closing summary of the product shipped.
- [ ] On main, the full ordered `npm run gate` exits 0 within 300 s in the
      reconciled cloud acceptance environment. The last three hosted main CI
      runs are green within 20 minutes, or the existing billing exception is
      documented with its exact rejection and complete cloud gate/review.
- [ ] The live Pages URL serves the final verified React build; final smoke
      passes against it and served assets/service worker match that build.
- [ ] Every Tier A truth row is IN; retain the registry coverage of propulsion,
      both vehicles' dry/propellant mass and engine counts, planet radius,
      ascent max-Q altitude/value and reentry heating. Preserve and explain
      the existing Tier B data limitation without deleting or widening a row.
- [ ] Mutation control is green and every configured mutation, including the
      original 21 faults, is CAUGHT by a named assertion failure.
- [ ] Every scenario ID for Ship and Super Heavy lands or is caught under
      autopilot, asserted in `tests/flies-every-scenario.test.ts` under the
      explicit approved mission contract; no missing/failed row is concealed.
- [ ] Complete Phase 8 V3/damage/visual acceptance: published visual direction,
      reference comparisons, six-scene screenshot witnesses/absence controls,
      real progressive loss/disintegration, two-body/reset behavior, full and
      reduced quality, frame/cadence/onset/pool budgets and independent review.
- [ ] All Phase 9 UX/input/onboarding/objectives/HUD/Black Box/debrief/phone
      layout/accessibility requirements pass, preserving every 2021 capability.
- [ ] No `.svelte` remains; design/UI scanners and their self-tests pass.
- [ ] Reference docs describe shipped behavior and backlog names every
      deferral. Run the required repo-docs-maid check; if its global script is
      unavailable, keep that requirement open, report the missing access, and
      complete available local documentation checks without claiming it ran.
- [ ] Final launch/staging/belly-flop/landing/catch motion review is published
      and linked from roadmap closure. Owner verdict is recorded separately;
      engineering acceptance does not depend on waiting for that verdict.

Stop at this roadmap's complete conjunction. Unphased shareable flights,
licensed audio, a sixth preset and parked physics are outside this run.
