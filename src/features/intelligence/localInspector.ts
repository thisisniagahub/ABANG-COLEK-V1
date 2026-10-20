/**
 * ABANGCOLEK Sovereign GrowthOS — EXT-01 local inspector (browser side)
 *
 * The inspector is a developer tool. It is only available on a local
 * development machine; in a production build it returns a typed
 * `unavailable` and nothing is fetched.
 *
 * The browser side never writes telemetry: it only renders what the local
 * server-side inspector returns, already redacted.
 */

export interface LocalInspectorThreadView {
  threadId: string;
  eventCount: number;
  toolCalls: Array<{ toolName: string; durationMs: number; outcome: 'success' | 'error' | 'unknown' }>;
  state: Record<string, unknown>;
  lastEventAt: string;
}

export interface LocalInspectorSnapshot {
  generatedAt: string;
  threads: LocalInspectorThreadView[];
  totals: { threads: number; toolCalls: number; errors: number; totalDurationMs: number };
  persistence: 'in_memory';
  locality: 'local';
}

export type LocalInspectorResult =
  | { available: true; snapshot: LocalInspectorSnapshot }
  | { available: false; reasonCode: string; reason: string };

/** The endpoint the local platform must expose for the inspector. */
export const LOCAL_INSPECTOR_ENDPOINT = '/api/platform/dev/inspector';

/**
 * True when the inspector may be used. The Vite dev server sets
 * `import.meta.env.DEV`; a production build does not.
 */
export function isLocalInspectorEnabled(env: { DEV?: boolean } = import.meta.env as { DEV?: boolean }): boolean {
  return env.DEV === true;
}

/**
 * Loads the local inspector snapshot. Returns a typed `unavailable` when the
 * build is not a development build, or when the local endpoint is missing.
 */
export async function loadLocalInspector(
  options: { fetchImpl?: typeof fetch; endpoint?: string; env?: { DEV?: boolean } } = {},
): Promise<LocalInspectorResult> {
  const enabled = options.env
    ? isLocalInspectorEnabled(options.env)
    : isLocalInspectorEnabled();
  if (!enabled) {
    return {
      available: false,
      reasonCode: 'INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION',
      reason: 'Inspector hanya tersedia pada build pembangunan tempatan.',
    };
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? LOCAL_INSPECTOR_ENDPOINT;
  try {
    const response = await fetchImpl(endpoint, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) {
      return {
        available: false,
        reasonCode: 'INSPECTOR_ENDPOINT_UNAVAILABLE',
        reason: `Endpoint inspector tempatan menjawab HTTP ${response.status}.`,
      };
    }
    const body = (await response.json()) as { data?: LocalInspectorSnapshot };
    if (!body?.data) {
      return {
        available: false,
        reasonCode: 'INSPECTOR_PAYLOAD_INVALID',
        reason: 'Endpoint inspector tempatan tidak mengembalikan snapshot yang sah.',
      };
    }
    return { available: true, snapshot: body.data };
  } catch (error) {
    return {
      available: false,
      reasonCode: 'INSPECTOR_ENDPOINT_UNAVAILABLE',
      reason: error instanceof Error ? error.message : 'Endpoint inspector tempatan tidak dapat dihubungi.',
    };
  }
}
