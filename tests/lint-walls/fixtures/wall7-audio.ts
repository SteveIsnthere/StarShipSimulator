// Wall 7: core/ must not import from audio/. Sound is an output of the
// simulation, never an input to it — SOUND-PLAN § 5.
import { mixer } from '$audio/graph';
import { engineGain } from '../../audio/params';

export function play(): void {
  void mixer;
  void engineGain;
}
