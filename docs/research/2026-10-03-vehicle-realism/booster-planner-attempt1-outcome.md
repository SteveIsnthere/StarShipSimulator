# Booster planner diagnosis cycle: attempt 1 failed

2026-10-03. Lead authorized symmetric same-source probing, then one actual seed123 production receipt and a bounded replay of only its two already evaluated immutable fine candidates. No new durations, parameter search, physics changes or extra live receipt in the replay. Original 4 total mechanical advances (1 observer + 3 search), 16 trials, 900 forecast seconds/4000 steps, catch bounds, future-cutoff requirement and all guards retained.

## Result

The directional search defect is fixed, but **the actual seed123 future-plan acceptance remains RED**. The unchanged source observer predicts the 13g terminal at 53.758333 s before any plan publishes. Focused numeric/scheduler tests (6 new + 6 existing) and lint pass; they do not establish flight acceptance.

A physically successful candidate exists. Exact immutable replay of the production-evaluated 24.1 s burn genuinely secures the airborne catch, with 90,062.135790 kg fuel and no realized fault or damage terminal. Thus this case is a scheduling/search deadline failure, not evidence that the frozen catch or engine authority is physically impossible.

## Trial and validation evidence

| Live completion/start (s) | Burn (s) | Coarse residual (m) | Shutdown (s) | Meaning |
| --- | --- | --- | --- | --- |
| 10.358333 | 24.225000 | −553.275782 | 33.858333 | First negative endpoint |
| 15.833333 | 24.216667 | −509.807663 | 33.850000 | Mirrored adjacent-tick response |
| 22.541667 | 24.125000 | −140.929454 | 33.758333 | Same-source secant proposal |
| 27.983333 | 24.091667 | +43.282504 | 33.725000 | First supported candidate; fine trial begins |
| 40.316667 | 24.100000 | −2.387754 | 33.733333 | Adjacent bracket endpoint; fine trial begins late |

The first fine trial takes 2482 actual 1/120 s steps. It reaches the plane after 20.677911 interpolated forecast seconds, but fails **only** the lug lateral-speed bound: −3.075332092 m/s against 1 m/s. Contact x −1.128011428 m, downward speed −1.708973718 m/s and pitch −0.037314964 rad are inside their unchanged limits. Root/pitch rotation contributes materially: hull lateral speed at the endpoint is only −0.096930 m/s, while angular speed is −0.099623967 rad/s. This is actual contact geometry and velocity, not a fuel or global terminal failure. No assertion may substitute hull speed for lug speed.

The second fine trial takes 2490 steps/20.75 forecast seconds and **actually catches** at forecast world time 338.066667 s. Secured lug x is −0.000270344 m, pitch 0.000012562 rad, airborne hull altitude 90.084507 m. Endpoint zero velocities are the catch securing operation, not measured incoming velocities; the canonical catch operation itself establishes accepted incoming bounds. The production scheduler cannot finish this trial before approximately live 47.233333 s, so rejecting its 33.733333 s cutoff is required.

## Budget diagnosis and bounded next work

With three search advances per live tick, a fine trial of 2490 steps alone costs 2490/360 = 6.916667 live seconds. Its latest possible start is strictly before **26.816667 s**. Attempt 1 starts the physically catching trial at 40.316667 s, a deficit of **13.5 live seconds / 4860 search advances**.

Merely deferring the first fine trial until the sign bracket exists saves 2482/360 = 6.894444 live seconds. The successful endpoint would still finish around 40.338889 s, **6.605556 s / 2378 advances late**. Therefore “validate only the best residual” is insufficient, and the measured physical miss must not be declared accepted to remove its cost.

Current common-prefix reuse retains startup and a final steady-burn endpoint. A shorter candidate generally cannot borrow a later paid endpoint: preserving that rejection is correct. A bounded cache of earlier, exact common steady-burn states could remove repeated paid boost work without transporting candidate authority. However, saving only roughly 24 s / .05 s = 480 repeated boost advances per successor (four successors ≈1920 advances) is insufficient by itself for the remaining ≈2378-advance deficit. This is an optimistic scale estimate, not a measured guarantee. Cached states must also preserve the exact ignition cadence, partial live-tick tail, source/model/controller identity, RNG, fuel and cutoff clock. Any implementation requires cached-versus-uncached independent endpoint equality witnesses.

Recommended next prerequisite: **measure a phase/advance cost ledger for these already evaluated immutable candidates**, particularly alignment/startup, steady boost, coast, paid entry and terminal readiness. Then design a source-local proposal stage that can avoid full ready-handoff propagation for exploratory samples, while retaining full coarse readiness and fine proof for the selected candidate. A cheap proposal is never a physical bracket endpoint or cutoff. Freeze that algorithm and an advance-count deadline prediction before attempt 2; do not choose a numeric target from the observed catching 24.1 s. Existing scalar preflight residuals cannot establish correct lug control because the first replay demonstrates significant angular-velocity contribution.

An alternative is an independently justified search representation that shares mechanically identical intervals across trials beyond startup; physically distinct coast/entry histories cannot be merged. Additional advances, coarser fine contact steps, relaxed catch speed, later shutdown publication and injected live cutoff remain outside scope. No concrete timing guarantee exists yet for either representation; a new live attempt would be premature before the cost ledger and source-local proposal derivation.

The parent has identified a separate paid-force epoch bug and assigned its correction to another agent. Reconfirm the immutable trace after that serial patch before any attempt 2; no claim here assumes source hashes remain unchanged.

## Raw evidence

- `booster-planner-attempt1-live.ts.txt` / `.jsonl`: actual production receipt, seed123.
- `booster-planner-attempt1-fine-replay.ts.txt` / `.jsonl`: only durations 2891/120 and 2892/120, immutable first origin, unchanged canonical mechanics/controller. Coarse residuals match production exactly; replay uses no cache and completes both below original caps (coarse 3712/3711 steps; fine 2482/2490).
- `/tmp/booster-planner-attempt1-live.txt`, `/tmp/booster-planner-attempt1-fine-replay.txt`.
- `/tmp/booster-negative-probe-red.txt`: initial 3 failed/3 passed.
- `/tmp/booster-negative-probe-green.txt`: 12 focused passed and targeted lint exit0.

No final release acceptance; no additional fix or live attempt authorized by this document.
