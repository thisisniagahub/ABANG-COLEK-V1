/**
 * EXT-03 — the agent performance collector.
 *
 * The defect this file locks down: the collector used to ship a 40-row
 * hardcoded "seed" dataset and stored the raw user prompt (`user_query`)
 * and a token counter (`tokens_used`). Both are outside the EXT-03
 * allowlist.
 *
 * These tests prove:
 *  - the seed is gone (no fabricated rows anywhere);
 *  - the prohibited fields do not exist in the schema;
 *  - the collector is a single path with an explicit allowlist;
 *  - a user can opt out;
 *  - a user can delete what was collected;
 *  - a user can see what is collected.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SupabaseAgentPerformanceService,
  AGENT_PERFORMANCE_ALLOWLIST,
  AGENT_PERFORMANCE_PROHIBITED,
  type CollectorStorage,
} from '../../src/services/supabaseAgentPerformance';

const SERVICE_PATH = join(process.cwd(), 'src', 'services', 'supabaseAgentPerformance.ts');

function memoryStorage(): CollectorStorage & { size(): number } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    size: () => map.size,
  };
}

function build() {
  const storage = memoryStorage();
  return { storage, service: new SupabaseAgentPerformanceService(storage) };
}

describe('EXT-03 — agent performance collector', () => {
  test('the 40-row seed dataset is gone from the service', () => {
    const source = readFileSync(SERVICE_PATH, 'utf8');
    expect(source).not.toContain('INITIAL_PERFORMANCE_SEED');
    expect(source).not.toContain('TLOG-001');
    // No seed array literal is left behind under any other name.
    expect(source).not.toMatch(/const\s+\w*SEED\w*\s*:/);
  });

  test('the prohibited fields do not exist in the schema', () => {
    const source = readFileSync(SERVICE_PATH, 'utf8');
    // The stored event shape is the schema. The prohibited field names must
    // not be declared there (they only appear in the disclosure list, which
    // names them precisely so the UI can state what is NOT collected).
    const schema = source.match(/export interface AgentPerformanceEvent \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(schema.length).toBeGreaterThan(0);
    for (const prohibited of ['user_query', 'tokens_used', 'task_id', 'error_message', 'model']) {
      expect(schema).not.toContain(prohibited);
    }
    // The input type a caller may pass is the same story.
    const input = source.match(/export interface AgentPerformanceInput \{[\s\S]*?\n\}/)?.[0] ?? '';
    for (const prohibited of ['user_query', 'tokens_used', 'task_id', 'error_message', 'model']) {
      expect(input).not.toContain(prohibited);
    }
  });

  test('a fresh collector holds no fabricated rows', () => {
    const { service } = build();
    expect(service.getLogs()).toEqual([]);
    expect(service.describe().storedEventCount).toBe(0);
  });

  test('the disclosure states the allowlist, the prohibited fields and the persistence mode', () => {
    const { service } = build();
    const disclosure = service.describe();
    expect(disclosure.allowlist).toEqual(AGENT_PERFORMANCE_ALLOWLIST);
    expect(disclosure.prohibited).toEqual(AGENT_PERFORMANCE_PROHIBITED);
    expect(disclosure.persistence).toBe('local_storage');
    expect(disclosure.locality).toBe('local');
    expect(disclosure.collectionEnabled).toBe(true);
    expect(disclosure.note.length).toBeGreaterThan(0);
  });

  test('the collector stores only the allowlisted fields', () => {
    const { service } = build();
    const event = service.record({
      tool_name: 'bus_freight_schedule',
      tool_category: 'Logistik & Bas',
      latency_ms: 210,
      status: 'SUCCESS',
    });
    expect(event).not.toBeNull();
    expect(Object.keys(event!).sort()).toEqual([
      'id',
      'latency_ms',
      'status',
      'timestamp',
      'tool_category',
      'tool_name',
    ]);
    expect(service.getLogs()).toHaveLength(1);
  });

  test('a remote row without the allowlisted fields is dropped, not invented', () => {
    const { service } = build();
    const dropped = service.normaliseRemoteRow({ id: 'x', latency_ms: 100 });
    expect(dropped).toBeNull();
    const kept = service.normaliseRemoteRow({
      id: 'y',
      tool_name: 'send_gmail_email',
      tool_category: 'Google Workspace',
      latency_ms: 360,
      status: 'ERROR',
      timestamp: '2026-10-20T00:00:00.000Z',
    });
    expect(kept?.tool_name).toBe('send_gmail_email');
    expect(kept?.status).toBe('ERROR');
  });

  test('the user can opt out and nothing is collected afterwards', () => {
    const { service } = build();
    service.record({
      tool_name: 'create_google_sheet',
      tool_category: 'Google Workspace',
      latency_ms: 480,
      status: 'SUCCESS',
    });
    expect(service.getLogs()).toHaveLength(1);

    const disclosure = service.setOptOut(true);
    expect(disclosure.optedOut).toBe(true);
    expect(disclosure.collectionEnabled).toBe(false);
    // Opting out also removes what was already collected.
    expect(service.getLogs()).toEqual([]);

    const after = service.record({
      tool_name: 'create_google_sheet',
      tool_category: 'Google Workspace',
      latency_ms: 480,
      status: 'SUCCESS',
    });
    expect(after).toBeNull();
    expect(service.getLogs()).toEqual([]);
  });

  test('the user can delete everything that was collected', () => {
    const { service } = build();
    for (let index = 0; index < 3; index += 1) {
      service.record({
        tool_name: 'supabase_query_db',
        tool_category: 'Gedung Plugins',
        latency_ms: 150 + index,
        status: 'SUCCESS',
      });
    }
    expect(service.getLogs()).toHaveLength(3);
    const deleted = service.deleteCollectedData();
    expect(deleted).toBe(3);
    expect(service.getLogs()).toEqual([]);
    expect(service.describe().storedEventCount).toBe(0);
  });

  test('the opt-out state survives a reload of the collector', () => {
    const storage = memoryStorage();
    const first = new SupabaseAgentPerformanceService(storage);
    first.setOptOut(true);
    const second = new SupabaseAgentPerformanceService(storage);
    expect(second.isOptedOut()).toBe(true);
    expect(
      second.record({
        tool_name: 'create_google_task',
        tool_category: 'Google Workspace',
        latency_ms: 210,
        status: 'SUCCESS',
      }),
    ).toBeNull();
  });

  test('the aggregated metrics use only the collected fields', () => {
    const { service } = build();
    service.record({
      tool_name: 'jev_classify_issue',
      tool_category: 'Analisis & Laporan',
      latency_ms: 310,
      status: 'SUCCESS',
    });
    service.record({
      tool_name: 'jev_classify_issue',
      tool_category: 'Analisis & Laporan',
      latency_ms: 410,
      status: 'ERROR',
    });
    const metrics = service.calculateMetrics('all', 7);
    expect(metrics.overallMetrics.totalTasks).toBe(2);
    expect(metrics.overallMetrics.overallSuccessRate).toBe(50);
    expect(metrics.toolMetrics).toHaveLength(1);
    expect(metrics.toolMetrics[0].toolName).toBe('jev_classify_issue');
    // No token total exists any more: the count of tokens is not collected.
    expect('totalTokens' in metrics.overallMetrics).toBe(false);
    expect('avgTokens' in metrics.toolMetrics[0]).toBe(false);
  });
});
