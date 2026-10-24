# First RTLS candidate misses actual contact

2026-10-03. The single approved exact replay completed on the original frozen cycle2-attempt1 core, Nodev25.8.1. No production edits, alternate candidate, alternate seed or live continuation. The entire reconstructed coarse forecast and shutdown timestamp passed deepStrictEqual against the existing receipt before fine integration began.

**Result: the surrogate-false-negative hypothesis is rejected for this candidate.** It could finish a proof before cutoff, but actual fine mechanics does not catch. Earlier routing or removing the lateral-feasibility veto would not fix RTLS.

| actual incoming lug contact | measured | unchanged limit | result |
|---|---:|---:|---|
| Tower offset |+105.342168741m |±2.25m |FAIL |
| Lateral velocity |+4.802838228m/s |±1m/s |FAIL |
| Vertical velocity |−84.763187679m/s |[−4.5,0)m/s |FAIL |
| Pitch |2.254874296rad |±0.087266463rad |FAIL |

The fine forecast reaches the catch plane after2208paid advances and18.397280500s interpolated forecast time. It retains103941.614778kg fuel; reached=true and failed=false are not a catch claim. The production physical-catch test returns false. The replay stops at this first plane crossing, without continuing to ground or trying another duration. Before/after full mechanical states and lug poses are retained in booster-cycle2-attempt2-replay.json.

At three search advances per live tick,2208advances require736ticks or6.133333s. Starting at the recorded first-candidate completion5.258333333333384s would finish11.391666666666719s, before12.99166666666657s cutoff, with1.6s slack. That arithmetic proves only timely completion of this failed proof; it provides no cutoff authority.

Original candidate:604/120s burn, first source0.008333s,1893coarse advances, coarse fuel139532.902804kg, handoff x569.521857m, height2938.015361m, lateralFeasible=false. Its complete coarse forecast and shutdown matched exactly. No guessed physical state or corrected handoff was supplied.

Retain existing routing/veto and all catch/source/fuel/deadline gates. This attempt is consumed; no second candidate replay follows automatically. The previously successful5.325s candidate remains a separate late-proof result from attempt1. Any next approach needs an evidence-backed paid-work/selection argument; changing a coarse flag alone is not supported by these results.

Artifacts: booster-cycle2-attempt2-proposed-replay.md (approved pre-run declaration), booster-cycle2-attempt2-replay-harness.mjs.txt, booster-cycle2-attempt2-bundle-hash.txt, booster-cycle2-attempt2-replay.json. Frozen executable:/tmp/booster-cycle2-attempt2-frozen-replay.mjs; raw summary:/tmp/booster-cycle2-attempt2-replay.txt. The generated executable differs from the original frozen bundle only in its diagnostic tail; core prefix is byte-identical. The diagnostic tail is intentionally appended to that bundled scope, not independently executable production code.
