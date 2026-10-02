# Reviewed cycle3 approach fixed before implementation

Intentional Fidelity policy correction under approved Phase6b Task2 known aerodynamic moment and Task3 combined actuator accounting; fresh independent cycle3 ruling retained. Existing runtime is unaccepted, no shipped policy or physical acceptance bound changes.

Hypersonic fin branch: known disturbance demand D=−(bodyAerodynamicAcceleration+offAxisThrustDifferenceAcceleration)*I. Feedback F=(−pitchError/T²−2*angularVelocity/T)*I outsideabs(error)>0.1; F=0 inside. Both fin target solve and residual RCS allocation use D+F. Apply unchanged0.99finblend/slew then subtract achieved signedfinmoment from that total; existing800kN clamp/reserve charge. Finfeedback remains absent inside the explicitly retainedfeedbackdeadzone. Other actuator/lowMachbranches retain existing behavior. No new aero coefficients, pressure gain, authority, mass or fuel.

Watch independent exacttorque witnesses red then green: insidezone actualmoment+RCSmoment=D evenwith nonzeroerror/angularvelocity; varying subthresholdfeedback inputs leave demandunchanged; outsidezone retainsoldfullPDlaw; physicalsaturation/reservecost/achievedslew/cancellation checks retained. Explicitly supersede only unaccepted controller-policy characterization of zero TOTAL RCS insidezone with knownmoment, retaining its feedback suppression property. Build/lint/focused/truth beforeflights.

One operational pair attempt1, then ifneeded fixed8anglepair attempt2, toMach5/failure. Log desiredD/F separately, integratedforces versusnewcommands, intactreserve-crossing and priortracked-versusinitialalignment errors. Attempt3only afterevidence-backedcause/budgetapproach. No luckreruns or lowMachmodel invented.
