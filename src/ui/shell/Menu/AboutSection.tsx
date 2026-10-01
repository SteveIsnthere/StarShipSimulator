/**
 * About: what this is, in two sentences, and the way into the guide and the
 * version notes (each a full view of its own, layers 'guide' and 'about').
 *
 * Coming back from either lands focus on the button that opened it.
 */
import { useEffect, useRef } from 'react';
import { Button } from '@ui/Button';
import type { InfoLayer } from './InfoView';

export interface AboutSectionProps {
  onShowInfo: (view: InfoLayer) => void;
  /** The view the player has just come back from, if any. */
  returnFrom: InfoLayer | null;
}

export function AboutSection({ onShowInfo, returnFrom }: AboutSectionProps) {
  const guide = useRef<HTMLButtonElement>(null);
  const about = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (returnFrom === null) return;
    (returnFrom === 'guide' ? guide : about).current?.focus({ preventScroll: true });
  }, [returnFrom]);

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[60ch] text-[13px] leading-5 text-ui-fg">
        Starship Simulator is an unofficial fan simulator. It is not made, endorsed or reviewed by
        SpaceX.
      </p>
      <p className="max-w-[60ch] text-[13px] leading-5 text-ui-muted">
        The flight model is the 2021 original&rsquo;s physics, ported line by line and held to recorded
        trajectories so it cannot drift. Orbits fly on planet-centred gravity, and the flight runs on a
        fixed timestep, so it is the same on every device.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button ref={guide} type="button" data-testid="menu-guide" onClick={() => onShowInfo('guide')}>
          Guide
        </Button>
        <Button ref={about} type="button" data-testid="menu-about" onClick={() => onShowInfo('about')}>
          Version and source
        </Button>
      </div>
    </div>
  );
}
