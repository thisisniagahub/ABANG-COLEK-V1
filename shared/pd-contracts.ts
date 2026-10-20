/**
 * PD-01 — Kontrak kebenaran penghantaran (dispatch consent).
 *
 * TUJUAN
 * Membentuk semula soalan "adakah penerima ini dibenarkan menerima aset ini?"
 * sebagai kontrak data yang boleh dikongsi antara pelayan dan klien.
 *
 * HUBUNGAN DENGAN `CampaignAsset.consent`
 * `shared/platform-contracts.ts` mendefinisikan `CampaignAsset.consent` sebagai
 * TEKS BEBAS (`string`). Teks bebas itu BUKAN kebenaran berstruktur: ia tidak
 * boleh dibaca, ditafsirkan atau ditiru sebagai "penerima telah bersetuju".
 * Oleh sebab itu kontrak ini kekal berasingan dan teks warisan itu sentiasa
 * dibaca sebagai `unknown` (lihat `server/platform/dispatchConsent.ts`).
 *
 * PRINSIP
 * - Kebenaran yang tiada rekod = `unknown` = BUKAN kebenaran.
 * - `denied` dan `unknown`kedua-duanya tidak melepaskan penghantaran.
 * - Setiap kebenaran memerlukan `evidenceId` — bukti sebenar yang boleh disemak
 *   semula, bukan Capability ini yang mengaranginya.
 * - Tiada nilaiwang/dolar/float dalam kontrak ini.
 */

import type { NotificationTopic } from './operation-amendment-contracts';

/**
 * Status kebenaran berstruktur bagi satu aset kempen.
 *
 * - `granted` — kebenaran direkodkan dan disemak (bukti wujud).
 * - `denied`  — penolakan direkodkan secara eksplisit.
 * - `unknown` — tiada rekod, atau rekod tidak sah bentuknya. `unknown` BUKAN
 *   kebenaran dan tidak pernah melepaskan penghantaran.
 */
export type ConsentState = 'granted' | 'denied' | 'unknown';

/**
 * Rekod kebenaran berstruktur bagi satu aset kempen.
 *
 * `scope` ialah label skop yang diminta (cth. `in_app:orders`). Ia direkod
 * bersama supaya pemanggil boleh melaporkan skopnya; keputusan *penolakan*
 * hanya bergantung pada `state` (lihat `DispatchConsentReasonCode`).
 */
export interface AssetConsentRecord {
  /** ID aset kempen (ralat `CampaignAsset.id`). */
  assetId: string;
  /** Status kebenaran. `unknown` = tiada bukti. */
  state: ConsentState;
  /** Label skop yang dipatuhi (cth. `in_app:orders`). */
  scope: string;
  /** ID rekod bukti sebenar yang menyokong kebenaran ini. */
  evidenceId: string;
  /** Cap masa rekod direkodkan (ISO-8601). */
  recordedAt: string;
  /** ID pengguna yang merekod kebenaran (session-derived, bukan input klien). */
  recordedBy: string;
}

/** Reason code untuk keputusan pintasan penghantaran. */
export type DispatchConsentReasonCode =
  /** Keutamaan opt-out penerima meliputi channel/topic ini. */
  | 'DISPATCH_OPTED_OUT'
  /** Status kebenaran aset bukan `granted` (termasuk `unknown` dan tiada rekod). */
  | 'ASSET_CONSENT_NOT_GRANTED'
  /** Input permintaan tidak sah. */
  | 'DISPATCH_INPUT_INVALID'
  /** Kempen tidak wujud dalam store. */
  | 'DISPATCH_CAMPAIGN_NOT_FOUND'
  /** Aset tidak wujud dalam kempen tersebut. */
  | 'DISPATCH_ASSET_NOT_FOUND'
  /** Penerima tidak wujud sebagai pengguna. */
  | 'DISPATCH_RECIPIENT_NOT_FOUND'
  /** Pelaku tidak diberi kuasa untuk menghantar kempen ini. */
  | 'DISPATCH_FORBIDDEN';

/**
 * Status opt-out penerima bagi satu channel/topic.
 *
 * - `opted_out` — rekod keutamaan penerima meliputi channel/topic ini.
 * - `subscribed` — rekod keutamaan menunjukkan penerima mahu menerimanya.
 * - `unknown`    — tiada rekod keutamaan bagi channel ini. `unknown` BUKAN
 *   opt-out dan BUKAN kebenaran; ia tidak menolak sendiri, tetapi ia juga
 *   tidak pernah memuktamadkan bahawa penghantaran dibenarkan.
 */
export type DispatchOptOutState = 'opted_out' | 'subscribed' | 'unknown';

/** Sebab yang menyebabkan status opt-out tersebut. */
export type DispatchOptOutReasonCode =
  /** `inAppEnabled === false` — channel keseluruhan dimatikan. */
  | 'PREFERENCE_CHANNEL_DISABLED'
  /** Topik tidak tersenarai dalam `topics` penerima (atau di luar skop peranan). */
  | 'PREFERENCE_TOPIC_NOT_SUBSCRIBED'
  /** Penerima subscribed kepada topic. */
  | 'PREFERENCE_SUBSCRIBED'
  /** Channel ini tiada rekod keutamaan dalam store. */
  | 'NO_STORED_PREFERENCE_FOR_CHANNEL'
  /** Tiada topik dinyatakan, jadi liputan topik tidak boleh dinilai. */
  | 'NO_TOPIC_SCOPE';

/** Tsnapshot status opt-out penerima (read-only, tiada PII dalam snapshot ini). */
export interface DispatchOptOutSnapshot {
  state: DispatchOptOutState;
  channel: string;
  topic: NotificationTopic | null;
  reasonCode: DispatchOptOutReasonCode;
  /** Revisi rekod keutamaan yang dibaca (`null` jika tiada rekod). */
  preferenceRevision: number | null;
  /** Cap masa rekod keutamaan (`null` jika tiada rekod). */
  updatedAt: string | null;
}

/** Permintaan pintasan penghantaran — semua medan datang daripada pelayan/sesi. */
export interface DispatchConsentRequest {
  /** ID kempen. */
  campaignId: string;
  /** ID aset dalam kempen tersebut. */
  assetId: string;
  /** ID pengguna penerima. */
  recipientId: string;
  /** Channel penghantaran. `in_app` ialah channel yang mempunyai rekod keutamaan. */
  channel: string;
  /** Topik notifikasi (untuk channel `in_app`). */
  topic?: NotificationTopic;
}

/** Butiran keputusan — jujur tentang apa yang diketahui dan apa yang tidak. */
export interface DispatchConsentDetail {
  campaignId: string;
  assetId: string;
  recipientId: string;
  channel: string;
  /** Status kebenaran aset selepas gate: `granted` | `denied` | `unknown`. */
  consentState: ConsentState;
  /**
   * Sentiasa `true`. Medan `CampaignAsset.consent` warisan (teks bebas)
   * TIDAK pernah digunakan sebagai kebenaran.
   */
  legacyConsentTextIsNotConsent: true;
  /** Status opt-out penerima. */
  optOut: DispatchOptOutSnapshot;
  /** Status kempen semasa (makluman; kelulusan ialah gate berasingan). */
  campaignStatus: string | null;
}

/** Keputusan pintasan penghantaran. */
export type DispatchConsentOutcome =
  | {
      ok: true;
      code: null;
      /** Kebenaran berstruktur yang dibaca (hanya ada jika `state === 'granted'`). */
      consent: AssetConsentRecord;
      detail: DispatchConsentDetail;
    }
  | {
      ok: false;
      code: DispatchConsentReasonCode;
      message: string;
      /** Sentiasa `false` — penolakan ini tidak boleh "di-retry" secara buta. */
      retryable: false;
      detail: DispatchConsentDetail | null;
    };
