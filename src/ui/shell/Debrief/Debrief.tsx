/**
 * The end of a flight: the debrief card while there is one, and the restart
 * when the flight is over without one. Both live here so the flight screen
 * renders one surface for "the flight ended".
 */
import { useSessionState } from '../session-context';
import { DebriefCard } from './DebriefCard';
import { RestartButton } from '../RestartButton';

export { RestartButton };

export function Debrief() {
  const card = useSessionState((s) => s.debrief);
  return (
    <>
      {card && <DebriefCard card={card} />}
      <RestartButton />
    </>
  );
}
