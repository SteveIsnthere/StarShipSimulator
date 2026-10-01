/**
 * One of the menu's four sections: a heading the tab strip can land focus on,
 * a line saying what the section is for, and its content.
 */
import type { ReactNode } from 'react';

export type SectionId = 'fly' | 'setup' | 'settings' | 'about';

/** The tabs, in order (docs/design/ia.md, "The menu"). */
export const SECTIONS: readonly { readonly id: SectionId; readonly label: string }[] = [
  { id: 'fly', label: 'Fly' },
  { id: 'setup', label: 'Flight setup' },
  { id: 'settings', label: 'Settings' },
  { id: 'about', label: 'About' },
];

export interface MenuSectionProps {
  id: SectionId;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}

export function MenuSection({ id, title, intro, children }: MenuSectionProps) {
  const headingId = `menu-section-${id}`;
  return (
    <section
      data-menu-section={id}
      aria-labelledby={headingId}
      className="border-b border-ui-line-muted py-6 last:border-b-0"
    >
      <h2 id={headingId} tabIndex={-1} className="font-tight text-[17px] font-semibold text-ui-fg">
        {title}
      </h2>
      {intro && <p className="mt-1 max-w-[60ch] text-[13px] leading-5 text-ui-muted">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
