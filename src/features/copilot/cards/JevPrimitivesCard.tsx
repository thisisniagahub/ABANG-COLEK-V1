import React from 'react';
import {
  JEV_NOT_COMPUTED_TEXT,
  JEV_UNKNOWN_TEXT,
  projectJevConfidence,
  projectJevNoul,
  projectJevProbabilities,
  projectJevScore,
  type JevDimensionProjection,
  type JevNoulProjection,
  type JevScoreProjection,
} from './jevValueSemantics';

type ProjectionState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'denied'
  | 'insufficient-data'
  | 'stale'
  | 'unknown-outcome';

export interface JevPrimitivesCardProps {
  /** Dimensi JEV (choice) — `confidence` / `probabilities` boleh `null`. */
  dimensions?: Record<string, JevDimensionProjection>;
  /** Skor JEV — `score` / `confidence` boleh `null`. */
  scores?: Record<string, JevScoreProjection>;
  /** Noul JEV — `probability` / `isAffirmative` boleh `null`. */
  nouls?: Record<string, JevNoulProjection>;
  projectionState?: ProjectionState;
  source?: string;
  revision?: string | number;
}

const projectionMessages: Record<ProjectionState, string> = {
  ready: '',
  loading: 'Sedang dimuatkan',
  empty: 'Tiada unjuran JEV',
  error: 'Ralat memuatkan unjuran JEV',
  denied: 'Akses tidak dibenarkan',
  'insufficient-data': 'Data JEV tidak mencukupi',
  stale: 'Data mungkin lapuk',
  'unknown-outcome': 'Keputusan belum diketahui',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function entries(value: Record<string, unknown> | undefined): [string, unknown][] {
  return value ? Object.entries(value) : [];
}

function label(name: string): string {
  return name.replace(/[_-]+/g, ' ').replace(/^\w/, (character) => character.toUpperCase());
}

/**
 * Kad paparan sahaja untuk primitif JEV.
 *
 * Setiap medan yang belum dikira (`null`) dipaparkan sebagai "Tidak dikira"
 * atau "Tidak diketahui" — bukan `0`, `0%`, `false`, atau bar kosong. Kad
 * tidak pernah crashed pada `null` atau input yang rosak.
 */
export function JevPrimitivesCard({
  dimensions,
  scores,
  nouls,
  projectionState = 'ready',
  source,
  revision,
}: JevPrimitivesCardProps) {
  const dimensionEntries = entries(dimensions as Record<string, unknown> | undefined);
  const scoreEntries = entries(scores as Record<string, unknown> | undefined);
  const noulEntries = entries(nouls as Record<string, unknown> | undefined);
  const hasContent = dimensionEntries.length + scoreEntries.length + noulEntries.length > 0;
  const state = projectionState === 'ready' && !hasContent ? 'insufficient-data' : projectionState;
  const visible = hasContent && (state === 'ready' || state === 'stale');

  return (
    <article
      aria-label="Primitif JEV"
      aria-busy={state === 'loading'}
      className="w-full min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-base font-semibold">Primitif JEV</h3>
          <p className="mb-0 mt-1 text-sm text-[var(--ui-muted)]">
            Paparan sahaja · nilai yang tidak dikira ditunjukkan secara jujur
          </p>
        </div>
        <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-xs">
          Display only
        </span>
      </header>

      {state !== 'ready' && (
        <p className="my-4 text-sm" role={state === 'error' || state === 'denied' ? 'alert' : 'status'}>
          {projectionMessages[state]}
        </p>
      )}

      {visible && (
        <div className="mt-4 space-y-4">
          {dimensionEntries.length > 0 && (
            <section aria-label="Dimensi JEV">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)]">Dimensi</h4>
              <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {dimensionEntries.map(([name, raw]) => {
                  const dimension = isRecord(raw) ? raw : {};
                  const confidence = projectJevConfidence(dimension.confidence);
                  const probabilities = projectJevProbabilities(dimension.probabilities);
                  const value = typeof dimension.value === 'string' && dimension.value.trim().length > 0
                    ? dimension.value
                    : JEV_UNKNOWN_TEXT;
                  return (
                    <div className="min-w-0 rounded-2xl bg-[var(--ui-soft)] p-3" key={`dimension-${name}`}>
                      <dt className="break-words text-xs text-[var(--ui-muted)]">{label(name)}</dt>
                      <dd className="mb-0 mt-1 break-words text-sm font-medium">{value}</dd>
                      <p className="mb-0 mt-1 text-xs text-[var(--ui-muted)]">
                        Keyakinan: {confidence.text}
                      </p>
                      <p className="mb-0 mt-1 text-xs text-[var(--ui-muted)]">
                        Kebarangkalian: {probabilities.state === 'not-computed'
                          ? JEV_NOT_COMPUTED_TEXT
                          : probabilities.entries.map((entry) => `${entry.label} ${entry.text}`).join(' · ')}
                      </p>
                    </div>
                  );
                })}
              </dl>
            </section>
          )}

          {scoreEntries.length > 0 && (
            <section aria-label="Skor JEV">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)]">Skor</h4>
              <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {scoreEntries.map(([name, raw]) => {
                  const score = isRecord(raw) ? raw : {};
                  const scoreProjection = projectJevScore(score.score);
                  const confidence = projectJevConfidence(score.confidence);
                  return (
                    <div className="min-w-0 rounded-2xl bg-[var(--ui-soft)] p-3" key={`score-${name}`}>
                      <dt className="break-words text-xs text-[var(--ui-muted)]">{label(name)}</dt>
                      <dd className="mb-0 mt-1 break-words text-sm font-medium">{scoreProjection.text}</dd>
                      <p className="mb-0 mt-1 text-xs text-[var(--ui-muted)]">Keyakinan: {confidence.text}</p>
                      {typeof score.label === 'string' && score.label.trim().length > 0 && (
                        <p className="mb-0 mt-1 text-xs text-[var(--ui-muted)]">{score.label}</p>
                      )}
                    </div>
                  );
                })}
              </dl>
            </section>
          )}

          {noulEntries.length > 0 && (
            <section aria-label="Jawapan noul JEV">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)]">Noul</h4>
              <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {noulEntries.map(([name, raw]) => {
                  const noul = isRecord(raw) ? raw : {};
                  const projection = projectJevNoul(noul.isAffirmative, noul.probability);
                  return (
                    <div className="min-w-0 rounded-2xl bg-[var(--ui-soft)] p-3" key={`noul-${name}`}>
                      <dt className="break-words text-xs text-[var(--ui-muted)]">{label(name)}</dt>
                      <dd className="mb-0 mt-1 break-words text-sm font-medium">{projection.text}</dd>
                      <p className="mb-0 mt-1 text-xs text-[var(--ui-muted)]">
                        Kebarangkalian: {projection.probability.text}
                      </p>
                    </div>
                  );
                })}
              </dl>
            </section>
          )}
        </div>
      )}

      {(source || revision !== undefined) && (
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--ui-border)] pt-3 text-xs text-[var(--ui-muted)]">
          {source && <div><dt className="inline font-medium">Sumber: </dt><dd className="inline break-all">{source}</dd></div>}
          {revision !== undefined && <div><dt className="inline font-medium">Revisi: </dt><dd className="inline">{revision}</dd></div>}
        </dl>
      )}
    </article>
  );
}

export default JevPrimitivesCard;
