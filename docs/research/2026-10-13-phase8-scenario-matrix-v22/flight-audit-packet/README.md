# V22 owned SSR scenario-matrix run packet

This candidate packet is a fresh V22 adaptation of the previously reviewed owned SSR route. It binds the current V22 source closure, managed Node/npm/Chromium environment, active runtime metadata, cache and coverage baselines, shell boundary, command, and runner. The selected test file contains 30 cases, including all 18 required scenario × vehicle rows. It preserves the 900-second / 108,000-step horizon, one worker, 30,000 ms case timeout, zero retries, no coverage, and the 300,000 ms owner deadline.

Exact command and shell route are in `command.txt`. The route rejects stale native qualification and owns the SSR fallback under a one-shot marker. Before/after checks bind the source, runtime, cache, and coverage state. No budget or acceptance limit is changed.

The ordered standalone `npm run build` passed before the active cache baseline was refreshed; it reported 278.5 kB of 300.0 kB first-load JavaScript gzip, 50.9 kB of 80.0 kB fonts, and 0.0 kB of 250.0 kB audio. The original pre-build cache snapshot is retained separately for audit. The scenario packet itself has not run a test or browser workload.

This packet is readiness work only. The unresolved scenario-start/mission contract decision gates any scenario workload. A failed or timed-out invocation will be consumed; there is no rerun-for-luck allowance.
