# ONE startup trace — partial, failed at cap; initial INI miss observed

The reviewed95ec8 runner/252038 setup/22570 declaration ran exactly once with original headless shell/config3/flags. It exited1 after5453ms because the1MiB trace monitor cap was reached. Local raw file1,923,280bytes includes monitor/cleanup overshoot; exported raw is strictly1,048,576bytes, filtered relevant evidence330bytes. The status explicitly labels truncation. This is a failed partial diagnostic, never a complete syscall trace or performance/acceptance result. No cap expansion, retry or setting change was performed.

The intact exported prefix contains this sequence for actual GPU PID21991:

```text
1791099131.521488 chdir("/workspace/cloud-bootstrap/starship-v1/browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/") = 0
1791099131.530748 openat(AT_FDCWD, "SwiftShader.ini", O_RDONLY) = -1 ENOENT (No such file or directory)
1791099131.535781 chdir("/tmp/starship-open-diagnostic.kfwD0HQf") = 0
```

This directly shows the initial configuration file was absent while the GPU temporarily used the managed browser binary directory, then restored the private cwd. Earlier topology snapshots observing private cwd/config visibility therefore did not establish visibility during the cached configuration read. Pinned Configurator silently defaults on failed open, and getConfiguration caches it. Actual five named workers remain observed. No stronger claim about every file-open operation follows from truncated trace.

Startup mounted the real1280×720/DPR1 WebGL2 SwiftShader world canvas, with no probe/context errors. GPU actual argv includes --no-sandbox; safe status reports UID/GID1000, NoNewPrivs1, Seccomp0 and Seccomp_filters0. This particular ENOENT is not an observed permission/seccomp denial. Tracer executable/hash and actual browser/GPU identities are saved. There were no20draw samples or performance timing.

Source `7f3e6dd84a1ce3595acd996e51127c308e6f8b0d296b78fe46ebb70abcf36dfd`, build `574f3787dc6e0f281f6c30beae9e5a4715e6ffd80e81be6993c945041448d765`, head `720447f739fc588ac66c6946bf7cc48f1e038125`; post-exit verification found 0 changes among originally pinned source/build files. Artifact directory contains untouched raw log, bounded export/filter, source/config/wrapper/ownership/topology/console/failure/cleanup receipts, actual reviewed harness sources and hashes. Rawtrace contains syscall paths/flags/results only; no read content or environment was traced.

Cleanup2045ms stayed within5s, using identity-checked fallback kills after graceful close. Independent PID/starttime verification found tracer absent and every remaining owned Chromium process stateZ underPID1, with no executing owned process. Zombies were not claimed reaped. Exclusive CPU/browser slot was released after this check. Private directory remains preserved. Any correction to configuration placement requires a separate reviewed safe isolated construction; no managed bundle/global INI, full-Chrome/helper change or further launch was made.
