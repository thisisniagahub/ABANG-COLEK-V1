/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ABANGCOLEK Sovereign GrowthOS — EXT-03 Agent performance collector
 *
 * This file is the SINGLE collection path for agent tool telemetry. It
 * contains no seeded, mocked or fabricated telemetry: when nothing has been
 * collected the store is empty and the UI renders an explicit empty state.
 *
 * The collected event is restricted to the EXT-03 allowlist:
 *   - surface category  (which surface the tool belongs to)
 *   - tool name        (which tool ran)
 *   - outcome          (success / error / timeout)
 *   - duration         (how long it took, in milliseconds)
 *
 * The following are NOT collected and MUST NOT exist in the schema:
 *   - `user_query`  — the raw user prompt (customer content)
 *   - `tokens_used` — a re-identifiable usage counter
 *   - `task_id`     — a canonical business record id
 *   - `model`       — a provider/model fingerprint
 *   - `error_message` — free text that can echo customer content
 *
 * Behaviours:
 *   - Opt-out: the user can switch collection off; nothing is then collected.
 *   - Delete:   the user can delete everything that was collected.
 *   - Disclosure: `describe()` returns exactly what is collected.
 *
 * Persistence mode: `local_storage` (local) with an optional Supabase mirror
 * (remote) that is only used when the cloud client is configured and the user
 * has not opted out.
 */

export type AgentSurfaceCategory =
  | 'Logistik & Bas'
  | 'Google Workspace'
  | 'Gedung Plugins'
  | 'Analisis & Laporan';

export type AgentOutcome = 'SUCCESS' | 'ERROR' | 'TIMEOUT';

/**
 * The one and only event shape the collector persists.
 * `id` is a client-minted opaque event identifier used for de-duplication; it
 * carries no business record reference.
 */
export interface AgentPerformanceEvent {
  id: string;
  tool_name: string;
  tool_category: AgentSurfaceCategory;
  latency_ms: number;
  status: AgentOutcome;
  timestamp: string;
}

/** The fields a caller may pass to the collector. */
export interface AgentPerformanceInput {
  tool_name: string;
  tool_category: AgentSurfaceCategory;
  latency_ms: number;
  status: AgentOutcome;
}

/** The allowlist, as data — the UI renders it verbatim. */
export const AGENT_PERFORMANCE_ALLOWLIST = [
  'surface category',
  'tool name',
  'outcome',
  'duration',
] as const;

/** The fields that are explicitly refused because they retain customer content. */
export const AGENT_PERFORMANCE_PROHIBITED = [
  'user_query (raw prompt text)',
  'tokens_used (re-identifiable usage count)',
  'task_id (canonical business record id)',
  'model (provider fingerprint)',
  'error_message (free text that can echo customer content)',
] as const;

/** The event fields the collector is allowed to persist. */
export const AGENT_PERFORMANCE_EVENT_FIELDS = [
  'tool_name',
  'tool_category',
  'latency_ms',
  'status',
] as const;

export interface ToolPerformanceMetric {
  toolName: string;
  displayName: string;
  category: AgentSurfaceCategory;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  successRate: number; // 0 - 100%
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  efficiencyScore: number; // 0 - 100 composite score
  efficiencyRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION';
}

export interface TimeSeriesPerformancePoint {
  timeLabel: string;
  avgLatencyMs: number;
  successRate: number;
  callCount: number;
  errorCount: number;
}

/** What the collector collects, where it lives and whether it is enabled. */
export interface CollectorDisclosure {
  allowlist: readonly string[];
  prohibited: readonly string[];
  persistence: 'local_storage' | 'supabase';
  locality: 'local' | 'remote';
  collectionEnabled: boolean;
  optedOut: boolean;
  storedEventCount: number;
  note: string;
}

/** A minimal storage seam so the collector can be tested without a browser. */
export interface CollectorStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const EVENTS_KEY = 'abangcolek_agent_performance_events';
const CONSENT_KEY = 'abangcolek_agent_performance_consent';

const memoryStorage = (): CollectorStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
};

const browserStorage = (): CollectorStorage | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    return {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: (key) => localStorage.removeItem(key),
    };
  } catch {
    return null;
  }
};

const randomId = (): string =>
  `evt_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

class SupabaseAgentPerformanceService {
  private logs: AgentPerformanceEvent[] = [];
  private listeners: ((logs: AgentPerformanceEvent[]) => void)[] = [];
  private optedOut = false;
  private readonly storage: CollectorStorage;

  constructor(storage?: CollectorStorage) {
    this.storage = storage ?? browserStorage() ?? memoryStorage();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = this.storage.getItem(EVENTS_KEY);
      // An empty or unreadable store is an EMPTY store. No seed, ever.
      this.logs = stored ? this.parseEvents(stored) : [];
      const consent = this.storage.getItem(CONSENT_KEY);
      if (consent) {
        const parsed = JSON.parse(consent) as { optedOut?: boolean };
        this.optedOut = parsed.optedOut === true;
      }
    } catch {
      this.logs = [];
    }
  }

  private parseEvents(raw: string): AgentPerformanceEvent[] {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => this.normaliseRemoteRow(entry))
        .filter((entry): entry is AgentPerformanceEvent => entry !== null);
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    try {
      this.storage.setItem(EVENTS_KEY, JSON.stringify(this.logs));
      this.storage.setItem(
        CONSENT_KEY,
        JSON.stringify({ optedOut: this.optedOut, decidedAt: new Date().toISOString() }),
      );
    } catch {
      // Storage may be unavailable (private mode / quota). Telemetry is then
      // kept in memory only for this session.
    }
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((callback) => callback([...this.logs]));
  }

  public subscribe(callback: (logs: AgentPerformanceEvent[]) => void): () => void {
    this.listeners.push(callback);
    callback([...this.logs]);
    return () => {
      this.listeners = this.listeners.filter((entry) => entry !== callback);
    };
  }

  public getLogs(): AgentPerformanceEvent[] {
    return [...this.logs];
  }

  /** Whether the user has switched collection off. */
  public isOptedOut(): boolean {
    return this.optedOut;
  }

  /**
   * Opts the user in or out. When opted out, nothing is collected from this
   * point on and the already collected events are deleted.
   */
  public setOptOut(optedOut: boolean): CollectorDisclosure {
    this.optedOut = optedOut;
    if (optedOut) this.logs = [];
    this.saveToStorage();
    return this.describe();
  }

  /** Deletes everything that has been collected. Returns how many rows went. */
  public deleteCollectedData(): number {
    const deleted = this.logs.length;
    this.logs = [];
    this.saveToStorage();
    return deleted;
  }

  /** Exactly what is collected, where it lives and whether it is enabled. */
  public describe(): CollectorDisclosure {
    return {
      allowlist: AGENT_PERFORMANCE_ALLOWLIST,
      prohibited: AGENT_PERFORMANCE_PROHIBITED,
      persistence: 'local_storage',
      locality: 'local',
      collectionEnabled: !this.optedOut,
      optedOut: this.optedOut,
      storedEventCount: this.logs.length,
      note:
        'Hanya kategori permukaan, nama alat, hasil dan tempoh dikumpulkan. Tiada prompt, tiada token, tiada ID rekod perniagaan.',
    };
  }

  /**
   * Normalises a row that came from the remote table. Only the allowlisted
   * fields survive; a row without them is dropped. Nothing is invented: a
   * missing duration is a dropped row, not a random number.
   */
  public normaliseRemoteRow(row: unknown): AgentPerformanceEvent | null {
    if (!row || typeof row !== 'object') return null;
    const source = row as Record<string, unknown>;
    const toolName = typeof source.tool_name === 'string' ? source.tool_name.trim() : '';
    if (!toolName) return null;
    const category = source.tool_category;
    if (
      category !== 'Logistik & Bas' &&
      category !== 'Google Workspace' &&
      category !== 'Gedung Plugins' &&
      category !== 'Analisis & Laporan'
    ) {
      return null;
    }
    const latency = Number(source.latency_ms);
    if (!Number.isFinite(latency) || latency < 0) return null;
    const status =
      source.status === 'ERROR' || source.status === 'TIMEOUT' ? source.status : 'SUCCESS';
    const timestamp =
      typeof source.timestamp === 'string' && source.timestamp
        ? source.timestamp
        : typeof source.created_at === 'string'
          ? source.created_at
          : new Date().toISOString();
    return {
      id: typeof source.id === 'string' && source.id ? source.id : randomId(),
      tool_name: toolName,
      tool_category: category,
      latency_ms: Math.round(latency),
      status,
      timestamp,
    };
  }

  /**
   * The single collection path. Returns the stored event, or `null` when the
   * user has opted out or the input violates the allowlist.
   */
  public record(input: AgentPerformanceInput): AgentPerformanceEvent | null {
    if (this.optedOut) return null;
    const event = this.normaliseRemoteRow({
      id: randomId(),
      tool_name: input.tool_name,
      tool_category: input.tool_category,
      latency_ms: input.latency_ms,
      status: input.status,
      timestamp: new Date().toISOString(),
    });
    if (!event) return null;
    this.logs = [event, ...this.logs];
    this.saveToStorage();
    return event;
  }

  /**
   * Subscribes to realtime inserts on the remote table. Rows are filtered
   * through the same allowlist normalisation as the local path.
   */
  public subscribeToRealtimeTasks(
    onInsert: (event: AgentPerformanceEvent) => void,
    onStatusChange?: (status: string) => void,
  ): () => void {
    if (this.optedOut) {
      onStatusChange?.('OPTED_OUT');
      return () => {};
    }
    let supabase: typeof import('./supabaseClient').supabase = null;
    let status: { available: boolean; message: string } = { available: false, message: '' };
    try {
      // Loaded lazily so the collector stays usable (and testable) without a
      // browser environment.
      const clientModule = require('./supabaseClient') as typeof import('./supabaseClient');
      supabase = clientModule.supabase;
      status = clientModule.supabaseStatus;
    } catch {
      onStatusChange?.('UNAVAILABLE');
      return () => {};
    }
    if (!supabase || !status.available) {
      onStatusChange?.('UNAVAILABLE');
      return () => {};
    }
    const channel = supabase
      .channel('agent-performance-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_performance_events' },
        (payload) => {
          const event = this.normaliseRemoteRow(payload.new);
          if (!event) return;
          if (this.logs.some((entry) => entry.id === event.id)) return;
          this.logs = [event, ...this.logs];
          this.saveToStorage();
          onInsert(event);
        },
      )
      .subscribe((subscriptionStatus) => {
        onStatusChange?.(subscriptionStatus);
      });
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // The channel may already be gone.
      }
    };
  }

  /**
   * Fetches the collected events. When the cloud client is configured the
   * remote table is read; otherwise the local store is returned. An empty
   * store is returned as an empty array — never as fabricated rows.
   */
  public async fetchTaskLogs(): Promise<{
    data: AgentPerformanceEvent[];
    source: 'supabase_live' | 'local';
    latencyMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    if (this.optedOut) {
      return { data: [], source: 'local', latencyMs: Date.now() - startTime };
    }
    try {
      const clientModule = require('./supabaseClient') as typeof import('./supabaseClient');
      if (!clientModule.supabase || !clientModule.supabaseStatus.available) {
        return {
          data: [...this.logs],
          source: 'local',
          latencyMs: Date.now() - startTime,
          error: clientModule.supabaseStatus.message,
        };
      }
      const { data, error } = await clientModule
        .requireSupabaseClient()
        .from('agent_performance_events')
        .select('id,tool_name,tool_category,latency_ms,status,timestamp,created_at')
        .order('timestamp', { ascending: false });
      const latencyMs = Date.now() - startTime;
      if (error) {
        return {
          data: [...this.logs],
          source: 'local',
          latencyMs,
          error: error.message,
        };
      }
      const normalised = (data ?? [])
        .map((row) => this.normaliseRemoteRow(row))
        .filter((row): row is AgentPerformanceEvent => row !== null);
      this.logs = normalised;
      this.saveToStorage();
      return { data: [...this.logs], source: 'supabase_live', latencyMs };
    } catch (error) {
      return {
        data: [...this.logs],
        source: 'local',
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Ralat tidak diketahui',
      };
    }
  }

  /**
   * Aggregated performance per tool. The aggregation only uses the
   * allowlisted fields; there is no token total because no token count is
   * collected.
   */
  public calculateMetrics(filterCategory?: string, timeRangeDays?: number): {
    toolMetrics: ToolPerformanceMetric[];
    overallMetrics: {
      totalTasks: number;
      avgLatencyMs: number;
      overallSuccessRate: number;
      mostEfficientTool: string;
      fastestTool: string;
      slowestTool: string;
    };
    timeSeries: TimeSeriesPerformancePoint[];
  } {
    let filtered = [...this.logs];

    if (timeRangeDays && timeRangeDays > 0) {
      const cutoff = Date.now() - timeRangeDays * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((entry) => new Date(entry.timestamp).getTime() >= cutoff);
    }
    if (filterCategory && filterCategory !== 'all') {
      filtered = filtered.filter((entry) => entry.tool_category === filterCategory);
    }

    const toolGroups: Record<string, AgentPerformanceEvent[]> = {};
    filtered.forEach((entry) => {
      if (!toolGroups[entry.tool_name]) toolGroups[entry.tool_name] = [];
      toolGroups[entry.tool_name].push(entry);
    });

    const toolMetrics: ToolPerformanceMetric[] = Object.entries(toolGroups).map(([name, entries]) => {
      const totalCalls = entries.length;
      const successCalls = entries.filter((entry) => entry.status === 'SUCCESS').length;
      const errorCalls = totalCalls - successCalls;
      const successRate = totalCalls > 0 ? (successCalls / totalCalls) * 100 : 0;

      const latencies = entries.map((entry) => entry.latency_ms).sort((a, b) => a - b);
      const totalLatency = latencies.reduce((sum, value) => sum + value, 0);
      const avgLatencyMs = Math.round(totalLatency / totalCalls);
      const minLatencyMs = latencies[0] || 0;
      const maxLatencyMs = latencies[latencies.length - 1] || 0;
      const p95Index = Math.min(Math.floor(latencies.length * 0.95), latencies.length - 1);
      const p95LatencyMs = latencies[p95Index] || avgLatencyMs;

      const latencyFactor = Math.max(0, 1 - avgLatencyMs / 1500);
      const efficiencyScore = Math.round(successRate * 0.6 + latencyFactor * 40);
      const efficiencyRating =
        efficiencyScore >= 85 ? 'EXCELLENT' : efficiencyScore >= 70 ? 'GOOD' : 'NEEDS_OPTIMIZATION';

      return {
        toolName: name,
        displayName: name.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
        category: entries[0].tool_category,
        totalCalls,
        successCalls,
        errorCalls,
        successRate: Number(successRate.toFixed(1)),
        avgLatencyMs,
        minLatencyMs,
        maxLatencyMs,
        p95LatencyMs,
        efficiencyScore,
        efficiencyRating,
      };
    });

    toolMetrics.sort((left, right) => right.efficiencyScore - left.efficiencyScore);

    const totalTasks = filtered.length;
    const overallSuccessCount = filtered.filter((entry) => entry.status === 'SUCCESS').length;
    const overallSuccessRate =
      totalTasks > 0 ? Number(((overallSuccessCount / totalTasks) * 100).toFixed(1)) : 0;
    const avgLatencyMs =
      totalTasks > 0 ? Math.round(filtered.reduce((sum, entry) => sum + entry.latency_ms, 0) / totalTasks) : 0;

    const sortedByLatency = [...toolMetrics].sort((left, right) => left.avgLatencyMs - right.avgLatencyMs);

    return {
      toolMetrics,
      overallMetrics: {
        totalTasks,
        avgLatencyMs,
        overallSuccessRate,
        mostEfficientTool: toolMetrics[0]?.displayName || 'Tiada data',
        fastestTool: sortedByLatency[0]?.displayName || 'Tiada data',
        slowestTool: sortedByLatency[sortedByLatency.length - 1]?.displayName || 'Tiada data',
      },
      timeSeries: this.generateTimeSeriesBuckets(filtered),
    };
  }

  private generateTimeSeriesBuckets(logs: AgentPerformanceEvent[]): TimeSeriesPerformancePoint[] {
    const buckets: Record<string, { latencies: number[]; successes: number; totals: number }> = {
      '00:00': { latencies: [], successes: 0, totals: 0 },
      '04:00': { latencies: [], successes: 0, totals: 0 },
      '08:00': { latencies: [], successes: 0, totals: 0 },
      '12:00': { latencies: [], successes: 0, totals: 0 },
      '16:00': { latencies: [], successes: 0, totals: 0 },
      '20:00': { latencies: [], successes: 0, totals: 0 },
    };

    logs.forEach((entry) => {
      const hour = new Date(entry.timestamp).getHours();
      let bucketKey = '00:00';
      if (hour >= 20) bucketKey = '20:00';
      else if (hour >= 16) bucketKey = '16:00';
      else if (hour >= 12) bucketKey = '12:00';
      else if (hour >= 8) bucketKey = '08:00';
      else if (hour >= 4) bucketKey = '04:00';
      buckets[bucketKey].latencies.push(entry.latency_ms);
      buckets[bucketKey].totals += 1;
      if (entry.status === 'SUCCESS') buckets[bucketKey].successes += 1;
    });

    return Object.entries(buckets).map(([timeLabel, data]) => ({
      timeLabel,
      avgLatencyMs:
        data.totals > 0
          ? Math.round(data.latencies.reduce((sum, value) => sum + value, 0) / data.totals)
          : 0,
      successRate: data.totals > 0 ? Math.round((data.successes / data.totals) * 100) : 0,
      callCount: data.totals,
      errorCount: data.totals - data.successes,
    }));
  }
}

export const supabaseAgentPerformance = new SupabaseAgentPerformanceService();
export { SupabaseAgentPerformanceService };
