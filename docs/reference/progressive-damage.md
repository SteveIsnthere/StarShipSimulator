# Progressive damage

The V3 model uses a deterministic reduced-order engineering surrogate. It models finite heating, elastic loss of control effectiveness, conservative attachment loss, and the motion of detached hardware. It does not predict proprietary Starship fracture or reproduce a particular accident.

The source and uncertainty ledger is [the V3 audit](../research/2026-10-03-vehicle-realism/v3-source-audit.md); material equations and domains are in [the damage audit](../research/2026-10-03-vehicle-realism/damage-code-audit.md). The independent review and its disposition are [recorded here](../research/2026-10-03-vehicle-realism/pro-v3-review.md). Phase 8 release acceptance remains governed by its open plan.

## Ownership and geometry

`core/physics/vehicle-components.ts` partitions the existing dry mass into eight Ship components or seven booster components. Each has a positive mass, centre of mass and intrinsic inertia. Their summed mass, first moments and parallel-axis second moments reproduce the intact vehicle. No visual detail adds mass a second time.

The partition includes two hull sections, the nose or integrated hot-stage crown, the engine support and the physical control surfaces. The engine support owns the whole engine package; its absence removes engine capability. This is a bounded surrogate, not an independent structural model of every engine mount.

`DamageState` owns attachment flags, thermal nodes, loaded control angles, irreversible failure reasons and twelve debris slots per body. It also holds a monotonically increasing ownership revision and the first terminal event. Clones own all mutable arrays. The immutable partition and material tables are shared.

Physical hinge stations come from the selected vehicle definition. The three booster grids use the authored V3 station at 64.8 m above the engine plane. This is a photo-supported estimate, not surveyed geometry. The RCS and catch-lug stations remain separate inherited estimates. The renderer consumes the physical component identity and hinge; it cannot decide when a part breaks.

## Heat and attachment strength

Root steel uses NIST 304 stainless specific heat, enthalpy and conductivity. The cold fit, bridge and hot fit have explicit tested domains. Modulus and proof stress use the published Monash 304 coupon table between 100 and 900 °C, with the 100 °C values held below that range. Above 900 °C, attachment capability is unavailable for a reported material-domain reason; the model does not extrapolate a fracture curve.

The root is an authored hollow rectangular beam with dimensions proportional to vehicle diameter and 4 mm wall thickness. Its section area, bending inertia, section modulus and mass follow from that geometry. Applied aerodynamic force and elastic rotation are solved together. Temperature reduces stiffness, changing the delivered angle and aerodynamic force before failure. Exceeding the tabulated proof stress latches conservative connection loss. Proof stress is not fracture stress; creep, plastic strain accumulation and fatigue are not simulated.

Ship roots have a two-cell LI-900 TPS surrogate using the cited NASA material data. Exposed booster roots do not receive an invented heat shield. Finite root and hull heat capacities, radiation and conduction exchange energy through explicit physical areas and half-length conduction paths. The bounded thermal subdivision follows a conservative transport stability bound; numerical exhaustion is an error, not a fabricated vehicle failure. Invalid material-domain energy is retained for diagnosis rather than clamped away.

A warm but attached surface can recover elastic stiffness when it cools. Detached hardware never reattaches. Detached pieces currently retain their thermal state: further debris heating and cooling are outside this model.

## Mechanical step and loss

The physical interval pays ignition, propellant, thrust and motion before endpoint thermal evolution and attachment loss. An endpoint detachment cannot cancel impulse already delivered. The next interval uses the surviving mass, centre of mass, inertia, control area and engine support.

Public pose and velocity describe the hull reference point. Translation integrates the physical centre of mass, then transforms back to that reference using the rigid-body velocity and acceleration relations. Both axial and transverse COM offsets matter after asymmetric loss. Attached missions integrate aggregate mass properties and constraints; failure of one body does not automatically destroy its healthy partner.

`flight-mass-query.ts` provides nonmutating canonical retained properties to guidance. Landing sizing uses retained dry mass as the fuel floor and cannot credit absent support or failed planned engines. The mandatory three-centre booster catch policy remains unchanged.

A detached component inherits its world position, orientation, angular velocity and rigid-body point velocity. No artistic kick is added. Tests reconstruct linear momentum, angular momentum and kinetic energy around the release. Large pieces advance under gravity and dissipative drag; conservative enclosing-sphere ground contact is inelastic. There is no secondary fracture, aerodynamic lift, mutual collision or plume-driven impulse on debris.

## Terminal breakup

The original 50 kPa, 1533 K surface-temperature and 13g guards remain independent terminal checks. A contact failure records the incoming motion before collision can erase it. The first terminal payload records pose, velocity, angular rate, retained dry and propellant mass, and the released-material momentum and energy ledger.

Terminal breakup transfers every remaining dry component to physical debris and releases the retained propellant into the event ledger. Fuel is not a visible particle cloud or an additional simulated rigid body; its chemical explosion energy is not modeled. The removed parent owns no dry mass, propellant, thrust or control authority. The failure interval retains its paid force record; later terminal intervals clear propulsion and continue debris motion. Repeated steps do not emit duplicate pieces.

The scene renders the same original meshes at their detached physical poses. Follow camera frames the mass-weighted debris centre and its physical extent. The vanished hull supplies neither a flight-path marker nor a whole-vehicle heat distortion. Camera movement does not alter simulation state.

## Forecast provenance

A physical ownership change invalidates booster work and cutoff plans from an older revision. Continuous heating within a revision is checked by a continuing independent source observer at the actual pre-policy phase. Explicit planner inputs are replayed as phase-stamped post-step events; the observer never copies current physical state to repair a mismatch.

A rejected lineage cannot regain cutoff authority. Its bounded job can finish, after which a new lineage may start from current state. The observer shares the four-advance live-step budget with search. Frozen calculator fixtures have no right to command a live cutoff without verified source lineage.

This check proves continuity of the live source and its modeled heating. It does not certify exact coarse candidate trajectories, thermal safety along every candidate prefix, or a catch by itself. Publication still requires actual fine-step terminal replay, positive remaining fuel and a cutoff that lies in the future.

## Evidence and limitations

Injected unit-boundary cases establish mechanics and failure semantics. They are distinct from the natural exposure witness, which starts cold, heats through actual flight and demonstrates both applied elastic control reduction and in-domain proof loss below the global guards. That witness is an off-nominal editor flight; it is not a plausible Super Heavy orbital mission.

The material curves are published surrogate data. Component mass distribution, root geometry, emissivity, TPS placement and many V3 control stations remain explicit engineering assumptions. Successful simulation outcomes do not validate them. The implementation must retain source uncertainty, timestep refinement, conservation, bounded work and current flight acceptance separately.
