# Engine and geometry checkpoint

Physics tier: Refactor. Engine helpers now consume the supplied mount table/kinds/fractions and dry mass; aerodynamic helpers consume its hull/fin reference geometry. Production step/state/guidance still use their unchanged Ship defaults; Task1 is not complete.

Independent preserved engine/aero snapshots, source hashes embedded, defend all64 Ship running/failed masks,5 ambient pressures,4 throttle values,9 dt values,8 loads, dump/force-dump transitions, attack/into-wind boundaries, fin commands and rotational-drag signs. Ship outputs match bit for bit. Altered-model tests were assertion RED before the changes and GREEN afterwards, detecting wrong engine kind/flow, nose area and fin reference area.

Build/lint pass; complete unit suite154files/2003tests pass. Existing thrust-altitude/propellant/RVac/fin-fraction suites pass42tests. The initial focused command listed nonexistent engines.test/aero.test paths; it ran only proof files and is not represented as an existing-suite result. No goldens changed/regenerated. All8 truth rows remain IN. Raw logs preserve existing environment warnings.
