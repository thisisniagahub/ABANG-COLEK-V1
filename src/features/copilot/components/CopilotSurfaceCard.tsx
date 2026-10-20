import React, { type ReactNode } from 'react';

export interface CopilotSurfaceCardProps {
  id: string;
  title: string;
  description?: string;
  status?: ReactNode;
  children: ReactNode;
}

export function CopilotSurfaceCard({
  id,
  title,
  description,
  status,
  children,
}: CopilotSurfaceCardProps) {
  const headingId = `${id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64)}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className="w-full min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 text-[var(--ui-text)] shadow-[var(--ui-shadow)] sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-[var(--ui-muted)]">{description}</p>}
        </div>
        {status}
      </header>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}
