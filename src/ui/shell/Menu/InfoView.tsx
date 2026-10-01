/**
 * The guide and the about view, shown in the menu's dialog in place of the
 * menu (layers 'guide' and 'about'). Ported from InfoView.svelte.
 *
 * `info-close` goes back to the menu, as closing the Svelte info sheet
 * uncovered the menu beneath it (tests/e2e/parity.spec.ts presses About right
 * after closing the guide). The header's close button closes everything.
 */
import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@ui/Button';
import { DialogBody, DialogHeader } from '@ui/Dialog';
import { AboutContent } from './AboutContent';
import { GuideContent } from './GuideContent';

export type InfoLayer = 'guide' | 'about';

export interface InfoViewProps {
  view: InfoLayer;
  onBack: () => void;
  onClose: () => void;
}

export function InfoView({ view, onBack, onClose }: InfoViewProps) {
  const back = useRef<HTMLButtonElement>(null);

  // The button that opened this view has gone with the menu; focus lands here instead.
  useEffect(() => {
    back.current?.focus({ preventScroll: true });
  }, [view]);

  return (
    <>
      <DialogHeader
        title={view === 'guide' ? 'Guide' : 'About'}
        onClose={onClose}
        trailing={
          <Button
            ref={back}
            type="button"
            variant="ghost"
            size="sm"
            data-testid="info-close"
            data-gp-initial
            aria-label="Back to menu"
            onClick={onBack}
          >
            <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>Menu</span>
          </Button>
        }
      />
      <DialogBody>
        <article className="mx-auto w-full max-w-[44rem] pb-6 text-[14px] leading-6 text-ui-muted">
          {view === 'guide' ? <GuideContent /> : <AboutContent />}
        </article>
      </DialogBody>
    </>
  );
}
