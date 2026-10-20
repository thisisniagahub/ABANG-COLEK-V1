/**
 * AbangColek Sovereign GrowthOS — CopilotKit v2 Route (app-origin platform path)
 * Route: /api/platform/copilot/v2
 *
 * Fungsi Vercel statik ini MENYALUT `api/platform/[...path].ts` (catch-all),
 * jadi ia mesti mengikut kontrak yang dijangka oleh `src/features/platform/client.ts`:
 *
 *   - Badan response mesti sentiasa mengandungi boolean `ok`.
 *   - `data` ialah muatan untuk `{ ok: true }`; `{ ok: false }` mesti membawa
 *     `code`, `requestId` dan `message`.
 *
 * GET  -> descriptor runtime CopilotKit v2 (versi, runtime, skema, calon percuma)
 * POST -> payload runtime sebenar (status, mesej, reason, servedBy, attempts)
 *
 * Keselamatan:
 * - Identiti datang daripada server sahaja. Actor yang digunakan ialah actor
 *   tetamu yang dijana SERVER (`PUBLIC_ORIGIN_ACTOR`); sebarang `userId`,
 *   `role` atau `threadId` yang dihantar pelayar tidak pernah menjadi
 *   tuntutan keutamaan.
 * - Fungsi ini tidak mendedahkan kunci API dan tidak mendedahkan perkhidmatan
 *   ADK ke laluan awam.
 */

import { copilotRuntime, PUBLIC_ORIGIN_ACTOR } from '../../../server/agents/copilot/runtime-instance';
import type { CopilotChatResponse } from '../../../server/agents/copilot/runtime';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * Badan kegagalan mesti MEMUHI DUA kontrak serentak:
 *
 * 1. Kontrak frontend (`src/features/platform/client.ts`): badan sentiasa
 *    mengandungi boolean `ok`, dan bagi `{ ok: false }` ia mesti membawa
 *    `code`, `requestId` dan `message`.
 * 2. Kontrak facad legasi: badan kegagalan turut membawa `error` pada peringkat
 *    teratas (bukan hanya dalam `data`), supaya caller lama yang membaca
 *    `json.error` terus berfungsi.
 *
 * `data` kekal membawa muatan penuh runtime untuk diagnosis.
 */
function failure(
  status: number,
  code: string,
  message: string,
  requestId: string,
  data?: unknown
): Response {
  return Response.json(
    { ok: false, error: code, code, requestId, message, ...(data === undefined ? {} : { data }) },
    { status, headers: JSON_HEADERS }
  );
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return Response.json(
      { ok: true, data: copilotRuntime.describe() },
      { status: 200, headers: JSON_HEADERS }
    );
  }

  if (req.method !== 'POST') {
    return failure(
      405,
      'METHOD_NOT_ALLOWED',
      'Permintaan Copilot hanya menerima kaedah GET atau POST.',
      'copilot-v2'
    );
  }

  const response = await copilotRuntime.handleRequest(req, PUBLIC_ORIGIN_ACTOR);
  const payload = (await response.json()) as CopilotChatResponse & {
    error?: string;
    detail?: string;
  };
  // `requestId` mesti menjejak run sebenar. Runtime menaruhnya dalam badan
  // (untuk run yang berjaya/gagal) dan dalam header (untuk ralat pra-badan),
  // jadi kedua-dua sumber digunakan sebelum jatuh kepada label statik.
  const requestId =
    payload.runId ?? response.headers.get('X-Copilot-Run-Id') ?? 'copilot-v2';

  if (!response.ok) {
    return failure(
      response.status,
      payload.error ?? 'RUNTIME_NOT_READY',
      payload.detail ?? 'Permintaan copilot tidak dapat diproses.',
      requestId,
      payload
    );
  }

  const served =
    payload.status === 'completed' || payload.status === 'partial' || payload.status === 'local_rules';
  if (!served) {
    // Runtime tidak dapat menjawab — frontend menerima ralat sebenar melalui
    // `ok: false` + `code`, dengan payload penuh untuk diagnosis. `error`
    // turut hadir di peringkat teratas untuk kontrak facad legasi.
    const code = payload.reason ?? 'RUNTIME_NOT_READY';
    return Response.json(
      {
        ok: false,
        error: code,
        code,
        requestId,
        message: payload.reasonDetail ?? 'Perkhidmatan model tidak tersedia untuk run ini.',
        data: payload,
      },
      { status: 200, headers: JSON_HEADERS }
    );
  }

  return Response.json({ ok: true, data: payload }, { status: 200, headers: JSON_HEADERS });
}
