# Independent high review: cycle3 phase diagnostic harness

2026-10-04 UTC. Reviewer `fall_cycle3_review`; read-only harness inspection,
apart from this receipt. No profile, test, build or browser ran. Actual activated
Node V8 option inventory confirms both proposed generated-code flags exist.

Initial reviewed SHA256 pins:

- `fall-cycle3-phases.ts.txt`: `856824f1c6c8f3c2baf204b9a702d7b02d1f25c2d03c6b4d6f52917c7dbfe90e`
- `fall-cycle3-phases-declaration.md`: `64ac490c55e06fcc8413717bdbe860416a27039c7bf3aa7e5594203c663ea570`
- `run-fall-cycle3-phases.sh`: `f56835bbf6644924ef08332321c22a2635816723c67f34a89426b15de5d83d23`

The driver preserves original workload order, states, burn variation and counts
200/2000,20/200,5/50. Separate warm/measured Inspector profiles add no predictor
calls. Per-call exact fall endpoints and steps check all calls; the two-query
counts are honestly labelled derived from independently proved source topology,
not observed instrumentation. Process CPU and wall windows exclude Inspector
start/stop and census. Cgroup windows are slightly broader and include reads;
cgroup totals include other processes. Endpoint checking, profile sampling and
optimized-code printing add diagnostic overhead. These times cannot establish
acceptance or directly quantify unprofiled removable cost.

The restricted filtered-code flags do not force an optimization policy. Storage,
timeout, isolated temporary driver and broad source pins are appropriately
bounded. A missing optimized-code artifact must remain missing evidence, with
no automatic retry. Phase-specific short profiles can have few samples and need
honest uncertainty; machine instruction counts are not measured savings.

**Initial finding: block launch pending receipt repair.** After receipt-directory
creation, `set -e` preflight failures can exit before durable `exit-code.txt`.
Further, a successful workload followed by source-integrity failure exits70
while leaving recorded exit-code0. Every post-mkdir failure needs an EXIT handler
recording actual runner exit status, a separate workload status when applicable,
cleanup, and explicit unavailable/incomplete source verification. This repair
changes only diagnostic receipt handling, not workloads or runtime behavior.
The author and parent were informed; approval requires revised exact pins.

## Revised receipt handling: approved for one diagnostic

Re-read the complete revised runner and verified these exact SHA256 pins:

- Driver unchanged: `856824f1c6c8f3c2baf204b9a702d7b02d1f25c2d03c6b4d6f52917c7dbfe90e`
- Declaration: `d6ce3b7418446af28b2ed1626345bdb540fb4f33b5d783ed12a48e490e00b013`
- Runner: `5489170561d81a514e7a81a5cf8e4f8c1d6787eaa0afbb4ea566c8161773e4da`

The EXIT handler now preserves actual final script status and last stage for
post-mkdir failures, distinguishes workload status, captures runner stderr and
cleanup failures, and explicitly reports unavailable source verification when
manifests are incomplete. Source-integrity exit70 cannot be masked by workload0.
The finding is resolved. Approved for exactly one diagnostic after the parent
grants exclusive CPU ownership; no run occurred during this review. This is
approval of evidence collection, not an implementation or acceptance decision.
The parent must inspect six profiles, local accounting and actual filtered code;
absence or failure remains negative/missing evidence without an unchanged rerun.
