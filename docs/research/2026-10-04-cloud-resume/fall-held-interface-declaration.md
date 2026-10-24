# Cycle 2 attempt 3: held-force interface hypothesis

2026-10-04 UTC. Research preparation only; no production, test-suite or runtime
configuration edits and no prototype proof/timing runs yet. The parent currently
owns CPU for build/lint and one declared desktop CDP trace. Those must finish and
the parent must explicitly grant CPU ownership before proofs or measurement.

The [fresh compiler assessment](fall-cloud-independent-compiler-assessment.md)
accepts investigation of the surviving integrator-to-force-kernel call boundary,
not a proved performance gain. The research prototype is
`fall-held-interface-prototype.ts.txt`, outside production imports. It copies the
retained ISA/aero/control/composition/gravity expressions and midpoint algorithm.
It separates the original damage-area branch into `heldControlArea`, uses a
five-argument `heldForce(h,vx,vy,context,scratch)` boundary, and snapshots the
original invocation's stable state/model/pitch/mass/area/wind/work references
into a fixed-shape, caller-owned context. A per-invocation `finally` clears its
added source and external-work pointers to null (their factory defaults),
including exception and no-budget paths, to avoid prolonging
external source lifetimes. Original burn/work scratch exception side effects
remain. The added model pointer also resets to `SHIP` so external custom model
graphs are not retained; original work/burn model and control metadata remain
untouched. Both gust arguments are provably zero
in this held continuation, so only those unused dispatch branches disappear.
Live/gust force evaluation remains untouched.

Every original sine/cosine/atan2, ISA query, aerodynamic expression, dynamic
validation, zero-control preparation and gravity subtract/add order remains.
Both midpoint force queries and all 4,000 capped iterations remain. Thrust
preparation is not revived: composition reads actual caller-mutated scratch
gimbal, hull pitch and fixed/gimballed thrust on each original query. No geometry
memo, trigonometric identity, approximation, force skip or threshold change.
The numeric interface is a compiler hypothesis with no claimed speedup, and
particularly no guarantee of the required approximately 48.61% capped saving.

## Review and proof before measurement

Fresh independent reviewer `rtls_review` must inspect the declaration and exact
prototype before execution. Explicit review questions include invocation snapshot
semantics, source lifetime in the new context, caller-owned scratch retention,
exception-side effects, shared module control scratch, and whether the split can
credibly affect the observed boundary. Correct source-lifetime/side-effect issues
in research before testing; a smaller signature alone is not acceptance.

The review's retention correction is implemented: `context.held` is nullable
and starts at null; a type assertion is used only while the captured invocation
is active. Every exported advance, including done/no-budget and thrown queries,
clears both added pointers in `finally`. No original work/source field is cleared
there, and the added model pointer resets to `SHIP`. The original synchronous
thrown-query retention remains an explicit proof.

Prepared execution uses `run-fall-held-interface.sh proof` and, only after proof
and fresh review approval, `run-fall-held-interface.sh measure`. Both require
`STARSHIP_CPU_SLOT_GRANTED=fall-held-interface`; measure additionally requires
`STARSHIP_CANDIDATE_REVIEW_APPROVED=cycle2-attempt3`. Separate atomic receipt
directories refuse repeats. The runner materializes unique temporary siblings
from the `.txt` templates, records their exact hashes/paths, and removes only
those temporary files. It pins all source/tests/scripts, root package/config,
`.nvmrc`, candidate harness and declared Vitest CLI before and after. Measurement
requires exact equality with the green proof's source manifest. A scoped temporary
Vitest configuration selects only the declared proofs or three original timing
workloads and one worker; it leaves the checked-in configuration untouched.
No candidate timing is executed by the proof phase.
The proof runner performs the ordered production build first, retains its full
log/exit code, and fails closed before materializing/running tests on any build
failure. Candidate sources remain research-only temporary siblings; the original
source is pinned before the build and again after the proof phase.

The first executable proof harness must compare the research candidate against
both the frozen original scalar midpoint oracle in
`tests/proofs/fixtures/unpowered-fall-original.ts` and the unchanged retained
production continuation, never against only a rewritten candidate reference.
Require exact equality (including signed zero through `Object.is`) rather than
a widened tolerance. Retain all existing dense component/angle proofs separately.
The original frozen helper's default scratch does not cover caller mutation;
use the unchanged retained production path as the independent checkpoint oracle
for that additional domain and compare complete force scratch/continuation fields.

Two research test templates preserve all assertions from the original preparation
and continuation suites, substituting only candidate scratch/API imports and
adjusting fixture paths. The proof run also executes those unchanged original
suites and the dense scalar/component proof. A separate boundary template adds
complete original work/scratch comparison, 257 dense pitch values per model,
edge/adjacent/signed-zero cases, mutable thrust inputs, prepared exception paths,
exact force-query counts and interleaved mutation positive controls. No rewritten
oracle becomes the sole comparator.

Proof inputs include all 18 frozen held-control fixtures; Ship/booster,
normal/capped/windy/nonzero controls, hot/unavailable/detached/invalid roots and
invalid temperatures; null damage and invalid mass; dense pitch and quadrant
edges, adjacent representable values, signed zeros and extreme finite angles;
nonfinite incidence/forcing and finite-q force-scale overflow; modified inventory
length and missing controls. Compare error class/message and observable scratch/
work side effects when exceptions occur. Every source is checked unchanged.

Compare full/sliced/interleaved work with budgets 1, 37, 512 and 4,000, plus
fractional, zero, negative, NaN and infinite budgets. Verify actual query count
two per used midpoint iteration, zero when done/no budget, exactly 8,000 on
the cap, and identical charged work. Interleave different Ship/booster jobs
through one scratch. Change scratch gimbal, pitch and thrust between slices,
including nonfinite/conditional fixed-thrust values; positive controls must show
the stimulus affects original output so equality is not vacuous. Compare
air/acc/input scratch fields as well as result and all original work fields.
Use the canonical unchanged physical helpers; do not re-record goldens or alter
the frozen numerical oracle to obtain a pass.

## Single candidate measurement and accounting

Only after every exact proof passes and fresh reviewer design approval is clean
may the parent grant exclusive idle CPU ownership for one unprofiled candidate
measurement. This uses original burn 200 warm/2,000 measured calls with 0.2 ms
bound, normal fall 20/200 with 1 ms, capped fall 5/50 with 2 ms; preserve original
inputs and both reached/capped assertions. Production remains untouched. Source/
harness/package/config pins and full output/exit must be recorded before/after.
No comparison by rerunning the unchanged baseline: its existing red receipt is
preserved. If both representations are traced, trace output is diagnostic only.

Measuring the new candidate consumes **cycle 2 attempt 3**, even if it is still
research-only. It is not an invisible free timing retry. A failure remains
negative evidence, closes this reviewed cycle, and requires a fresh independent
review and different declared approach before another attempt. A green prototype
is still not release acceptance: integration requires original numerical proofs,
independent protected review, full unchanged bench/gate/coverage and outstanding
roadmap checks. No source change is authorized by a diagnostic alone.
