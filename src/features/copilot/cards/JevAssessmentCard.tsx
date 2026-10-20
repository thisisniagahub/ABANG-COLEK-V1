import { projectJevConfidence } from './jevValueSemantics';

type ProjectionState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'denied'
  | 'insufficient-data'
  | 'stale'
  | 'unknown-outcome';

export interface JevAssessmentCardProps {
  issueClass?: 'LEAKAGE' | 'CAP_DEFECT' | 'TASTE_ANOMALY' | 'LABEL_MISPRINT';
  rootCause?: 'UNDETERMINED' | 'SUPPLIER_BATCH_CONTAMINATION' | 'PACKAGING_CRIMP_FAILURE';
  sopAction?: string;
  evaluationState?: 'reviewed' | 'pending_quarantine';
  evidencePhotoRequired?: boolean;
  confidenceScore?: number | null;
  projectionState?: ProjectionState;
  message?: string;
  source?: string;
  revision?: string | number;
}

const projectionMessages: Record<ProjectionState, string> = {
  ready: '',
  loading: 'Sedang dimuatkan',
  empty: 'Tiada data penilaian',
  error: 'Ralat memuatkan penilaian',
  denied: 'Akses tidak dibenarkan',
  'insufficient-data': 'Data tidak mencukupi untuk penilaian',
  stale: 'Data mungkin lapuk',
  'unknown-outcome': 'Keputusan belum diketahui',
};

const issueLabels = {
  LEAKAGE: 'Kebocoran',
  CAP_DEFECT: 'Kecacatan penutup',
  TASTE_ANOMALY: 'Anomali rasa',
  LABEL_MISPRINT: 'Kesilapan cetakan label',
} as const;

const rootCauseLabels = {
  UNDETERMINED: 'Belum disahkan',
  SUPPLIER_BATCH_CONTAMINATION: 'Pencemaran kelompok pembekal',
  PACKAGING_CRIMP_FAILURE: 'Kegagalan kelim pembungkusan',
} as const;

function Provenance({ source, revision }: Pick<JevAssessmentCardProps, 'source' | 'revision'>) {
  if (!source && revision === undefined) return null;

  return (
    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--ui-border)] pt-3 text-xs text-[var(--ui-muted)]">
      {source && <div><dt className="inline font-medium">Sumber: </dt><dd className="inline break-all">{source}</dd></div>}
      {revision !== undefined && <div><dt className="inline font-medium">Revisi: </dt><dd className="inline">{revision}</dd></div>}
    </dl>
  );
}

export function JevAssessmentCard(props: JevAssessmentCardProps) {
  const projectionState = props.projectionState ?? 'ready';
  const hasAssessment =
    props.issueClass !== undefined &&
    props.rootCause !== undefined &&
    props.sopAction !== undefined &&
    props.sopAction.trim() !== '' &&
    props.evaluationState !== undefined &&
    props.evidencePhotoRequired !== undefined;
  const state = projectionState === 'ready' && !hasAssessment
    ? 'insufficient-data'
    : projectionState;
  const hasVisibleAssessment = hasAssessment && (state === 'ready' || state === 'stale');
  // BL-24/BL-27: `confidenceScore` boleh `null` (tidak dikira). `null` mesti
  // dipaparkan sebagai "tidak dikira" — bukan 0% dan bukan keyakinan sifar.
  const calibratedConfidence = projectJevConfidence(props.confidenceScore);

  return (
    <article
      aria-label="Penilaian JEV"
      aria-busy={state === 'loading'}
      className="overflow-hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-base font-semibold">Penilaian JEV</h3>
          <p className="mb-0 mt-1 text-sm text-[var(--ui-muted)]">Paparan sahaja · semakan manusia kekal diperlukan</p>
        </div>
        <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-xs">Display only</span>
      </header>

      {state !== 'ready' && (
        <p className="my-4 text-sm" role={state === 'error' || state === 'denied' ? 'alert' : 'status'}>
          {props.message?.trim() || projectionMessages[state]}
        </p>
      )}

      {hasVisibleAssessment && (
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
            <dt className="text-xs text-[var(--ui-muted)]">Kelas isu</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">{issueLabels[props.issueClass!] ?? 'Tidak diketahui'}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
            <dt className="text-xs text-[var(--ui-muted)]">Punca</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">{rootCauseLabels[props.rootCause!] ?? 'Tidak diketahui'}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
            <dt className="text-xs text-[var(--ui-muted)]">Keadaan penilaian</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">
              {props.evaluationState === 'reviewed'
                ? 'Disemak'
                : props.evaluationState === 'pending_quarantine' ? 'Kuarantin menunggu' : 'Tidak diketahui'}
            </dd>
          </div>
          <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
            <dt className="text-xs text-[var(--ui-muted)]">Bukti foto diperlukan</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">{props.evidencePhotoRequired ? 'Ya' : 'Tidak'}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--ui-soft)] p-3 sm:col-span-2">
            <dt className="text-xs text-[var(--ui-muted)]">Tindakan SOP</dt>
            <dd className="mb-0 mt-1 whitespace-pre-wrap text-sm">{props.sopAction}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--ui-soft)] p-3 sm:col-span-2">
            <dt className="text-xs text-[var(--ui-muted)]">Keyakinan berkalibrasi</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">
              {calibratedConfidence.text}
              {calibratedConfidence.state === 'not-computed' && (
                <span className="ml-1 text-xs font-normal text-[var(--ui-muted)]">
                  Tiada model keyakinan berkalibrasi untuk penilaian ini.
                </span>
              )}
            </dd>
          </div>
        </dl>
      )}

      <Provenance source={props.source} revision={props.revision} />
    </article>
  );
}
