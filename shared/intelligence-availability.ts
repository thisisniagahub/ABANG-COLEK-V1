/**
 * AbangColek Sovereign GrowthOS — Honest availability of the intelligence layer
 *
 * Every capability that depends on an account, credential, eligibility,
 * privacy consent or a paid plan is represented here as an explicit, typed
 * `unavailable` with the exact blocking reason. Nothing in this file claims a
 * live service that is not configured in this repository.
 *
 * Why this lives in `shared/`: every server entry point answers it
 * identically — the platform app, the CopilotKit route and the hosted
 * copilot route. It therefore belongs to the layer all of them may depend
 * on, and it depends on nothing but the shared contract. Probe vision
 * membaca keadaan persekitaran proses (kelayakan dikonfigurasi + suis mod
 * offline) melalui `readVisionInferenceEnvironment`; keadaan itu boleh
 * disuntik bagi ujian.
 */

import type { IntelligenceAvailability, IntelligencePersistence } from './founder-intelligence-contracts';

const LOCAL = 'local' as const;

/** The local learning pipeline (CPK-03 / ADV-28). Fully implemented here. */
export function localLearningAvailability(persistence: IntelligencePersistence = 'platform_store'): IntelligenceAvailability {
  return {
    available: true,
    locality: LOCAL,
    reasonCode: 'LOCAL_LEARNING_PIPELINE_AVAILABLE',
    reason: 'Paip pembelajaran tempatan (bukti → insight → calon → penilaian → penerbitan manusia → penghantaran berpinset → gulung balik) berjalan pada store kanonikal.',
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
      'Automatic Learning sebagai produk CopilotKit Intelligence memerlukan akaun Intelligence yang aktif dan terma penggunaan yang diluluskan; tiada akaun dikonfigurasi dalam repositori ini.',
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
      'Memori pengguna awan memerlukan akaun Intelligence, kebenaran privasi dan terma penggunaan; laluan tempatan (provenance, permission, retention, delete) sahaja tersedia.',
    persistence: 'in_memory',
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
      'WebMCP memerlukan sokongan pelayar (Model Context Protocol dalam pelayar) dan grant pengguna; probe pelayar mengembalikan `unavailable` apabila API tidak wujud.',
    persistence: 'in_memory',
  };
}

/* ------------------------------------------------------------------------- *
 * EXT-07 — Vision inference over attachments.
 *
 * Calon vision yang diluluskan untuk repo ini (disahkan LIVE pada 21 Oktober
 * 2026 — HTTP 200, imej dibaca dengan betul; bukti:
 * `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md`). Calon ini BYOK pada provider
 * `nvidia` (NIM), bukan kumpulan perkongsian free — tiada langganan baharu,
 * tiada paid fallback.
 * ------------------------------------------------------------------------- */

/** Calon model vision yang layak (live-verified 2026-10-21). */
export const VISION_INFERENCE_CANDIDATE = {
  providerId: 'nvidia',
  model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  name: 'NVIDIA Nemotron 3 Nano Omni 30B A3B Reasoning (vision)',
} as const;

/** Keadaan sebenar yang menentukan ketersediaan inferensi vision. */
export interface VisionInferenceEnvironment {
  /** Adakah kelayakan provider vision (`NVIDIA_API_KEY`) dikonfigurasikan? */
  nvidiaApiKeyConfigured: boolean;
  /** Adakah panggilan provider live dilumpuhkan bagi proses ini (mod offline ujian)? */
  liveProvidersDisabled: boolean;
}

/**
 * Membaca keadaan sebenar vision daripada persekitaran proses. Bacaan ini
 * tulen: ia tidak pernah mendakwa kelayakan yang tiada, dan mod offline
 * (suite ujian) dilaporkan sebagai tidak tersedia kerana tiada panggilan
 * keluar yang boleh dibuat dalam proses itu.
 */
export function readVisionInferenceEnvironment(
  env: Record<string, string | undefined> = process.env
): VisionInferenceEnvironment {
  const key = env.NVIDIA_API_KEY;
  return {
    nvidiaApiKeyConfigured: typeof key === 'string' && key.trim().length > 0,
    liveProvidersDisabled: env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS === '1',
  };
}

/**
 * Vision inference over attachments.
 *
 * Melaporkan keadaan SEBENAR: tersedia apabila calon vision yang
 * disahkan live dikonfigurasikan (kunci hadir) dan panggilan live tidak
 * dilumpuhkan bagi proses ini. Sebaliknya ia kekal `unavailable` dengan
 * reason code `QUALIFIED_VISION_MODEL_REQUIRED` — penolakan bertip yang
 * sedia ada, dikekalkan sebagai fallback jujur apabila tiada model layak
 * yang dikonfigurasi atau boleh dihubungi bagi run ini.
 */
export function visionInferenceAvailability(
  environment: VisionInferenceEnvironment = readVisionInferenceEnvironment()
): IntelligenceAvailability {
  if (environment.nvidiaApiKeyConfigured && !environment.liveProvidersDisabled) {
    return {
      available: true,
      locality: 'remote',
      reasonCode: 'VISION_MODEL_CONFIGURED',
      reason:
        `Inferensi vision tersedia melalui ${VISION_INFERENCE_CANDIDATE.providerId}/${VISION_INFERENCE_CANDIDATE.model} ` +
        '(disahkan live 21 Okt 2026); jawapan datang daripada panggilan provider sebenar ke atas bait fail yang disahkan hash.',
      persistence: 'in_memory',
    };
  }
  return {
    available: false,
    locality: 'remote',
    reasonCode: 'QUALIFIED_VISION_MODEL_REQUIRED',
    reason:
      'Inferensi vision memerlukan model layak yang dikonfigurasi dan boleh dihubungi bagi run ini; muat naik fail bukan bukti vision dan tiada panggilan vision dibuat.',
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
      'Perkhidmatan suara luaran tidak dikonfigurasi (perlu lulus gate kos/privasi); aplikasi ini hanya menggunakan Web Speech API pelayar.',
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
