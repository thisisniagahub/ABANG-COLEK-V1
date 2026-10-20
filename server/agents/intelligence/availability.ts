/**
 * AbangColek Sovereign GrowthOS — Honest availability of the intelligence layer
 *
 * Every capability that depends on an account, credential, eligibility,
 * privacy consent or a paid plan is represented here as an explicit, typed
 * `unavailable` with the exact blocking reason. Nothing in this file claims a
 * live service that is not configured in this repository.
 */

import type { IntelligenceAvailability, IntelligencePersistence } from '../../../shared/founder-intelligence-contracts';

const LOCAL = 'local' as const;

/** The local learning pipeline (CPK-03 / ADV-28). Fully implemented here. */
export function localLearningAvailability(persistence: IntelligencePersistence = 'platform_store'): IntelligenceAvailability {
  return {
    available: true,
    locality: LOCAL,
    reasonCode: 'LOCAL_LEARNING_PIPELINE_AVAILABLE',
    reason: 'Paip pembelajaran tempatan (bukti → insight → calon → penilaian → penerbitan manusia → penghantaran berpinset → gulung balik) berjalan pada store kanonik.',
    persistence,
  };
}

/**
 * Automatic Learning as a hosted CopilotKit Intelligence product feature.
 * It requires an Intelligence account and its terms of use. Not configured.
 */
export function cloudAutomaticLearningAvailability(): IntelligenceAvailability {
  return {
    available: false,
    locality: 'remote',
    reasonCode: 'INTELLIGENCE_ACCOUNT_REQUIRED',
    reason:
      'Automatic Learning sebagai produk CopilotKit Intelligence memerlukan akaun Intelligence yang aktif dan terma penggunaan yang dipersetujui; tiada akaun dikonfigurasi dalam repositori ini.',
    persistence: 'in_memory',
  };
}

/**
 * AG-UI Streams as a hosted product feature (saved runs, cross-device resume).
 * The local thread persistence is implemented; the hosted entitlement is not.
 */
export function cloudAguiStreamsAvailability(): IntelligenceAvailability {
  return {
    available: false,
    locality: 'remote',
    reasonCode: 'INTELLIGENCE_ENTITLEMENT_REQUIRED',
    reason:
      'AG-UI Streams sebagai produk awan (saved runs, resume merentas peranti) memerlukan kelayakan Intelligence; separuh tempatan (thread persistence, replay/resume, re-authorize) sahaja tersedia.',
    persistence: 'platform_store',
  };
}

/** User Memories as a hosted Intelligence feature. */
export function cloudUserMemoriesAvailability(): IntelligenceAvailability {
  return {
    available: false,
    locality: 'remote',
    reasonCode: 'INTELLIGENCE_ACCOUNT_AND_TERMS_REQUIRED',
    reason:
      'User Memories awan memerlukan akaun Intelligence, persetujuan privasi dan terma penggunaan; laluan tempatan (provenance, permission, retention, delete) sahaja tersedia.',
    persistence: 'platform_store',
  };
}

/** Live Slack/Teams channel delivery. */
export function liveChannelAvailability(): IntelligenceAvailability {
  return {
    available: false,
    locality: 'remote',
    reasonCode: 'CHANNEL_PROVIDER_ACCOUNT_REQUIRED',
    reason:
      'Penghantaran langsung ke Slack/Teams memerlukan akaun provider, aplikasi provider, pengesahan tandatangan peristiwa dan kebenaran penghantaran sebenar; tiada provider dikonfigurasi.',
    persistence: 'in_memory',
  };
}

/** WebMCP in a browser. */
export function webMcpAvailability(): IntelligenceAvailability {
  return {
    available: false,
    locality: 'remote',
    reasonCode: 'WEBMCP_BROWSER_SUPPORT_REQUIRED',
    reason:
      'WebMCP memerlukan sokongan pelayar (Model Context Protocol di pelayar) dan grant pengguna; probe pelayar mengembalikan `unavailable` apabila API tidak wujud.',
    persistence: 'in_memory',
  };
}

/** Vision inference over attachments. */
export function visionInferenceAvailability(): IntelligenceAvailability {
  return {
    available: false,
    locality: 'remote',
    reasonCode: 'QUALIFIED_VISION_MODEL_REQUIRED',
    reason:
      'Inferensi vision memerlukan model layak yang diluluskan dan skop data yang diluluskan; muat naik fail bukan bukti vision dan tiada panggilan vision dibuat.',
    persistence: 'in_memory',
  };
}

/** External speech-to-text / text-to-speech services. */
export function externalVoiceAvailability(): IntelligenceAvailability {
  return {
    available: false,
    locality: 'remote',
    reasonCode: 'EXTERNAL_STT_TTS_NOT_CONFIGURED',
    reason:
      'Perkhidmatan STT/TTS luaran tidak dikonfigurasi (perlu lulus gate kos/privasi); aplikasi ini hanya menggunakan Web Speech API pelayar.',
    persistence: 'in_memory',
  };
}

/** Product analytics / interaction capture as a hosted offering. */
export function hostedAnalyticsAvailability(): IntelligenceAvailability {
  return {
    available: false,
    locality: 'remote',
    reasonCode: 'DATA_POLICY_AND_FREE_OFFERING_UNCONFIRMED',
    reason:
      'Penangkapan analitik hos hanya dibenarkan selepas dasar data dan tawaran percuma disahkan; pengumpul tempatan ada, penghantaran awan dilumpuhkan secara lalai.',
    persistence: 'local_storage',
  };
}
