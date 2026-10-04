# Independent high review: native plain timing candidate

2026-10-04 UTC. Reviewer `fall_cycle3_review`. Read prepared native driver,
declaration and runner, prior accepted semantic receipts, current Ship/legacy
height sources. No workload executed. Initial launch is blocked pending repair.

Initial pins:

- Driver: `f951dd0e1ed8586c8a1d84c2cfa90be4b9c2eda44a881166cf5da46aa6a5d3ca`
- Declaration: `b85a0dd041553ca6a7a48eb0c7cd0c72ad88d5962c39bbfce2b7662b3abb7a3c`
- Runner: `3b08a814755fdb05147bb76c730b325df1edc5cee0271cf9e4a51933c1c074d0`

Original200/2000,20/200,5/50loop counts, order, inputs, separate scratch and burn
variation are retained. Plain native `.mjs` imports the qualified uninstrumented
bundle without SSR, counter graph, profiler or tier flags. Surrounding accounting
and phase callback overhead is explicit, with no per-call wrappers or extra warmup.
All three results are written before strict0.2/1/2mschecks assert. Distinct attempt2
receipt, qualified source/proof/build/artifact reuse checks, broad before/after
source/artifact/Node-binary hashes, local quota/CPU accounting, process census,
bounded execution and temporary cleanup are appropriate for research diagnosis.

**Blocking preflight:** `SHIP.height===50` is false. Current Ship height is52 via
V3_SHIP; original timing ground25 remains correct because legacy
`C.vehicleHeight===50`. Do not change ground to26 or presets/model to satisfy this
check. Correct the assertion/declaration to distinguish current model from the
preserved original workload constant, using source-pinned evidence.

**Required endpoint hardening:** current checks only prove reached/unreached/cap
steps. Add exact source-frozen endpoint checks after measured loops, outside timing:
normal910steps,time227.276593764986,downrange207713.16688728545; cap4000steps,
timeNaN,downrange3246.2139561608574; burn result69.09474954728736,duration
1.421244144191255,cappedfalse. Preserve all actual results before asserting red.
These compare completed original receipts, introduce no predictor calls, and do
not relax acceptance. Await revised exact pins and reread before one measurement
approval. No acceptance-loader or source/benchmark contract change follows.

The height/endpoint corrections were re-read at driver
`e00d3dc50c7b1b5d0cfe1e7c41d12e4597a9457cc533d21a443bcd30e87a762e`
and declaration `d02f665b68fce3996cedcad28f357dcfef2dd5570cb71248bb2f1b40b9c18907`;
runner remains unchanged. Those findings are resolved, but one further execution
fidelity issue blocks launch: current phase accounting performs census/quota reads
and receipt writes between each warm loop and measured loop. This introduces an
untimed gap absent from original back-to-back loops and can let background JIT
compilation finish. No extra predictor calls occur, but tier completion can affect
the intended original warm-count comparison. Keep warm loop, first performance.now,
measured loop and second performance.now adjacent; defer filesystem/accounting/
census to outside that pair, with accurately labelled pair CPU/quota data versus
measured wall interval. Parent/author informed; await exact revised design.

Parent clarified that full final candidate scratch may be retained with immutable/
source-retention checks and referenced to accepted76fall/2300burn differential
proofs. No original full-scratch serialized receipt exists for final benchmark
endpoints. Do not invent such a reference or add predictor warm-up/oracle calls.

## Revised final harness approved for one research measurement

Re-read complete final driver/declaration and verified exact SHA256 pins:

- Driver: `cca7c57a64f86bd870e446b2eaea54737bb3bb34c847a3d2aaf0c3af7a105ca9`
- Declaration: `88cb659789a47ccfbe1e8352e715bd00c31d1df576e1eba722057d066b99cf4e`
- Runner: `3b08a814755fdb05147bb76c730b325df1edc5cee0271cf9e4a51933c1c074d0`

All findings resolved. Legacyground25/currentShip52 are separately source checked.
Each warm loop now flows directly into the measured timer/loop/timer; filesystem,
census and CPU/quota snapshots stay outside both. Pair CPU/quota data is explicitly
combined warm+measure accounting, while wallMs times measured calls only. Original
counts/order/inputs and strict0.2/1/2mslimits remain. No extra predictor, oracle,
counter, profiler or optimization call is introduced.

Final exact endpoint checks and complete candidate scratch snapshots occur after
all timed loops. Signed zero and nonfinite snapshot values are explicitly encoded;
immutable model/source, cleared source pointers and untouched caller/burn fields
are checked. Prior accepted differential proofs qualify complete scratch semantics,
without claiming nonexistent frozen full-scratch endpoint references. All actual
timings/endpoints/checks are written before any red assertion.

Approved precisely one cycle3attempt2 plain-native research measurement after
parent grants exclusive CPU ownership. No run occurred during review. It is a
different backend candidate, not a changed gate/bench or deployed artifact identity
claim. Parent must release CPU and independently assess actual source/binary/artifact
integrity, timing and endpoints before any adoption; no lucky rerun or acceptance
weakening follows from a red result or this approval.
