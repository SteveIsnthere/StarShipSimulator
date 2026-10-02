# Fin assessment ruling — before measurements, 2026-10-02

This is a read-only feasibility assessment, not a flight-model change or acceptance.
Retain front/aft pair areas 24.2/45.8 m², existing fixed stations, moving CoM,
and maximum extension 1.03 rad. Use the ogive hull's 411.272 m² planform,
excluding the legacy fin-area inflation, in the body-moment comparison.

Inspected NASA TM88338, equation 1: Newtonian flat-plate Cp=2 sin²(beta),
a hypersonic continuum approximation. Also inspected NASA TN D-1764
(19630002677), theoretical considerations: normal-shock modified Newtonian
and sharp flat-plate (gamma+1) sin²(alpha) are distinct approximations.
Neither establishes a universal Cp≤2 bound. Sources:
https://ntrs.nasa.gov/api/citations/19870002265/downloads/19870002265.pdf
https://ntrs.nasa.gov/api/citations/19630002677/downloads/19630002677.pdf

Two screens, fixed before measuring:
- Generous pressure-only per-pair moment magnitude q*2.4*area*abs(arm),
  allowing any force direction and both pairs' magnitudes simultaneously.
  2.4 is gamma+1 for gamma=1.4 in the cited sharp-plate approximation;
  this is a model-specific generous screen, not a physical ceiling.
- Candidate longitudinal-hinge flat-plate geometry: deployment delta tilts
  the plate normal from the out-of-plane axis toward the body's transverse
  axis. In planar flow, sin(beta)=sin(alpha)*sin(delta). Normal pressure
  projected into the plane is sign(alpha)*2*q*area*sin²(alpha)*sin³(delta).
  Moment is that force times the signed station-minus-CoM. Front/aft can
  independently range from zero to maximum extension. This is a declared
  geometry approximation; no Ship pressure/shielding data are claimed.
  Resolve the same vector into lift/drag if later implemented. No coefficient
  fit, added area, extra station, or changed control limit is permitted.

Apply the candidate screen only to hypersonic Mach≥5 witness states; it does
not define low-Mach Task3 behavior. Finite-rate, angular-demand, shielding,
out-of-plane forces, and recovery dynamics are omitted: static sufficiency
does not establish flown survival. Failure of this candidate alone does not
establish every possible surface model infeasible. Obtain independent review
before selecting implementation or invoking the conditional fallback.

Capture actual/intended attack, q/M/CoM, separated moment, extension,
temperature and RCS reserve over time. Intended pitch for the high-speed
aero-descent stage comes from the existing controller expression; do not
invent a new flight target. Samples outside that stage have no intended
entry-screen claim. Preserve the previous invalid and corrected traces.

Follow-up qualification before the impulse screen: the Zhang primary paper
explicitly describes a skewed FRONT hinge. Its low-speed CFD data do not
quantify hypersonic authority. Both exact longitudinal hinges remain a declared
simplification for this candidate, not a measured Ship geometry claim.
The independent review supports rejecting this candidate's static authority;
it does not authorize the full broadside fallback from static evidence alone.

Measurement cycle: attempt1 captures states and timeline; attempt2 fixes
returned-attack/stage observables and adds the directional generous screen;
attempt3 integrates hypothetical compensating angular impulse at every 1/120 s
step along the same observed hypersonic path, excluding post-breakup mass.
These change only measurements, not flight inputs or runtime. All logs retained.
The impulse screen compares with the generous unchanged full RCS budget using
the largest observed RCS arm. It omits other RCS demands and uses all reserve
in the favorable direction. It cannot establish a different fin/gimbal path
infeasible. Obtain a fresh review/new approach before another flight diagnosis.
