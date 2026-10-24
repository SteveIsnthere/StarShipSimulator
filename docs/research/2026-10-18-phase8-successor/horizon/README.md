# Frozen orbital mission failure deadline

Fresh independent high review approved freezing a test-only failure deadline,
not a promise the current controllers succeed: `Tground + TKepler + 900 s`.
At the unchanged 150 km presets/zero rotation this is 11,381.230608843909 s,
ceil to 1,365,748 ticks. Only circularize/deorbit × both models qualify;
other fourteen rows retain 900 s/108,000 ticks. No physical/control/work cap,
case/coverage timeout, worker, retry or production code changed in this task.

One ground revisit allocates firing geometry; one Kepler period shares paid
preparation, finite burn and vacuum transit; 900 s retains terminal allowance.
This is a scheduling envelope, not an analytic upper bound on the PD controller.
The bound/subcircular/apogee hypotheses for a half-period entry transit still
need actual-state checking. All support/circularization ticks must be charged
when the matrix is integrated; these four structural tests alone do not prove it.

Recorded checks, basis `0d87c758` plus the two test files:

- Missing-helper RED: import failure, no tests executed, child exit1.
- Build0 and initial four-test SSR pass, scoped lint0.
- Independent review found finite inputs producing infinite/unsafe deadlines.
- New focused rejection RED failed exactly on MAX_VALUE/negative rotation;
  other three tests were unselected by the explicit name filter.
- Added derived-period/deadline/safe-integer rejection. Corrected build0,
  full four-test SSR pass0, scoped lint0, no retries.
- Initial GREEN's tool outer exit1 differs from saved child0/JSON success;
  preserved without rerun. Corrected-source check also reports outer0.

Independent reviewer `/root/orbital_horizon_review` approved the corrected
bounded test-only implementation; no findings remain. Reviewer ran no workloads
or edits. [Input/result hashes](result.json) preserve both REDs and both versions
of checks. These runs precede the separately implemented model-constructor delta.
No flight, frame, full gate, phase integration or deployment acceptance.
