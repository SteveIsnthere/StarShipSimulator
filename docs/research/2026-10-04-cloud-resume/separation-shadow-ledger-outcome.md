# Separation shadow ledger: finite reserve can be conserved on the recorded path

The single declared arithmetic run completed on Node22 cloud, exit0, with all
core/harness/input hashes unchanged. No flight or mechanical advance occurred.
The positive control reproduced the original paid RCS force and remaining
reserve **bit-exactly on all2437 recorded terminal tick pairs**, from317.358333
to337.658333s. The reference depletion remained336.158333s.

The counterfactual allocator credited currently delivered grid torque, paid
finite RCS through existing rcsControl, then slewed the physical fin position
through existing frontFinActuation for the following tick. On the fixed recorded
path it consumed8.319153014975848s of the actual11.97790223550745s entry reserve
and retained3.6587492205316017s at the original first-plane tick. Its fin target
never granted instantaneous impulse and never exceeded existing angle/slew/RCS
bounds. See declaration, source/bundle hashes, results and output for every tick.

This is evidence for a bounded terminal-only joint allocation trial, **not a
catch proof**. The actual failed body/gimbal/translation path was held fixed;
a changed fin/RCS history would change that path. The recorded late attitude
error still demands unmet torque (maximum373.807MN·m; absolute deficit impulse
260.913MN·m·s). A physically executed controller trial must prove its own finite
path, first-plane eligibility, reserve, material/RNG/source and work bounds.
The coarse-to-live handoff discrepancy remains independently documented.

Fresh independent preimplementation review proposed keeping all ordinary
alignment/utility/ignition outputs unchanged and allowing grid participation
only through an explicit option at the active terminal thrust-allocation call.
No implementation or new flight is claimed here; runtime/tests/config remain
frozen during the parent's complete browser baseline.
