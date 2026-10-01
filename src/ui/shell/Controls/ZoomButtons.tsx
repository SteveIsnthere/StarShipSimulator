/**
 * The on-screen zoom pair (2021's index.html:120). The camera's own; nothing
 * to light. `className` replaces the square-control look where the pair sits
 * in the phone's tab bar.
 */
import { useSession } from '../session-context';
import { SQUARE } from './styles';

export function ZoomButtons({ className = SQUARE }: { className?: string }) {
  const session = useSession();
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label="Zoom out"
        data-testid="zoom-out"
        onClick={() => session.zoom(-1)}
      >
        <span aria-hidden="true">&minus;</span>
      </button>
      <button
        type="button"
        className={className}
        aria-label="Zoom in"
        data-testid="zoom-in"
        onClick={() => session.zoom(1)}
      >
        <span aria-hidden="true">+</span>
      </button>
    </>
  );
}
