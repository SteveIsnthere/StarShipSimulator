# Fresh source-basis/design review

2026-10-18 UTC. Independent reviewer `/root/successor_source_admission`
returned HIGH for source-basis admission and the bounded projection allocation
design only. No reviewer test/build/browser/flight or edit ran.

The reviewer independently verified HEAD `8126077a`, the runtime ancestor,
empty tracked implementation diff at admission and all 803 source-basis rows:
726 exact V22 matches, 52 different and 25 absent, with zero current-hash
discrepancies. Proceeding from committed implementation through fresh reviewed
changes follows C0's explicitly authorized successor alternative. No unknown
bytes or absent historical acceptance are inherited.

The reviewer identified six allocating projection call sites and required:
exact coordinate expression/order, original fresh-object API, factory-owned
scratch, stable output identity and independent instances, changed camera/
viewport behavior, real world/effect tests and actual mounted scene redraw.
Because the existing mount fixture mocks world.update, separate real world
and effect-driver tests are required. Spies must call through and snapshot
scalar values before scratch reuse. All requirements were adopted for the
implementation and its separate code/result review.

This is not runtime, optics, frame-budget, phase or release acceptance.
