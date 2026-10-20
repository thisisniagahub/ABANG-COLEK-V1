/**
 * Shared fixtures for the Copilot runtime descriptor contract tests.
 *
 * The two descriptors below are COPIES of what the server really serves:
 *
 *  - `OFFICIAL_RUNTIME_DESCRIPTOR` — `GET /api/copilotkit/descriptor`
 *    (`api/copilotkit.ts`, `runtimeDescriptor()`). Served RAW: no `{ ok, data }`
 *    wrapper.
 *  - `LEGACY_KEYWORD_ROUTER_DESCRIPTOR` — the project-local keyword router
 *    descriptor (`server/platform/app.ts`, `/copilot/v2`). It describes a
 *    DIFFERENT runtime and must never be read as the official one.
 *
 * Nothing here is invented: field names and values are quoted from the server
 * code so a drift in the server shows up as a failing test.
 */

import { A2UI_ALLOWLISTED_COMPONENTS } from '../../shared/copilot-contracts';

/** The exact body `GET /api/copilotkit/descriptor` serves. */
export const OFFICIAL_RUNTIME_DESCRIPTOR = {
  version: '2.0.0',
  runtime: 'copilotkit-v2-agui',
  schema: 'a2ui.v1',
  activeProvider: 'gemini_free',
  candidateModels: [
    {
      providerId: 'gemini_free',
      model: 'gemini-3.6-flash',
      name: 'Gemini 3.6 Flash (Primary Free)',
    },
    {
      providerId: 'gemini_free',
      model: 'gemini-3.5-flash-lite',
      name: 'Gemini 3.5 Flash-Lite (Fallback Free)',
    },
    {
      providerId: 'openrouter',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      name: 'NVIDIA Nemotron 3 Ultra 550B Free (OpenRouter Free)',
    },
  ],
  allowlistedComponents: [...A2UI_ALLOWLISTED_COMPONENTS],
  paidFallbackAllowed: false,
  aguiProtocolImplemented: true,
  copilotkitRuntimeImplemented: true,
  copilotkitRuntimeVersion: '1.79.1',
  aguiRunRoute: '/api/copilotkit/agent/abangcolek/run',
  platformRunRoute: '/api/copilotkit',
  platformRunContract: 'server/agents/copilot/runtime.ts#CopilotV2Runtime',
  providerReachability: 'verified-per-run-only',
  notes:
    'Descriptor ini hanya menyatakan apa yang sebenarnya melayani. '
    + 'Status sebenar provider hanya diketahui selepas satu run; '
    + 'run tanpa provider mengembalikan `unavailable` / `RUNTIME_NOT_READY`.',
};

/** The exact body the project-local keyword router serves for `/copilot/v2`. */
export const LEGACY_KEYWORD_ROUTER_DESCRIPTOR = {
  version: '2.0.0',
  runtime: 'local-keyword-router',
  transport: 'http-json-sse',
  aguiProtocolImplemented: false,
  copilotkitRuntimeImplemented: false,
  aguiEventContract: 'project-local-sse-events',
  aguiEventNames: [
    'start',
    'text_delta',
    'a2ui',
    'gen_ui',
    'hitl_prompt',
    'done',
    'error',
  ],
  schema: 'a2ui.v1',
  a2uiSchemaImplemented: true,
  activeProvider: 'gemini_free',
  candidateModels: [
    {
      providerId: 'gemini_free',
      model: 'gemini-3.6-flash',
      name: 'Gemini 3.6 Flash (Primary Free)',
    },
    {
      providerId: 'gemini_free',
      model: 'gemini-3.5-flash-lite',
      name: 'Gemini 3.5 Flash-Lite (Fallback Free)',
    },
    {
      providerId: 'openrouter',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      name: 'NVIDIA Nemotron 3 Ultra 550B Free (OpenRouter Free)',
    },
  ],
  allowlistedComponents: [...A2UI_ALLOWLISTED_COMPONENTS],
  paidFallbackAllowed: false,
  notes:
    'Dilayani oleh server/platform/adkAgent.ts (router kata kunci + penilai margin kanonikal). '
    + 'Runtime CopilotKit rasmi belum dipasang pada laluan ini.',
};

/** Builds a JSON response like the ones the server serves. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * Matches a real `disabled` ATTRIBUTE.
 *
 * The `disabled:` Tailwind utilities inside the `class` attribute are NOT a
 * disabled control, so the pattern requires `disabled` to be followed by
 * `=`, whitespace, or `>`.
 */
export const TEXTAREA_DISABLED = /<textarea\b[^>]*\sdisabled(=|\s|>)/;
export const SUBMIT_DISABLED = /<button type="submit"[^>]*\sdisabled(=|\s|>)/;

/**
 * Runs `run` with `globalThis.fetch` replaced by `handler`.
 *
 * The platform client resolves `fetch` at call time, so the mock intercepts
 * the real network call without touching the module under test.
 */
export async function withMockedFetch<T>(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
  run: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init)) as unknown as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}
