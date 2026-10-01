/**
 * The menu's four sections under one tab strip: Fly, Flight setup, Settings,
 * About (docs/design/ia.md, "The menu").
 *
 * ONE SCROLLING SHEET, NOT HIDDEN PANELS, and that is the e2e contract's doing:
 * the suite drives controls from different sections without choosing a tab
 * first (it toggles a setting and then picks a scenario, or opens the guide
 * the moment the menu opens), and Playwright cannot press what is hidden. So
 * every section is laid out, the tab strip jumps to one, and the tab follows
 * the player's own scrolling. A jump pins its tab until the player scrolls by
 * hand, so a short last section that cannot reach the top still shows as the
 * one chosen.
 *
 * Choosing a scenario fills the form and jumps to Flight setup with Start
 * flight focused: Enter flies it, Tab goes back to edit it.
 */
import { useEffect, useRef, useState, type UIEvent } from 'react';
import { flushSync } from 'react-dom';
import { DialogBody, DialogHeader } from '@ui/Dialog';
import { TabStrip } from '@ui/TabStrip';
import { EMPTY_FIELDS, fieldsFromPreset, type EditorFields } from '$app/menu';
import { getScenario, type ScenarioPreset } from '$core/scenarios';
import { useSession } from '../session-context';
import { AboutSection } from './AboutSection';
import { FlySection } from './FlySection';
import type { InfoLayer } from './InfoView';
import { MenuSection, SECTIONS, type SectionId } from './MenuSection';
import { SettingsSection } from './SettingsSection';
import { SetupSection } from './SetupSection';

export interface MenuSheetProps {
  fields: EditorFields;
  onFieldsChange: (fields: EditorFields) => void;
  onShowInfo: (view: InfoLayer) => void;
  onClose: () => void;
  /** The guide or about view the player has just come back from, if any. */
  returnFrom: InfoLayer | null;
}

/** px below the top of the scroll area that a section must cross to become current. */
const CURRENT_LINE = 48;

function sectionElement(root: HTMLElement | null, id: SectionId): HTMLElement | null {
  return root?.querySelector<HTMLElement>(`[data-menu-section="${id}"]`) ?? null;
}

/** The section the player is reading: the last one whose top is above the line, or the last of all at the bottom. */
function sectionInView(body: HTMLElement): SectionId {
  if (body.scrollTop + body.clientHeight >= body.scrollHeight - 2) return SECTIONS[SECTIONS.length - 1]!.id;
  const line = body.getBoundingClientRect().top + CURRENT_LINE;
  let current: SectionId = SECTIONS[0]!.id;
  for (const { id } of SECTIONS) {
    const top = sectionElement(body, id)?.getBoundingClientRect().top;
    if (top !== undefined && top <= line) current = id;
  }
  return current;
}

export function MenuSheet({ fields, onFieldsChange, onShowInfo, onClose, returnFrom }: MenuSheetProps) {
  const session = useSession();
  const [active, setActive] = useState<SectionId>(returnFrom === null ? 'fly' : 'about');
  const sheet = useRef<HTMLDivElement>(null);
  const pinned = useRef<SectionId | null>(null);
  const start = useRef<HTMLButtonElement>(null);

  const reveal = (id: SectionId) => {
    pinned.current = id;
    setActive(id);
    sectionElement(sheet.current, id)?.scrollIntoView({ block: 'start' });
  };

  const jump = (id: SectionId) => {
    reveal(id);
    sectionElement(sheet.current, id)?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };

  const pick = (preset: ScenarioPreset) => {
    // Rendered before focusing: Start flight may be disabled by the form being replaced.
    flushSync(() => onFieldsChange(fieldsFromPreset(preset)));
    reveal('setup');
    start.current?.focus({ preventScroll: true });
  };

  // Back from the guide or about: the About section, where the player left.
  useEffect(() => {
    if (returnFrom === null) return;
    pinned.current = 'about';
    sectionElement(sheet.current, 'about')?.scrollIntoView({ block: 'start' });
  }, [returnFrom]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const body = event.target;
    if (pinned.current !== null || !(body instanceof HTMLElement) || !body.hasAttribute('data-gp-body')) return;
    setActive(sectionInView(body));
  };
  // Any scrolling the player does by hand hands the tab back to the scroll position.
  const unpin = () => {
    pinned.current = null;
  };

  const basedOn = fields.basedOn ? getScenario(fields.basedOn)?.name : undefined;

  return (
    <>
      <DialogHeader
        title="Menu"
        onClose={onClose}
        trailing={<span className="text-[12px] text-ui-muted">Flight paused</span>}
      />
      <TabStrip variant="bar" aria-label="Menu sections" className="shrink-0">
        {SECTIONS.map(({ id, label }) => (
          <TabStrip.Tab key={id} active={active === id} initial={active === id} onClick={() => jump(id)}>
            {label}
          </TabStrip.Tab>
        ))}
      </TabStrip>
      <div
        ref={sheet}
        className="flex min-h-0 flex-1 flex-col"
        onScrollCapture={onScroll}
        onWheelCapture={unpin}
        onTouchStartCapture={unpin}
        onPointerDownCapture={unpin}
        onKeyDownCapture={unpin}
      >
        <DialogBody>
          <MenuSection
            id="fly"
            title="Fly"
            intro="Choose where the flight starts. It fills Flight setup; nothing flies until you press Start flight."
          >
            <FlySection selectedId={fields.basedOn} onPick={pick} />
          </MenuSection>
          <MenuSection
            id="setup"
            title="Flight setup"
            intro={
              basedOn
                ? `Starting from ${basedOn}. A blank field keeps the current flight's value.`
                : "A blank field keeps the current flight's value."
            }
          >
            <SetupSection
              fields={fields}
              onFieldsChange={onFieldsChange}
              onClear={() => onFieldsChange({ ...EMPTY_FIELDS })}
              onStart={() => session.configure(fields)}
              startRef={start}
            />
          </MenuSection>
          <MenuSection id="settings" title="Settings">
            <SettingsSection />
          </MenuSection>
          <MenuSection id="about" title="About">
            <AboutSection onShowInfo={onShowInfo} returnFrom={returnFrom} />
          </MenuSection>
        </DialogBody>
      </div>
    </>
  );
}
