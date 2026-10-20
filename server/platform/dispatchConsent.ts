/**
 * PD-01 — Pintasan kebenaran penghantaran (dispatch consent gate).
 *
 * MASALAH YANG DISELESAIKAN
 * `CampaignAsset.consent` (`shared/platform-contracts.ts`) ialah TEKS BEBAS.
 * Teks bebas bukan kebenaran: ia tidak boleh dibaca, ditafsirkan atau
 * ditiru sebagai "penerima telah bersetuju". Sebaliknya, platform ini
 * mempunyai dua sumber kebenaran yang sebenar:
 *
 *   1. `notification_preferences` — status opt-out penerima
 *      (`inAppEnabled` + `topics`).
 *   2. `asset_consents` — kebenaran berstruktur bagi satu aset kempen
 *      (kontrak: `shared/pd-contracts.ts`).
 *
 * Pintasan ini menolak penghantaran dengan SECARA TEPLAS:
 *   - `DISPATCH_OPTED_OUT` — keutamaan opt-out penerima meliputi channel/topic.
 *   - `ASSET_CONSENT_NOT_GRANTED` — status kebenaran aset bukan `granted`
 *     (termasuk `denied`, `unknown`, dan TIADA rekod).
 *
 * "Tiada rekod" bermaksud `unknown`, dan `unknown` BUKAN kebenaran.
 *
 * MEDAN WARISAN
 * `CampaignAsset.consent` (teks) TIDAK PERNAH digunakan sebagai kebenaran
 * oleh modul ini. Ia hanya dilaporkan sebagai `legacyConsentTextIsNotConsent`.
 */

import type { NotificationTopic } from '../../shared/operation-amendment-contracts';
import type {
  AssetConsentRecord,
  ConsentState,
  DispatchConsentDetail,
  DispatchConsentOutcome,
  DispatchConsentReasonCode,
  DispatchConsentRequest,
  DispatchOptOutReasonCode,
  DispatchOptOutSnapshot,
} from '../../shared/pd-contracts';
import type { CampaignRecord, EvidenceRecord } from '../../shared/platform-contracts';
import { Auth, type Principal } from './auth';
import { fail, fields, now, object, oneOf, PlatformStore, text } from './store';

/** Jenis rekod kebenaran aset yang disimpan dalam store. */
export const ASSET_CONSENT_RECORD_KIND = 'asset_consents';
/** Jenis rekod keutamaan notifikasi yang disimpan dalam store. */
export const NOTIFICATION_PREFERENCES_RECORD_KIND = 'notification_preferences';
/** Channel lalai — channel yang mempunyai rekod keutamaan sebenar. */
export const DEFAULT_DISPATCH_CHANNEL = 'in_app';

/**
 * Bentuk rekod keutamaan seperti yang disimpan dalam store.
 *
 * Ia sepadan dengan `StoredPreferences` dalam
 * `server/platform/operationalAmendments.ts` (bentuk yang sama, tanpa
 * `allowedTopics` yang dikira oleh perkhidmatan).
 */
export interface StoredNotificationPreferences {
  id: string;
  userId: string;
  revision: number;
  channel: 'in_app';
  inAppEnabled: boolean;
  topics: NotificationTopic[];
  updatedAt: string | null;
}

/** Pilihan tambahan untuk pintasan. */
export interface DispatchConsentOptions {
  /**
   * Topik yang dibenarkan bagi penerima. Jika diberi, topik di luar senarai
   * ini dianggap sebagai tidak subscribed (pintasan yang lebih ketat).
   */
  allowedTopics?: readonly NotificationTopic[];
  /**
   * Snapshot keutamaan penerima. Lalai: dibaca daripada store.
   */
  preferences?: StoredNotificationPreferences | null;
}

/** Hasil pintasan — menunjukkan sama ada penghantaran benar-benar berlaku. */
export type DispatchConsentExecution<T> =
  | {
      ok: true;
      code: null;
      dispatched: true;
      consent: AssetConsentRecord;
      detail: DispatchConsentDetail;
      result: T;
    }
  | {
      ok: false;
      code: DispatchConsentReasonCode;
      dispatched: false;
      retryable: false;
      message: string;
      detail: DispatchConsentDetail | null;
    };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Baca rekod kebenaran berstruktur bagi satu aset.
 *
 * Rekod yang tiada ATAU malformed ⇒ `null` ⇒ status `unknown` ⇒ BUKAN
 * kebenaran. Corak yang rosak tidak pernah ditafsirkan sebagai "granted".
 */
export function readAssetConsent(store: PlatformStore, assetId: string): AssetConsentRecord | null {
  const raw = store.get<unknown>(ASSET_CONSENT_RECORD_KIND, assetId);
  if (!isPlainObject(raw)) return null;
  const state = raw.state;
  if (state !== 'granted' && state !== 'denied' && state !== 'unknown') return null;
  if (typeof raw.assetId !== 'string' || !raw.assetId) return null;
  if (typeof raw.scope !== 'string') return null;
  if (typeof raw.evidenceId !== 'string') return null;
  if (typeof raw.recordedAt !== 'string') return null;
  if (typeof raw.recordedBy !== 'string') return null;
  return {
    assetId: raw.assetId,
    state,
    scope: raw.scope,
    evidenceId: raw.evidenceId,
    recordedAt: raw.recordedAt,
    recordedBy: raw.recordedBy,
  };
}

/**
 * Baca keutamaan notifikasi penerima daripada store.
 *
 * Rekod yang tiada atau malformed ⇒ `null` (tiada keutamaan direkodkan).
 */
export function readStoredPreferences(store: PlatformStore, userId: string): StoredNotificationPreferences | null {
  const raw = store.get<unknown>(NOTIFICATION_PREFERENCES_RECORD_KIND, userId);
  if (!isPlainObject(raw)) return null;
  if (typeof raw.inAppEnabled !== 'boolean') return null;
  if (!Array.isArray(raw.topics)) return null;
  const topics = raw.topics.filter((topic): topic is NotificationTopic => typeof topic === 'string');
  return {
    id: typeof raw.id === 'string' ? raw.id : userId,
    userId: typeof raw.userId === 'string' ? raw.userId : userId,
    revision: Number.isSafeInteger(Number(raw.revision)) ? Number(raw.revision) : 0,
    channel: 'in_app',
    inAppEnabled: raw.inAppEnabled,
    topics,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  };
}

/**
 * Nilai status opt-out penerima bagi satu channel/topic.
 *
 * - Channel `in_app` mempunyai rekod keutamaan sebenar; rekod itu yang
 *   menentukan sama ada penerima opted out.
 * - Channel lain tiada rekod keutamaan dalam store ⇒ status `unknown`.
 *   `unknown` BUKAN opt-out (kita tidak mengarang penolakan), tetapi ia juga
 *   tidak pernah menjadi kebenaran.
 */
export function evaluateOptOut(
  store: PlatformStore,
  request: DispatchConsentRequest,
  options: DispatchConsentOptions = {},
): DispatchOptOutSnapshot {
  const channel = request.channel;
  const topic = (request.topic ?? null) as NotificationTopic | null;
  const stored = options.preferences !== undefined
    ? options.preferences
    : readStoredPreferences(store, request.recipientId);

  if (channel !== DEFAULT_DISPATCH_CHANNEL) {
    return {
      state: 'unknown',
      channel,
      topic,
      reasonCode: 'NO_STORED_PREFERENCE_FOR_CHANNEL',
      preferenceRevision: null,
      updatedAt: null,
    };
  }

  // Tiada rekod keutamaan bermaksud tiada langganan topik mana-mana.
  const preferences = stored ?? { inAppEnabled: true, topics: [] as NotificationTopic[], revision: 0, updatedAt: null };

  if (!preferences.inAppEnabled) {
    return {
      state: 'opted_out',
      channel,
      topic,
      reasonCode: 'PREFERENCE_CHANNEL_DISABLED',
      preferenceRevision: preferences.revision,
      updatedAt: preferences.updatedAt,
    };
  }
  if (!topic) {
    return {
      state: 'unknown',
      channel,
      topic: null,
      reasonCode: 'NO_TOPIC_SCOPE',
      preferenceRevision: preferences.revision,
      updatedAt: preferences.updatedAt,
    };
  }
  if (options.allowedTopics && !options.allowedTopics.includes(topic)) {
    return {
      state: 'opted_out',
      channel,
      topic,
      reasonCode: 'PREFERENCE_TOPIC_NOT_SUBSCRIBED',
      preferenceRevision: preferences.revision,
      updatedAt: preferences.updatedAt,
    };
  }
  if (!preferences.topics.includes(topic)) {
    return {
      state: 'opted_out',
      channel,
      topic,
      reasonCode: 'PREFERENCE_TOPIC_NOT_SUBSCRIBED',
      preferenceRevision: preferences.revision,
      updatedAt: preferences.updatedAt,
    };
  }
  return {
    state: 'subscribed',
    channel,
    topic,
    reasonCode: 'PREFERENCE_SUBSCRIBED',
    preferenceRevision: preferences.revision,
    updatedAt: preferences.updatedAt,
  };
}

/** Adakah pelaku session-derived diberi kuasa menghantar kempen ini? */
function canDispatch(auth: Auth, actor: Principal, campaign: CampaignRecord): boolean {
  if (auth.has(actor, 'founder')) return true;
  if (campaign.ownerId === actor.user.id) return true;
  return actor.memberships.some(membership => membership.role === 'staff' && membership.status === 'active');
}

function refuse(
  code: DispatchConsentReasonCode,
  message: string,
  detail: DispatchConsentDetail | null,
): DispatchConsentOutcome {
  return { ok: false, code, message, retryable: false, detail };
}

/**
 * Nilai kebenaran penghantaran bagi satu aset dan satu penerima.
 *
 * Tiada mutasi berlaku. Fungsi ini adalah keputusan tulen (pure decision).
 */
export function evaluateDispatchConsent(
  store: PlatformStore,
  auth: Auth,
  actor: Principal,
  request: DispatchConsentRequest,
  options: DispatchConsentOptions = {},
): DispatchConsentOutcome {
  const raw = request as unknown;
  if (!isPlainObject(raw)) {
    return refuse('DISPATCH_INPUT_INVALID', 'Permintaan penghantaran tidak sah.', null);
  }
  const campaignId = typeof request.campaignId === 'string' ? request.campaignId.trim() : '';
  const assetId = typeof request.assetId === 'string' ? request.assetId.trim() : '';
  const recipientId = typeof request.recipientId === 'string' ? request.recipientId.trim() : '';
  const channel = typeof request.channel === 'string' && request.channel.trim() ? request.channel.trim() : DEFAULT_DISPATCH_CHANNEL;
  if (!campaignId || !assetId || !recipientId) {
    return refuse('DISPATCH_INPUT_INVALID', 'ID kempen, aset atau penerima tidak sah.', null);
  }

  const campaign = store.get<CampaignRecord>('campaigns', campaignId);
  if (!campaign) {
    return refuse('DISPATCH_CAMPAIGN_NOT_FOUND', 'Kempen tidak ditemui.', null);
  }
  if (!canDispatch(auth, actor, campaign)) {
    return refuse('DISPATCH_FORBIDDEN', 'Anda tidak diberi kuasa menghantar kempen ini.', null);
  }
  const asset = (campaign.assets ?? []).find(candidate => candidate.id === assetId);
  if (!asset) {
    return refuse('DISPATCH_ASSET_NOT_FOUND', 'Aset tidak ditemui dalam kempen ini.', null);
  }
  const recipient = store.db.query<{ id: string }, [string]>('SELECT id FROM users WHERE id=?').get(recipientId);
  if (!recipient) {
    return refuse('DISPATCH_RECIPIENT_NOT_FOUND', 'Penerima tidak wujud sebagai pengguna.', null);
  }

  const resolved: DispatchConsentRequest = { campaignId, assetId, recipientId, channel, ...(request.topic ? { topic: request.topic } : {}) };
  const optOut = evaluateOptOut(store, resolved, options);
  const consentRecord = readAssetConsent(store, assetId);
  const consentState: ConsentState = consentRecord?.state ?? 'unknown';

  const detail: DispatchConsentDetail = {
    campaignId,
    assetId,
    recipientId,
    channel,
    consentState,
    legacyConsentTextIsNotConsent: true,
    optOut,
    campaignStatus: campaign.status ?? null,
  };

  // GATE 1 — kebenaran aset. Tiada rekod ⇒ `unknown` ⇒ bukan kebenaran.
  // Diletakkan PERTAMA supaya sebab yang dilaporkan adalah sebab yang paling
  // asas (aset tidak dibenarkan dihantar), bukan keutamaan penerima.
  if (consentState !== 'granted' || !consentRecord) {
    return refuse(
      'ASSET_CONSENT_NOT_GRANTED',
      consentState === 'denied'
        ? 'Kebenaran aset telah ditolak.'
        : 'Tiada kebenaran berstruktur yang granted untuk aset ini.',
      detail,
    );
  }

  // GATE 2 — opt-out penerima. Menolak secara total, tiada laluan pintasan.
  if (optOut.state === 'opted_out') {
    return refuse('DISPATCH_OPTED_OUT', 'Penerima telah opted out daripada channel/topic ini.', detail);
  }

  return { ok: true, code: null, consent: consentRecord, detail };
}

/**
 * Jalankan penghantaran HANYA jika pintasan kebenaran membenarkan.
 *
 * Jika ada penolakan, fungsi `dispatch` TIDAK dipanggil dan hasilnya ialah
 * keputusan bertip yang tidak boleh di-retry secara buta.
 */
export function runWithDispatchConsent<T>(
  store: PlatformStore,
  auth: Auth,
  actor: Principal,
  request: DispatchConsentRequest,
  dispatch: () => T,
  options: DispatchConsentOptions = {},
): DispatchConsentExecution<T> {
  const outcome = evaluateDispatchConsent(store, auth, actor, request, options);
  if (!outcome.ok) {
    return {
      ok: false,
      code: outcome.code,
      dispatched: false,
      retryable: false,
      message: outcome.message,
      detail: outcome.detail,
    };
  }
  return {
    ok: true,
    code: null,
    dispatched: true,
    consent: outcome.consent,
    detail: outcome.detail,
    result: dispatch(),
  };
}

/**
 * Rekod kebenaran berstruktur bagi satu aset kempen.
 *
 * Hanya pengasas (founder) boleh merekod kebenaran, dan kebenaran mesti
 * disandarkan oleh rekod bukti sebenar yang berada dalam skop kempen tersebut
 * (entiti bukti = kempen atau aset).
 *
 * Ini ialah laluan TULIS: ia menggunakan `fail()` (DomainError) selaras
 * dengan kontrak arahan domain yang lain dalam platform ini.
 */
export function recordAssetConsent(
  store: PlatformStore,
  auth: Auth,
  actor: Principal,
  raw: unknown,
): AssetConsentRecord {
  auth.founder(actor);
  const input = object(raw);
  fields(input, ['campaignId', 'assetId', 'state', 'scope', 'evidenceId']);
  const campaignId = text(input.campaignId, 'ID kempen', 120);
  const assetId = text(input.assetId, 'ID aset', 120);
  const state = oneOf(input.state, ['granted', 'denied', 'unknown'] as const);
  const scope = text(input.scope, 'Skop kebenaran', 200);
  const evidenceId = text(input.evidenceId, 'ID bukti', 120);

  const campaign = store.require<CampaignRecord>('campaigns', campaignId);
  const asset = (campaign.assets ?? []).find(candidate => candidate.id === assetId);
  if (!asset) fail('ASSET_NOT_FOUND', 404, 'Aset tidak ditemui dalam kempen ini.');
  const evidence = store.require<EvidenceRecord>('evidence', evidenceId);
  if (evidence.entityId !== campaignId && evidence.entityId !== assetId) {
    fail('EVIDENCE_SCOPE', 403, 'Bukti tidak berada dalam skop kempen ini.');
  }

  const record: AssetConsentRecord = {
    assetId,
    state,
    scope,
    evidenceId,
    recordedAt: now(),
    recordedBy: actor.user.id,
  };
  store.save(ASSET_CONSENT_RECORD_KIND, { ...record, id: assetId });
  store.audit(actor.user.id, 'campaign.asset_consent', assetId, 1);
  return record;
}
