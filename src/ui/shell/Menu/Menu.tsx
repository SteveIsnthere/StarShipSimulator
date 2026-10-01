/**
 * The menu: a modal over the paused flight (the session pauses while any layer
 * is open). Ported from Menu.svelte and InfoView.svelte.
 *
 * One kit Dialog serves three layers: 'menu' shows the four sections, 'guide'
 * and 'about' show those views in its place. Swapping content inside one open
 * dialog keeps focus trapped throughout and returns it, on the final close, to
 * whatever opened the menu.
 *
 * ESCAPE IS THE SESSION'S, not the dialog's (closeOnEscape off). The session
 * closes the top layer on Escape and opens the menu when none is open; were
 * Radix to close the dialog too, the session's own handler would then see no
 * layer and open the menu straight back up.
 *
 * The form lives here rather than in the sheet, so what was typed survives
 * closing the menu and visiting the guide, as it did in Svelte.
 */
import { useCallback, useState } from 'react';
import { Dialog } from '@ui/Dialog';
import { EMPTY_FIELDS, type EditorFields } from '$app/menu';
import { useSession, useSessionState } from '../session-context';
import { InfoView, type InfoLayer } from './InfoView';
import { MenuSheet } from './MenuSheet';

export function Menu() {
  const session = useSession();
  const layer = useSessionState((s) => s.layer);
  const [fields, setFields] = useState<EditorFields>(EMPTY_FIELDS);
  const [returnFrom, setReturnFrom] = useState<InfoLayer | null>(null);

  const info: InfoLayer | null = layer === 'guide' || layer === 'about' ? layer : null;
  const open = layer === 'menu' || info !== null;
  // A fresh opening starts at the top, not where the last visit's guide left it.
  if (!open && returnFrom !== null) setReturnFrom(null);

  const close = useCallback(() => session.closeLayer(), [session]);
  const showInfo = useCallback((view: InfoLayer) => session.openLayer(view), [session]);
  const back = useCallback(() => {
    setReturnFrom(info);
    session.openLayer('menu');
  }, [info, session]);

  return (
    <Dialog
      open={open}
      onClose={close}
      closeOnEscape={false}
      testId={info === null ? 'menu' : 'info-view'}
      ariaLabel={info === null ? 'Menu' : info === 'guide' ? 'Guide' : 'About'}
      maxWidth="840px"
    >
      {info === null ? (
        <MenuSheet
          fields={fields}
          onFieldsChange={setFields}
          onShowInfo={showInfo}
          onClose={close}
          returnFrom={returnFrom}
        />
      ) : (
        <InfoView view={info} onBack={back} onClose={close} />
      )}
    </Dialog>
  );
}
