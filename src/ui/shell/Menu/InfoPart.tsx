/** One titled part of the guide or the about view. */
import type { ReactNode } from 'react';

export function InfoPart({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-ui-line-muted py-5 last:border-b-0">
      <h3 className="mb-3 font-tight text-[15px] font-semibold text-ui-fg">{title}</h3>
      {children}
    </section>
  );
}
