# Terminal coallocation — bounded Fidelity correction

2026-10-18 UTC. Approved Phase 8 Fidelity, based on the measured descending
booster failure and [reviewed design](../descending-diagnosis/coallocation-design.md).
This correction is implemented and independently reviewed, but **before-flip
still fails the catch assertion**. C1 and whole Fidelity acceptance remain open.

The original translation override requested about 68.56 MN m of attitude
residual against 27.22 MN m of paid RCS support in the recorded constraint
witness. `red.txt` preserves that failing boundary before the correction.
The compact fixture reconstructs unrecorded environment fields; it is explicitly
not an exact historical full-state recovery or a flight.

Only fully ignited terminal translation now passes through the attitude
allocator. It intersects support at both admitted thrust endpoints, physical
gimbal and next-step slew bounds, with actual grid torque and reserve-limited
RCS. Empty intersections choose a reachable minimax residual and remain marked
infeasible. Stable normalization avoids finite-input overflow. Ordinary
alignment and actual mechanical actuator/payment laws remain unchanged; no
forecast, force, reserve, tunable, physical stop or work cap was added.

The original `booster-terminal-allocation.test.ts` was temporarily overwritten
by a mistaken Add File operation. Independent review caught the lost suite
before any changed flight. Its bytes were restored verbatim from HEAD, and all
new witnesses moved to `booster-terminal-coallocation.test.ts`. Preserve the
earlier RED and `green.*` outputs under their actual test inventory; the early
34-test green did not include the original suite and is not final acceptance.

Final focused scope, across selections: original allocation 7, command 19,
descending initialization 13, material 6, new coallocation 14 and policy
boundaries 12 pass. `green-restored.*` first records one new test setup failure:
the throttle-decrease case inadvertently retained the separate two-to-three
engine transition. Its corrected setup isolates a consistently paid cohort;
`wrapper-corrected.*` passes 26/26. The earlier selection also misspelled the
policy-boundaries filename; its actual five-file inventory is retained, and
the corrected selection exercises the intended file. Scoped lint exits 0.
All these focused tests use the ordinary SSR fallback, with no current native
qualification claimed. Truth before/after is byte-identical: 25/26, every Tier A
IN and the existing Tier B max-Q altitude limitation OUT at 9,528 m.

## Bundle and built-render verification

The first changed build typechecked but failed at 300.4/300.0 kB gzip; an earlier
test tuple typing failure is also retained. A reviewed supported esbuild minifier
trial increased the total to 308.2 kB and was removed. Vite configuration is
verbatim HEAD; budget/counting, chunking, preloads and dependencies are unchanged.

The supported size correction moves authored vehicle-material GLSL comments
into adjacent TypeScript documentation. All 1,519 non-comment tokens and every
executable line are unchanged; [proof](shader-token-proof.json) pins both streams.
Build exits 0 at **299.2/300.0 kB**. Before/after first-load source-map inventories
contain exactly the same 568 sources. No required startup source was deferred
or excluded. All font/audio budgets and entry-graph/design/copy self-tests pass.

Built Chromium smoke passes 2/2 at zero retries and one worker: actual frames
without errors and landing body structure with the same-state absence control.
The landing pixel pair was inspected; it shows the actual dark TPS-facing hull
and removes that hull when hidden. It is body-presence evidence, not reference,
plume or realism approval. Actual renderer is WebGL 2/ANGLE/Vulkan SwiftShader,
1280×720 canvas/viewport, DPR1. Before/after source/build receipts match.
No frame, cadence, physical GPU, full browser or six-current-build claim follows.

## Exactly one changed physical row

Independent HIGH readiness review preceded the single invocation, pinned by
`flight-plan.json` (801 input files). Original 900 s/108,000 ticks, 30 s case,
one worker, zero retries and the land/catch assertion remain intact. The changed
diagnostic is explanatory, not wall-time acceptance. Raw exit is **1**:
impact at **16.658333 s / 1,999 ticks**; 29 other tests were unselected.
Do not rerun this unchanged receipt.

At tick 971, before the changed allocation first acts, the recorded body state
still matches the prior source. At the actual catch-plane crossing (tick 1616),
pitch is −8.52e−7 rad and downward speed −1.65071 m/s, both within the unchanged
limits. Lateral error is **−129.25676 m**, lateral speed **+11.84070 m/s**; both
reject contact. The fixed deadline expires at 13.425 s and correctly shuts down.
The terminal event retains about 19.20 t fuel; final zero values are crash resets.
The earlier tumble is removed, but earlier lateral acquisition remains necessary.
Super Heavy landing-burn and intro regression rows pass on the changed source.
Reentry and orbital range remain separate unresolved tasks. No universal
trajectory infeasibility is established by this failed policy.

Predict before full golden replay: the eight Ship fixtures must remain bitwise
unchanged; the two Super Heavy fixtures may change only after fully ignited
terminal coallocation is reached. No golden fixture was regenerated or accepted.
Full units, matrix, goldens, coverage, mutation, phase review/gate/merge and release
remain open. Independent review and source/result hashes are retained alongside
this record. Continue with an evidence-backed earlier-acquisition design.

Post-result HIGH review recommends a generic early paid three-centre acquisition
mode based on the coupled translation/attitude envelope, before vertical-only
stopping becomes too late. Its trigger, non-upright paid force/rotation and
measured handoff need concrete design/review; nothing is implemented yet.
Free-coast prediction supplies no authority. A separate future-coast proposal
would still require paid source-matched proof before its future switch.
