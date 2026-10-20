import React from 'react';
import type { LoyaltyLedgerEntry } from '../../../../shared/growth-contracts';

type ProjectionState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'denied'
  | 'insufficient-data'
  | 'stale'
  | 'unknown-outcome';

export interface LoyaltyLedgerCardProps {
  entries?: unknown;
  projectionState?: ProjectionState;
  source?: string;
  revision?: string | number;
}

const eventLabels: Record<LoyaltyLedgerEntry['eventType'], string> = {
  earned: 'Diperoleh',
  redeemed: 'Ditebus',
  expired: 'Luput',
  reversed: 'Dibalikkan',
  adjustment: 'Pelarasan',
};

const stateMessages: Record<ProjectionState, string> = {
  ready: '',
  loading: 'Sedang memuatkan rekod ganjaran',
  empty: 'Tiada rekod ganjaran',
  error: 'Rekod ganjaran tidak dapat dimuatkan',
  denied: 'Akses tidak dibenarkan',
  'insufficient-data': 'Data rekod ganjaran tidak mencukupi',
  stale: 'Rekod ganjaran mungkin lapuk',
  'unknown-outcome': 'Status rekod ganjaran belum diketahui',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validDate(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= 50
    && Number.isFinite(Date.parse(value));
}

export function parseLoyaltyEntries(value: unknown): LoyaltyLedgerEntry[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const entries: LoyaltyLedgerEntry[] = [];
  for (const entry of value) {
    if (!isRecord(entry)
      || typeof entry.id !== 'string'
      || entry.id.trim().length === 0
      || entry.id.length > 100
      || typeof entry.userId !== 'string'
      || entry.userId.trim().length === 0
      || !Number.isSafeInteger(entry.pointsDelta)
      || !Number.isSafeInteger(entry.monetaryEquivalentSen)
      || typeof entry.eventType !== 'string'
      || !Object.prototype.hasOwnProperty.call(eventLabels, entry.eventType)
      || typeof entry.description !== 'string'
      || entry.description.trim().length === 0
      || entry.description.length > 500
      || !validDate(entry.createdAt)
      || (entry.expiryAt !== undefined && !validDate(entry.expiryAt))
      || (entry.sourceOrderId !== undefined
        && (typeof entry.sourceOrderId !== 'string' || entry.sourceOrderId.length > 100))) {
      return null;
    }
    entries.push({
      id: entry.id,
      userId: entry.userId,
      pointsDelta: entry.pointsDelta as number,
      monetaryEquivalentSen: entry.monetaryEquivalentSen as number,
      eventType: entry.eventType as LoyaltyLedgerEntry['eventType'],
      description: entry.description,
      createdAt: entry.createdAt,
      ...(typeof entry.sourceOrderId === 'string' ? { sourceOrderId: entry.sourceOrderId } : {}),
      ...(typeof entry.expiryAt === 'string' ? { expiryAt: entry.expiryAt } : {}),
    });
  }
  return entries;
}

function formatPoints(points: number): string {
  return points > 0 ? `+${points}` : String(points);
}

export function LoyaltyLedgerCard({
  entries,
  projectionState = 'ready',
  source,
  revision,
}: LoyaltyLedgerCardProps) {
  const parsedEntries = parseLoyaltyEntries(entries);
  const state = projectionState === 'ready' && entries === undefined
    ? 'empty'
    : projectionState === 'ready' && !parsedEntries
      ? 'insufficient-data'
      : projectionState;
  const visible = parsedEntries !== null && (state === 'ready' || state === 'stale');

  return (
    <article
      aria-label="Rekod lejar ganjaran"
      aria-busy={state === 'loading'}
      className="w-full min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Rekod ganjaran loyalty</h3>
          <p className="mt-1 text-sm text-[var(--ui-muted)]">
            Entri kanonik sahaja · baki tidak dikira dalam browser
          </p>
        </div>
        <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-xs">
          Display only
        </span>
      </header>
      {state !== 'ready' && state !== 'stale' && (
        <p role={state === 'error' || state === 'denied' ? 'alert' : 'status'} className="my-4 text-sm">
          {stateMessages[state]}
        </p>
      )}
      {state === 'stale' && <p role="status" className="my-3 text-sm">{stateMessages.stale}</p>}
      {visible && parsedEntries && parsedEntries.length === 0 && (
        <p role="status" className="my-4 text-sm text-[var(--ui-muted)]">Tiada entri ganjaran.</p>
      )}
      {visible && parsedEntries && parsedEntries.length > 0 && (
        <ul className="mt-4 space-y-2">
          {parsedEntries.map((entry) => (
            <li className="min-w-0 rounded-xl bg-[var(--ui-soft)] p-3" key={entry.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{eventLabels[entry.eventType]}</p>
                  <p className="mt-1 break-words text-sm">{entry.description}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">{formatPoints(entry.pointsDelta)} mata</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ui-muted)]">
                <time dateTime={entry.createdAt}>{entry.createdAt}</time>
                {entry.sourceOrderId && <span>Pesanan: {entry.sourceOrderId}</span>}
                {entry.expiryAt && <span>Luput: {entry.expiryAt}</span>}
              </div>
            </li>
          ))}
        </ul>
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
