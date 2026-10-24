# Fresh full-Chrome qualification harness review

Status: narrow managed full-Chrome binary pinning is a reasonable separately granted read-only next step. Preparation and launch are not approved against these exact files until the findings below are resolved and freshly reviewed. No executable source patch, pinning, copy, build, test or browser launch was performed in this review.

Reviewed exact files:

- `prepare-fullchrome-swiftshader-worker.sh`: `9ee885b4574434791931630c441cc8cf7a1e14d51c7f6fd0583da87f195a0dde`
- `run-fullchrome-swiftshader-worker.mjs`: `c6d897f6b3cc8732900d6ccda47dec44c78009e36e422dc447d820d4dea71598`
- `cloud-fullchrome-worker-declaration.md`: `182faddfb12881c991263ddde2174b7d669a64967ce33046f20519aa21b5841d`
- `chromium-linux64-discovery.patch`: `f3e2a217b60b18a75415683d532136738048d02f66215fbf339899adc7dfa89d`
- `chromium-linux64-layout.test.ts.txt`: `cc8dc25ad5fc068eef117cd6cacb9f3e7cffbfacd6b9f0ac97b747be405bd695`

## Findings

1. `topology()` retains worker affinity but its qualification condition does not require each of the three workers' affinity to equal the declared0-4. Enforce the recorded contract, preserving all original launch policy and cpuset checks. The count and same-worker identity checks are otherwise concrete.
2. Failure-path final integrity verifies listed `receipt.buildFiles` bytes but does not independently walk the final dist file inventory. An added file can pass that boundary after a timed-out run, whereas successful `identity()` has an inventory comparison. Verify the same sorted non-map build file set and bytes on the final boundary; do not describe listed-hash verification as complete build identity.
3. The preparation script has no intrinsic90s timeout, despite the declaration's separately enforced90s claim. Supply the exact reviewed bounded invocation or wrapper before preparation approval. Preserve the newly created private directory path plus failure/last stage on setup failure or timeout; do not leave an unidentified partial copy without a receipt. No browser is launched by preparation, so this repair requires no launch rerun.

The runner's cleanup wall-bound assertions are fail-closed, but synchronous file hashing and synchronous git execution cannot be preempted by its JavaScript deadline timer. Avoid claiming a strict process wall ceiling solely from that timer. The parent should retain an independent bounded supervisor/ownership recovery plan; an exceeded internal budget must remain a failed qualification.

## Correct scope and supported design

The exact managed registry1234/version151.0.7922.34 route, independently supplied full-browser SHA pin, private complete copy and distinct full-Chrome implementation are explicit. The harness preserves four original flags and headless operation, does not select a faster fallback, uses production prebuilt app and original real probe with20 actual draws, and records diagnostic cadence without calling it acceptance. The complete-copy identity checks preserve bytes/modes/sets and separation from managed inodes. Actual mapped driver and three-worker topology are stronger than assuming INI discovery from cwd alone.

The GO/STOP owner handshake captures PID/starttime/group before browser execution. Cleanup tracks ancestry/group plus uniquely private copied executables for detached crashpad, checks identity before kill, treats EACCES as failure and distinguishes nonexecuting zombies from reaping. Final integrity and non-overwrite durable outcomes are valuable; collection cap errors remain qualification failures. No automatic300-frame run follows qualification.

The unapplied helper patch adds only `chrome-linux64/chrome` ahead of the preserved older route. Four isolated fake-filesystem tests cover new layout, old layout, deterministic precedence and rejecting shell-only cache as full Chrome. This is appropriately bounded implementation for the discovered layout defect, with no performance claim. Applying it and running required checks remain separately authorized work.

After corrected exact harness review, approve at most one functional qualification under root's serialized CPU grant. Review actual20-frame outcome before any full trial; cadence in the prior2–4fps range should lead to targeted attribution, not an automatic unchanged300-frame run. All original graphics/physics/quality acceptance obligations remain unchanged.
