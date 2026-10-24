# Independent assessment of retained burn proof failure

2026-10-04 UTC. Reviewer `fall_cycle3_review`. Read the actual failed receipt,
driver and current burn implementation/trusted tests. No workload executed.
The failed proof remains incomplete and grants no timing/backend acceptance.

Raw failure is `false !== true` at the curated loop's `scratch.capped===true`
assertion. The loop index was not recorded; do not identify the failing regime
from the stack alone. All2200original warm/varied inputs and92domain comparisons
preceded this loop and completed, plus at least one curated comparison. No
reported backend outcome or full-scratch mismatch occurred. Remaining curated/
exception/final count assertions did not all complete. Before/after762source
manifest entries match; every materialized path is absent after cleanup.

I approved a source-assumption error in the initial harness: it treated each null
regime as necessarily capped. Current `backwardPass` first sets cappedfalse;
its nonpositive midpoint deceleration path returns NaN without setting capped.
`landingBurnStartAltitude` can also return null on invalid inputs/lower thrust
bound, insufficient propellant (`rLight<0`), or later bracket conditions.
Only exhausting1200midpointiterations sets cappedtrue. Existing trusted tests
assert null for these three regimes without asserting their scratch cap cause.
The failure therefore warrants correcting this research-only assumption, not
changing equations, production tests,1200cap or backend equality obligations.

A reviewed repair must retain all three null/full-outcome/full-scratch comparisons
and log labelled cases before assertions. Add discriminating positive controls
using fresh scratch with cappedfalse and isolated reset/read passive counters:

- Zero engines: immediate null, cappedfalse, zero ISA queries; source guard proves
  this branch without a mechanical pass.
- Three engines at Ship dry mass120000kg,61m/s,25m: completes a short first pass,
  requires positive fuel, hence `rLight<0` and null with cappedfalse and nonzero
  ISA calls. Keep complete backend equality and original source retention.
- Existing one-engine130000kg,3000m/s,60000m Ship input: genuine first-pass cap,
  null/cappedtrue, exactly2400ISA queries for1200two-query iterations.

The last case has a source-derived bound under unchanged V3 properties. The
light estimate reaches dry floor120t; flow250000/327<765kg/s gives mass<166t
after60s. At altitude>=60km gravity<10m/s², thrust>=2.45MN and therefore midpoint
deceleration stays positive. ISA density<.001kg/m³ there and above; tail-first
area<50m² and Cd<=2.5 give, while speed<3000m/s, total acceleration<27m/s² even
using vacuum thrust upper2.63MN and ignoring downward gravity. It cannot reach
3000m/s in60s (upper1620), altitude stays increasing, and the first pass must
exhaust the cap. This is a static design justification, not a new observed receipt.

Preserve the failed receipt. A revised distinctly named proof requires fresh
exact harness review before its one execution; no unchanged rerun or timing
approval follows. Source/manifests and prior qualified artifact reuse must remain
fail-closed. This assessment approves the repair direction only, not a revised
driver that has not yet been read.
