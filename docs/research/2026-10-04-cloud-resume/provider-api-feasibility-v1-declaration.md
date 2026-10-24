# Provider public API feasibility v1 — unexecuted, review required

One bounded research-only attempt, after fresh independent review and parent exclusive CPU grant. Driver: `provider-api-feasibility-v1.mjs`. No production/config/test edits, actual test collection/execution, flight, profile, threshold tolerance changes or current coverage acceptance. Tiny synthetic coverage maps exist in memory only; names are explicitly synthetic and no source files are added. The fixture path strings deliberately exercise the original protected glob domains, not omitted real source.

Run only after authorization, from the activated existing checkout:

```sh
source /workspace/cloud-bootstrap/starship-v1/activate.sh
node docs/research/2026-10-04-cloud-resume/provider-api-feasibility-v1.mjs /tmp/starship-provider-api-feasibility-v1-UNIQUE
```

The output directory must not exist; no stale output is accepted. Seventeen sequential children (one positive, sixteen named below-floor cases), each hard-capped30000 ms, use actual installed `createVitest` to resolve current config without starting or collecting tests, initialize installed `V8CoverageProvider`, call public `createCoverageMap`, add independently constructed tiny maps and call public `reportThresholds(map,true)`. Public context closure happens afterward. No private provider API, custom percentage evaluator or fallback is allowed. Any API incompatibility stops this attempt and requires diagnosis/review, not alternate invocation or luck rerun.

Synthetic children use timeout30000 ms with explicit SIGKILL and4MiB output-buffer cap. No graceful signal handler can extend that timeout; any timeout/signal/buffer error rejects the attempt. Normal API closure remains required before finalized proof, and a killed child cannot produce admissible completion evidence.

Fixtures use three100-line protected files and one1000-line global-only file. Each has one statement/function/single-counter branch per line plus nine statements per line-count concentrated on the last line; all hits initially1. This has independently known100% for all four metrics. Line cases remove hits only on early distinct lines, preserving sufficient statement coverage. Statement cases remove only extra last-line statements, leaving that line covered. Branch/function cases remove independent counts. The larger global-only file prevents a single protected-module below-floor case from unintentionally failing aggregate thresholds. Aggregate cases modify every fixture file proportionately and explicitly expect the additional tighter module errors.

| Declared case family | Known percentage | Expected native errors |
| --- | --- | --- |
| Positive full100 |100 for all metrics/domains| none, child exit0 |
| Aggregate branches99 floor |98| global + physics branches |
| Aggregate lines99 floor |98| global + physics + autopilot lines |
| Aggregate functions98 floor |97| global + physics + autopilot functions |
| Aggregate statements99 floor |98.9| global + autopilot statements |
| Physics branches/lines/functions100 floors |99| only the respective physics metric |
| Physics statements98 floor |97.9| only physics statements |
| Control branches/lines/functions95 floors |94| only the respective control metric |
| Control statements95 floor |94.9| only control statements |
| Autopilot branches95 floor |94| only autopilot branches |
| Autopilot lines99/functions100 floors |98/99| only the respective autopilot metric |
| Autopilot statements99 floor |98.9| only autopilot statements |

Every red case must exit1 from the actual provider's native `process.exitCode`, emit exactly the named expected threshold errors, and produce its own structured receipt. Parent harness success means these expected native red/green statuses were observed, not that red coverage passed. A throw/load error, missing receipt, unexpected signal/status/message/count, source/tool pin mismatch or nonempty collected test state rejects the proof. Preserve native stdout/stderr and provider class/version, fixture digest, current unchanged thresholds/testTimeout and before/after source/config/tool hashes. Pin the driver and this declaration before executing; the driver additionally records their digests with all other pins. A summary is written only after all cases and unchanged after-hashes verify.

Each child writes its exclusively created `finalized:true` receipt only after native decisions, public context closure and after-pin equality all succeed. The parent requires both finalized state and exact before/after pins. Any API/assertion/closure/finalization error sets distinct exit2 and produces no finalized success receipt, even if an earlier native red threshold decision already set exit1. Thus a late error cannot impersonate the expected red-case exit status.

This proof establishes only the feasibility of the installed public threshold API and exact bounded decisions. It cannot establish complete real-source map coverage, fresh-gate inventory/report lineage, ownership of shared actual flights, speed improvement or gate acceptance. Those remain separate reviewed implementation work. Existing global/per-module floors remain unchanged in the driver and are asserted against the real resolved config before calls.
