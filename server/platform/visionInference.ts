/**
 * AbangColek Sovereign GrowthOS — Vision inference over attachments (EXT-07)
 * Zero-New-Paid-Cloud-Spend • BYOK NVIDIA NIM • satu retry berkapasiti sahaja
 *
 * Laluan vision SEBENAR bagi lampiran bukti. Calon ialah
 * `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` pada provider `nvidia`
 * (integrate.api.nvidia.com/v1, OpenAI-compatible), disahkan LIVE pada
 * 21 Oktober 2026: HTTP 200, 2821 ms, imej dibaca dengan betul. Bukti:
 * `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md`.
 *
 * Peraturan rumah yang dipegang modul ini:
 * 1. Tiada jawapan reka. Jawapan datang daripada badan respons provider
 *    sebenar, atau run gagal tutup dengan reason code bertip.
 * 2. Badan mentah provider TIDAK pernah dihantar ke pelayar — ia hanya
 *    diklasifikasi menjadi reason code stabil + mesej tetap Bahasa Melayu,
 *    dan dicatat di sisi server melalui sink yang disamar.
 * 3. Kapasiti (HTTP 503 `ResourceExhausted`) BUKAN kredensial: satu retry
 *    berkapasiti selepas cooldown terikat, kemudian penolakan bertip dengan
 *    reason code sebenar `PROVIDER_CAPACITY_EXHAUSTED`. Tiada gelung retry.
 * 4. Mod offline (`ABANGCOLEK_DISABLE_LIVE_PROVIDERS=1`) tidak membuat
 *    panggilan keluar — kegagalan dilaporkan dengan `PROVIDER_LIVE_DISABLED`.
 */

import {
  classifyProviderHttpFailure,
  redactProviderErrorBody,
} from '../../shared/copilot-contracts';
import { VISION_INFERENCE_CANDIDATE } from '../../shared/intelligence-availability';
import { liveProvidersDisabled, logPlatformProviderFailure } from './freeModelRouter';

/** Endpoint NIM NVIDIA (OpenAI-compatible chat completions). */
const NVIDIA_VISION_ENDPOINT =
  'https://integrate.api.nvidia.com/v1/chat/completions';

/** Nama pemboleh ubah persekitaran kelayakan provider vision. */
export const VISION_CREDENTIAL_ENV = 'NVIDIA_API_KEY';

/**
 * Jenis MIME lampiran yang boleh ditafsir oleh model vision. Lampiran
 * bukan imej (PDF/teks) ditolak dengan `ATTACHMENT_NOT_INTERPRETABLE` —
 * ia tidak pernah dihantar secara senyap sebagai imej.
 */
export const VISION_INTERPRETABLE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

/** Had masa satu panggilan provider vision (ms). */
export const VISION_CALL_TIMEOUT_MS = 20_000;
/** Cooldown sebelum satu-satunya retry kapasiti (ms). */
export const VISION_CAPACITY_RETRY_COOLDOWN_MS = 2_000;
/** Had token output bagi run vision (jawapan ringkas, bukan esei). */
const VISION_MAX_OUTPUT_TOKENS = 512;

/** Satu imej lampiran yang telah disahkan hash-nya, dikod base64. */
export interface VisionInferenceImage {
  evidenceId: string;
  mimeType: string;
  /** Base64 bait fail sebenar (bait yang sama hash SHA-256 nya dikira). */
  base64: string;
  /** SHA-256 bait fail, untuk jejak audit. */
  sha256: string;
}

export interface VisionInferenceRequest {
  /** Soalan pengguna tentang lampiran (prompt teks). */
  prompt: string;
  /** Imej lampiran yang telah disahkan. */
  images: VisionInferenceImage[];
  /** Had masa keseluruhan run vision (ms). Lalai: 30 saat. */
  deadlineMs?: number;
  /** Cooldown retry kapasiti (ms) — boleh disuntik bagi ujian. */
  capacityRetryCooldownMs?: number;
  /** Fungsi fetch yang boleh disuntik bagi ujian (lalai: fetch global). */
  fetchFn?: typeof fetch;
  /** Persekitaran yang boleh disuntik bagi ujian (lalai: process.env). */
  env?: Record<string, string | undefined>;
}

/** Jejak satu percubaan panggilan provider vision. */
export interface VisionInferenceAttempt {
  /** Nombor percubaan (1-asas). */
  attempt: number;
  /** Reason code percubaan ini (`PROVIDER_CALL_SUCCEEDED` apabila berjaya). */
  reasonCode: string;
  /** Status HTTP sebenar, apabila provider membalas. */
  httpStatus?: number;
  /** Latensi percubaan (ms). */
  latencyMs: number;
}

/** Reason code kegagalan run vision. Semua boleh dibaca mesin. */
export type VisionInferenceFailureReason =
  | 'ATTACHMENT_BYTES_REQUIRED'
  | 'ATTACHMENT_NOT_INTERPRETABLE'
  | 'PROVIDER_LIVE_DISABLED'
  | 'PROVIDER_CREDENTIALS_MISSING'
  | 'PROVIDER_CAPACITY_EXHAUSTED'
  | 'PROVIDER_QUOTA_EXHAUSTED'
  | 'PROVIDER_MODEL_NOT_FOUND'
  | 'PROVIDER_ACCESS_DENIED'
  | 'PROVIDER_HTTP_ERROR'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_EMPTY_RESPONSE'
  | 'PROVIDER_RESPONSE_INVALID';

export type VisionInferenceOutcome =
  | {
      ok: true;
      /** Jawapan sebenar daripada model vision (teks respons provider). */
      answer: string;
      providerId: 'nvidia';
      model: string;
      latencyMs: number;
      attempts: VisionInferenceAttempt[];
      usage?: { promptTokens: number; completionTokens: number };
    }
  | {
      ok: false;
      reasonCode: VisionInferenceFailureReason;
      /** Mesej tetap Bahasa Melayu yang selamat dihantar ke pelayar. */
      reason: string;
      latencyMs: number;
      attempts: VisionInferenceAttempt[];
    };

/**
 * Mesej tetap (Bahasa Melayu) bagi setiap reason code kegagalan vision.
 * Mesej provider mentah TIDAK pernah masuk ke sini.
 */
export const VISION_FAILURE_MESSAGES: Record<VisionInferenceFailureReason, string> = {
  ATTACHMENT_BYTES_REQUIRED:
    'Run vision memerlukan sekurang-kurangnya satu imej lampiran yang disahkan.',
  ATTACHMENT_NOT_INTERPRETABLE:
    'Lampiran bukan imej yang boleh ditafsir oleh model vision (PNG, JPEG atau WebP sahaja).',
  PROVIDER_LIVE_DISABLED:
    'Panggilan provider live dilumpuhkan bagi proses ini, jadi tiada inferensi vision dibuat.',
  PROVIDER_CREDENTIALS_MISSING:
    'Tiada kelayakan provider vision dikonfigurasikan, jadi tiada panggilan vision dibuat.',
  PROVIDER_CAPACITY_EXHAUSTED:
    'Kapasiti worker penyedia vision penuh buat sementara (HTTP 503); satu cubaan semula telah dibuat dan gagal. Cuba lagi sebentar nanti.',
  PROVIDER_QUOTA_EXHAUSTED:
    'Penyedia vision menolak permintaan kerana kuota habis. Cuba lagi selepas tempoh tunggu yang diberikan.',
  PROVIDER_MODEL_NOT_FOUND:
    'Model vision yang diminta tidak tersedia untuk akaun ini.',
  PROVIDER_ACCESS_DENIED:
    'Akses kepada penyedia vision ditolak untuk akaun ini.',
  PROVIDER_HTTP_ERROR:
    'Penyedia vision mengembalikan ralat HTTP. Cuba lagi sebentar nanti.',
  PROVIDER_TIMEOUT:
    'Panggilan vision melebihi had masa run.',
  PROVIDER_UNAVAILABLE:
    'Penyedia vision tidak dapat dihubungi buat masa ini.',
  PROVIDER_EMPTY_RESPONSE:
    'Penyedia vision memulangkan jawapan kosong.',
  PROVIDER_RESPONSE_INVALID:
    'Respons penyedia vision tidak sah.',
};

/** Suis mod offline yang boleh disuntik (selari dengan freeModelRouter). */
function visionLiveDisabled(env: Record<string, string | undefined>): boolean {
  return env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS === '1' || liveProvidersDisabled();
}

/** Adakah kegagalan HTTP ini kegagalan KAPASITI worker (bukan kredensial)? */
function isCapacityExhaustion(status: number, body: string): boolean {
  const text = body.toLowerCase();
  return (
    status === 503 ||
    text.includes('resourceexhausted') ||
    text.includes('resource_exhausted') ||
    text.includes('worker local total request limit reached')
  );
}

function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: string; message?: string };
  return (
    candidate.name === 'AbortError' ||
    candidate.name === 'TimeoutError' ||
    /abort/i.test(candidate.message ?? '')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
}

/**
 * Menjalankan inferensi vision SEBENAR ke atas imej lampiran.
 *
 * Panggilan dibuat kepada endpoint OpenAI-compatible NIM NVIDIA dengan
 * kandungan multimodal (`text` + `image_url` data-URI). Sekurang-kurangnya
 * satu imej diperlukan; MIME bukan imej ditolak sebelum sebarang panggilan
 * keluar. Kegagalan kapasiti (503 `ResourceExhausted`) dicuba semula TEPAT
 * SEKALI selepas cooldown terikat; semua kegagalan lain tidak dicuba semula.
 */
export async function runVisionInference(
  request: VisionInferenceRequest
): Promise<VisionInferenceOutcome> {
  const env = request.env ?? process.env;
  const fetchFn = request.fetchFn ?? fetch;
  const deadlineMs = request.deadlineMs ?? 30_000;
  const cooldownMs = request.capacityRetryCooldownMs ?? VISION_CAPACITY_RETRY_COOLDOWN_MS;
  const startedAt = Date.now();
  const attempts: VisionInferenceAttempt[] = [];

  const fail = (
    reasonCode: VisionInferenceFailureReason
  ): VisionInferenceOutcome => ({
    ok: false,
    reasonCode,
    reason: VISION_FAILURE_MESSAGES[reasonCode],
    latencyMs: Date.now() - startedAt,
    attempts,
  });

  // Validasi input sebelum sebarang panggilan keluar.
  if (!Array.isArray(request.images) || request.images.length === 0) {
    return fail('ATTACHMENT_BYTES_REQUIRED');
  }
  for (const image of request.images) {
    if (
      typeof image.base64 !== 'string' ||
      image.base64.length === 0 ||
      !(VISION_INTERPRETABLE_MIME_TYPES as readonly string[]).includes(image.mimeType)
    ) {
      return fail('ATTACHMENT_NOT_INTERPRETABLE');
    }
  }

  if (visionLiveDisabled(env)) return fail('PROVIDER_LIVE_DISABLED');

  const apiKey = env[VISION_CREDENTIAL_ENV];
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return fail('PROVIDER_CREDENTIALS_MISSING');
  }

  // Kandungan multimodal OpenAI-compatible: teks soalan + setiap imej
  // lampiran sebagai data-URI base64 (bait sebenar yang hash-nya disahkan).
  const content: Array<Record<string, unknown>> = [{ type: 'text', text: request.prompt }];
  for (const image of request.images) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
    });
  }

  const body = JSON.stringify({
    model: VISION_INFERENCE_CANDIDATE.model,
    messages: [{ role: 'user', content }],
    max_tokens: VISION_MAX_OUTPUT_TOKENS,
    temperature: 0.2,
  });

  // Maksimum DUA percubaan: panggilan pertama + satu retry kapasiti.
  const MAX_ATTEMPTS = 2;
  for (let attemptNumber = 1; attemptNumber <= MAX_ATTEMPTS; attemptNumber += 1) {
    const remaining = startedAt + deadlineMs - Date.now();
    if (remaining <= 0) return fail('PROVIDER_TIMEOUT');

    const attemptStartedAt = Date.now();
    try {
      const response = await fetchFn(NVIDIA_VISION_ENDPOINT, {
        method: 'POST',
        signal: AbortSignal.timeout(Math.max(1, Math.min(VISION_CALL_TIMEOUT_MS, remaining))),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        const capacity = isCapacityExhaustion(response.status, errText);
        // Badan mentah provider kekal di sisi server sahaja (disamar).
        logPlatformProviderFailure({
          provider: 'NVIDIA NIM (vision)',
          model: VISION_INFERENCE_CANDIDATE.model,
          status: response.status,
          reason: capacity
            ? 'PROVIDER_CAPACITY_EXHAUSTED'
            : classifyProviderHttpFailure(response.status, errText).reason,
          body: errText,
        });
        attempts.push({
          attempt: attemptNumber,
          reasonCode: capacity
            ? 'PROVIDER_CAPACITY_EXHAUSTED'
            : classifyProviderHttpFailure(response.status, errText).reason,
          httpStatus: response.status,
          latencyMs: Date.now() - attemptStartedAt,
        });
        if (capacity && attemptNumber < MAX_ATTEMPTS) {
          // Kegagalan KAPASITI (bukan kredensial): satu retry selepas
          // cooldown terikat. Gelung tidak berterusan — MAX_ATTEMPTS=2.
          await sleep(cooldownMs);
          continue;
        }
        const classified = classifyProviderHttpFailure(response.status, errText);
        const reasonCode: VisionInferenceFailureReason = capacity
          ? 'PROVIDER_CAPACITY_EXHAUSTED'
          : classified.reason;
        return fail(reasonCode);
      }

      const data = (await response.json().catch(() => null)) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      } | null;
      if (!data) {
        attempts.push({
          attempt: attemptNumber,
          reasonCode: 'PROVIDER_RESPONSE_INVALID',
          httpStatus: response.status,
          latencyMs: Date.now() - attemptStartedAt,
        });
        return fail('PROVIDER_RESPONSE_INVALID');
      }
      const answer = (data.choices?.[0]?.message?.content ?? '').trim();
      if (answer.length === 0) {
        attempts.push({
          attempt: attemptNumber,
          reasonCode: 'PROVIDER_EMPTY_RESPONSE',
          httpStatus: response.status,
          latencyMs: Date.now() - attemptStartedAt,
        });
        return fail('PROVIDER_EMPTY_RESPONSE');
      }
      attempts.push({
        attempt: attemptNumber,
        reasonCode: 'PROVIDER_CALL_SUCCEEDED',
        httpStatus: response.status,
        latencyMs: Date.now() - attemptStartedAt,
      });
      return {
        ok: true,
        answer,
        providerId: 'nvidia',
        model: VISION_INFERENCE_CANDIDATE.model,
        latencyMs: Date.now() - startedAt,
        attempts,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens ?? 0,
              completionTokens: data.usage.completion_tokens ?? 0,
            }
          : undefined,
      };
    } catch (error) {
      if (isAbortError(error)) {
        attempts.push({ attempt: attemptNumber, reasonCode: 'PROVIDER_TIMEOUT', latencyMs: Date.now() - attemptStartedAt });
        return fail('PROVIDER_TIMEOUT');
      }
      // Kegagalan jaringan: dicatat dengan reason code jujur; badan mentah
      // ( mesej ralat node ) disamar melalui sink yang sama.
      const rawMessage = error instanceof Error ? error.message : String(error);
      logPlatformProviderFailure({
        provider: 'NVIDIA NIM (vision)',
        model: VISION_INFERENCE_CANDIDATE.model,
        reason: 'PROVIDER_UNAVAILABLE',
        body: redactProviderErrorBody(rawMessage),
      });
      attempts.push({ attempt: attemptNumber, reasonCode: 'PROVIDER_UNAVAILABLE', latencyMs: Date.now() - attemptStartedAt });
      return fail('PROVIDER_UNAVAILABLE');
    }
  }

  // Tidak sepatutnya dicapai (gelung sentiasa return), tetapi gagal tutup
  // secara jujur jika ia dicapai.
  return fail('PROVIDER_CAPACITY_EXHAUSTED');
}

/** Signature pelaksana vision yang boleh disuntik ke dalam platform app. */
export type VisionInferenceRunner = (
  request: VisionInferenceRequest
) => Promise<VisionInferenceOutcome>;
