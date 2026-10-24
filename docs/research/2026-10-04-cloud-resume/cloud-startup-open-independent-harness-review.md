# Actual independent high review: one startup file-open diagnostic

2026-10-04. Read the actual runner, preparation script and declaration; no launch or test/build occurred. This follows the fresh graphics cycle review, which established the missing first-open mechanism rather than permitting another worker-count trial.

**Disposition: approved for exactly one separately source-pinned diagnostic after root exclusive CPU/browser grant, at the frozen hashes below.** No remaining launch-blocking finding at these pins. This approves startup evidence collection only; no rendering or performance acceptance and no retries.

Reviewed pins and complete reviewed file snapshots are in cloud-startup-open-independent-review-artifacts/:

- runner95ec8c439a5e0366239c50e64f7879ed0e8c39d484a00a0fc83d13b03a54fc13
- preparation252038d61cc82b2675380b04de35d05f8024f30566e6ed4b44b8cb0fb96cc312
- declaration22570c80d537a0e3eb40d32100b555f073daeda9dc390069ab0b928d4bb2846b

Three concrete prelaunch findings were addressed: the original trace-export catch merely recorded an action without failing diagnosis; final raw/filter truncation could escape the100ms monitor and still exit0; the wrapper omitted timestamps and GPU effective arguments/status were absent. The final runner independently fails on missing export or raw/filter truncation, the wrapper adds-ttt, and startup topology records GPU actual argv plus UID/GID/NoNewPrivs/Seccomp/Seccomp_filters. Earlier reviewed hashes are superseded; never launch those versions.

Ownership review: registration captures the wrapper root PID/starttime/parent/dedicated process group before GO. That same root execs strace; CDP separately identifies its actual Chromium child. The runner verifies tracer executable/digest and captures actual browser identity before scene validation; topology verifies GPU ancestry. Cleanup snapshots group members/descendants, retains root identity even on early/late protocol failure, closes a late browser when stopped, checks identity before signalling, and verifies no live tracked descendant remains within a shared5s deadline. STOP prevents an unregistered late wrapper from starting. Root must still independently inspect final PID/starttime absence before releasing the slot; a receipt alone does not make cleanup true.

The100ms size monitor plus90s work/5s cleanup bounds is acceptable for this small startup-only trace. Local writes can overshoot between polls; this is explicitly disclosed and separate from the strict1MiB exported raw and64KiB filtered caps. Truncation makes diagnosis incomplete and failed even if the mounted-root/topology outcome was written earlier. Preserve actual local raw size and file separately if that occurs; no inherited ulimit changes browser caches or behaviour. No hard collector redesign is needed before this supported route is attempted once.

Trace selection is exactly openat/openat2/chdir/fchdir through the owned process tree from exec; timestamps/PIDs/pathnames/flags/results are sufficient for the first-open question without collecting read buffers or environments. GPU argv/status assists interpreting any denied open; five observed workers remain an observation, not config-setting success. The original headless shell, args, exactThreadCount3 private file, source/build, quota and cpuset remain pinned. No full-Chrome switch, library-adjacent file, affinity tuning, shader edit or invented flag is included.

The runner stops after real mounted scene/root readiness and startup topology; it never arms20draw or an acceptance sample. Its install-only budget probe has no warm/measure request. Tracing perturbs startup and cannot yield any fps/cadence claim. Analyse exact open result/cwd/PID first; a successful open does not prove the scheduler accepted the setting. Denied ptrace, startup failures, truncated logs or missing first-open attribution fail closed with durable receipts and no automatic retry. Existing failed attempts remain separately immutable. Root may proceed autonomously under the standing reviewed-cycle authorization after checking these exact pins and reserving the sole browser/CPU slot.
