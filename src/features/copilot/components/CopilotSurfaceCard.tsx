import React, { type ReactNode } from 'react';

export interface CopilotSurfaceCardProps {
  id: string;
  title: string;
  description?: string;
  status?: ReactNode;
  theme?: 'light' | 'dark' | 'system';
  reducedMotion?: boolean;
  children: ReactNode;
}

export function CopilotSurfaceCard({
  id,
  title,
  description,
  status,
  theme = 'system',
  reducedMotion = false,
  children,
}: CopilotSurfaceCardProps) {
  const headingId = `${id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64)}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      data-theme={theme}
      data-reduced-motion={reducedMotion ? 'reduce' : 'no-preference'}
      className={`w-full min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 text-[var(--ui-text)] shadow-[var(--ui-shadow)] motion-reduce:transition-none sm:p-6 ${reducedMotion ? 'transition-none' : 'transition-colors duration-150'}`}
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
