/** Reproduce scalar measurements; runs actual presets and paid step(). */
import { ascentMaxQ, reentryPeakHeating } from '../../../../tests/reference/flight-probes';
console.log(JSON.stringify({ascent:ascentMaxQ(),reentry:reentryPeakHeating()},null,2));
