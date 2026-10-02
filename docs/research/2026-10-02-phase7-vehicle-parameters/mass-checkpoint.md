# Phase 7 mass checkpoint

Physics tier: Refactor. Task 1 is in progress; this checkpoint adds immutable Ship physical inputs and parameterizes mass/tank/COM/inertia/station functions. No booster model, guidance, staging or rendering ships yet.

The preserved mass implementation is from main 7a757d7; its original source hash is embedded in tests/proofs/fixtures/ship-mass.ts. The new proof checks 50,001 loads through 0–1,200,000 kg and 30 boundary/adjacent-float loads, 18 outputs each: 900,558 comparisons. Observed maximum difference is exactly 0 local-value ULP. Altered dry COM/mass/capacity/tank/station tests were observed assertion RED (21.8 vs30;0.25 vs0.5), then GREEN.

One existing test passed centreOfMass directly to Array.map. Its index would become the new model argument; it now calls through a one-argument closure. Every existing assertion is retained. No production callback has this pattern. Initial missing-module RED only establishes the API; it is not called a physical proof.

Lint/build pass. Build is 280.8kB/300kB. Complete unit suite: 152 files,1996 tests pass, including all existing goldens and intro/scenario acceptance. Truth before/after is byte-identical:8/8 IN, all A unchanged. No fixture regenerated. Existing jsdom canvas/Node localstorage warnings remain visible in raw logs.

This is a backed-up implementation checkpoint, not a phase release or main merge. Engine/aero/state/step/guidance parameterization remains Task 1's next work; all Phases7–9 remain required.
