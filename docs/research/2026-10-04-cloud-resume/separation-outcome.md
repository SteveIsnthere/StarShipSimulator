# Default separation: first plane miss and retained-fuel impact

One declared flight completed on Node22.23.3, Linux x64, cloud, exit0. Default unchanged booster-sep, seed0x57414c4b, live120Hz. All core hashes embedded before bundling matched after build and before/after flight. No runtime edit, second flight, alternate seed, cap/limit change or timing acceptance. Serial CPU slot released after the flight.

[Declaration](separation-declaration.md), [selected full boundary states](separation-receipt.jsonl), [complete raw trace, gzip](separation-full-trace.jsonl.gz), [hash inventory](separation-evidence-hashes.json), [core manifest](separation-core-hashes.json). Original raw bundle/logs remain `/tmp/separation-trace-neRlJt`; complete trace82317362bytes,3307rows. The gzip expands to the exact recorded trace digest. Source is the dirty recovered implementation plus current reviewed RTLS fix at the recorded HEAD/diff digest, not a committed release.

## Observed sequence

| Boundary | Live time s | Evidence |
|---|---:|---|
| Plan publishes |24.600000| Future cutoff33.916666667; lineage1/revision0. Publication is timely. |
| Paid shutdown/coast |33.916666667|266469.164kg retained propellant. |
| Terminal phase enters |317.350000| Lug x+288.645380m, altitude2927.736825m, vx−32.530222m/s, vy−277.000502m/s. Hull pitch0.11476055rad, omega−0.00488181rad/s; fuel128862.112kg, RCS11.977902s. Three centres already running and healthy. |
| Horizon initialized |317.358333| Remaining20.529378490s. No new terminal ignition delay was needed; the terminal-ignition timestamp records controller entry, not evidence of a fresh engine start. |
| RCS reaches zero |336.158333| Previous reserve0.003177662s; current0. Before depletion pitch−0.000037452rad, omega0.000008722rad/s, lug height22.057692m, fuel93331.264kg; delivered gimbal−25.868778%, delivered RCS324281.607N opposes thrust-vector angular acceleration−0.083862904rad/s². |
| First downward lug-plane miss |337.656663278| All four numerical catch gates fail, with no crash/breakup/fuelRunOut and above-ground eligibility intact. |
| Horizon expires / missed flag |337.891667| After the first failed plane crossing. Three healthy centres shut off; retained fuel89683.112kg. |
| First impact capture |341.641667| reason1 (Impact), retained dry200000kg and propellant89683.112kg, captured before terminal resets. |
| Returned crash |341.650000| Hull altitude12.289977m, x+0.827373m, endpoint fuel0/failed masks are release/disposition. |

First plane interpolation follows production shortest-angle hull interpolation and rotating lug station exactly:

| Catch gate | Observed | Original limit | Margin |
|---|---:|---:|---:|
| Lateral position |−6.899046857m| abs(x)≤2.25m |−4.649046857m|
| Lug lateral speed |−11.960010334m/s| abs(vx)≤1m/s |−10.960010334m/s|
| Lug downward speed |−7.360327583m/s|−4.5≤vy<0m/s|−2.860327583m/s|
| Hull pitch |−0.230141479rad| abs(pitch)≤0.087266463rad |−0.142875016rad|

At crossing previous/current fuel90230.122/90212.141kg, all three centres running, none failed, RCS0, delivered gimbal−100%, throttle94.080/94.580% headed toward100%. No component loss or material-domain exit occurs; revision remains0 until the terminal disposition. No first-fuel-run-out transition was recorded. The exact crossing is tick40519 at fraction0.7995933534367.

## Supported diagnosis and next bounded work

The proximal divergence is exhaustion of paid rotational authority followed by growing attitude/lug-velocity error before the first catch plane. At336s attitude was almost upright; after reserve is spent, at337s pitch is−0.057649rad and omega−0.157671rad/s, then all four catch gates fail. Horizon expiry is a subsequent shutdown consequence; extending it cannot repair the already missed first plane. Fuel starvation, ignition failure, progressive component damage, RTLS pressure breakup and a late default-separation publication are excluded by this receipt.

The controller asks gimbal to supply terminal translation while paid RCS offsets its rotational torque to hold upright. The evidence identifies that finite authority budget as the next target; it does not by itself prove a new allocation law or why the accepted forecast admitted a catch. The accepted forecast handoff predicted x226.122931m, vx−28.912974m/s, vy−277.984010m/s, pitch0.098576595rad and fuel130912.432kg, whereas live terminal entry is above. The validated terminal rollout reported2496advances/20.8s. A fine terminal replay from a coarse handoff is not evidence that the actual evolving whole flight reaches that same handoff.

Obtain fresh independent review of this receipt and source first. Next bounded read-only feasibility should account for the actual terminal state and integral paid RCS/gimbal torque, then distinguish coarse handoff prediction error from the joint attitude/translation allocator's finite reserve demands. Prove any proposed generic fix within existing RCS/gimbal/fin/throttle, preset, catch and work bounds; use failing truth/budget/provenance tests before code. Do not increase reserve, reset the horizon, tune a default-specific cutoff, remove a catch gate, or rerun this unchanged flight for luck. A new physical acceptance flight requires its own declared, reviewed candidate/fix.

This receipt is CPU diagnosis only. Full scenarios, unit/coverage/truth/goldens/gate, Mac gameplay/render/frame/performance acceptance, independent release review, merge/main gate and live deployment remain outstanding.
