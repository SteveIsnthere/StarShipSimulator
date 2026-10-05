# Independent third application matrix actual FAILED HIGH

Disposition: actual application matrix remains FAILED/incomplete at unchanged300000ms child bound; root1/309.6606335s. This is the third app episode. No full21 matrix, gameplay/photo/frame/performance/gate acceptance is established and no unchanged retry is supported.

Startup corrections allowed actual production-loop captures. Exactly four complete retained full-frame receipts exist, all desktop300 measured samples: launch, staging, entry and landing. Launch and landing meet the measured RAF p95 alone but fail cadence59; staging and entry fail both p95<=16.67 and cadence. Other scenes/projects do not establish complete acceptance. Exact values below are independently read from full-frame-budget JSON, with launch.env deliberately never inspected/output.

[
  {
    "scene": "landing",
    "cadence": 18.08780694696531,
    "cpuMean": 3.9250000001986822,
    "cpuP95": 8.400000005960464,
    "fullP95": 8.5,
    "intervalMean": 55.2858620689655,
    "fenceP95": 0.10000000894069672
  },
  {
    "scene": "entry",
    "cadence": 20.861386898490863,
    "cpuMean": 9.225666666726271,
    "cpuP95": 25.69999998807907,
    "fullP95": 25.80000001192093,
    "intervalMean": 47.93545150501672,
    "fenceP95": 0.10000000894069672
  },
  {
    "scene": "staging",
    "cadence": 18.15874018425959,
    "cpuMean": 8.22899999951323,
    "cpuP95": 19,
    "fullP95": 19,
    "intervalMean": 55.069899665551844,
    "fenceP95": 0.10000000894069672
  },
  {
    "scene": "launch",
    "cadence": 16.98931207491207,
    "cpuMean": 4.061666666467985,
    "cpuP95": 8.5,
    "fullP95": 8.5,
    "intervalMean": 58.860535117056855,
    "fenceP95": 0.10000000894069672
  }
]

Measured RAF work/fence spans cannot explain 48–59ms average frame intervals: mean RAF4.10/8.25/9.29/3.95ms and fence p95~0.1ms. Probe wraps RAF callbacks and calls WebGL finish, but explicitly excludes compositor/presentation and non-RAF tasks. Thus small finish spans do not prove isolated softwareGPU execution or absence of asynchronous graphics backpressure. Actual world canvas is WebGL2/ANGLE Mesa llvmpipe; launch renderer resolution1/backing1280x720/AAtrue/bloom attached enabled retained. CDP boundary process counters for launch show ownedGPU115879 increases79.63 CPU seconds, active renderer PID115936 increases3.91 CPU seconds, browser0.57 across setup+warm+measured+failure-boundary exposure, not measured-window-only. Five named llvmpipe workers0–4 sharecpuset0-4 with four-core quota. GPUprocess work is materially dominant in this boundary accounting; exact worker/shader/compositor scheduling critical path is not yet resolved. Launch cgroup delta102.881236 CPU seconds,26 throttled periods/+0.402606s throttle spans the same broad boundary. No hardware or measured-window CPU fraction is inferred.

Stage completedfalse/codeNULL afterErrors[]; helper exitedNULL/SIGTERM with process-timeout, closedfinished/noexecuting. Captured source770/tools20355/runtime before/after maps are equal; retained dist maps equal. V2 independent final checker now actually completes:73 structural before/finallyafter0/checker0. Root100 identities78ABSENT+22sameZ, zeroexecuting;4of12 groups clear,0uncertain. These are not allabsent/allgroupsclear. Original missing/fullmatrix status remains red despite successful final audits.

Method: finite actual selected receipts, full captured metadata-map equality and four completed frame summaries plus production probe source only; no imports/checks/browser/native/tool/source scans, workloads, copies or product changes. Browser launch environment was not read or printed.
