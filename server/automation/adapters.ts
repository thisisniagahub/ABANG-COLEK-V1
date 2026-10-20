import type { AgentResult, CancelOutcome, LocalStubMarker, PublishIntent, PublishOutcome, ReadOnlyAgentTask, ResearchRequest, UsageSnapshot } from '../../shared/platform-contracts';
import { localStubMarkerOf } from '../../shared/platform-contracts';
import type { LocalStubMarker as RuntimeLocalStubMarker } from './runtimeTransports';
import { fail, integer, list, object, strings, text } from '../platform/store';
import { admitWork } from './jobs';

/**
 * Penanda yang dikongsi mesti IDENTIK dengan penanda runtime sebenar. Jika
 * bentuknya pernah berbeza, pematahan ini menggagalkan kompilasi — supaya
 * tidak pernah ada "penanda kedua" yang diam-diam berbeza bentuk.
 */
type IdenticalTypes<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
export const LOCAL_STUB_MARKER_MATCHES_RUNTIME: IdenticalTypes<RuntimeLocalStubMarker, LocalStubMarker> = true;

/** Transports belong to reviewed host integrations. No undocumented shell/HTTP protocol is invented here. */
export interface ReadOnlyHermesTransport {
  zeroNewSpend: true;
  run(task: ReadOnlyAgentTask, signal: AbortSignal): Promise<AgentResult>;
}
export interface ResearchCollection { summary: string; sources: unknown[]; unknownReasons: string[] }
export interface ReadOnlyResearchTransport {
  zeroNewSpend: true;
  collect(request: ResearchRequest, signal: AbortSignal, onSource?: (source: unknown) => void): Promise<ResearchCollection>;
}
export interface PostizPublisherTransport {
  zeroNewSpend: true;
  channel: string;
  publish(intent: PublishIntent, signal: AbortSignal): Promise<{ providerRef: string; status: 'published' | 'blocked' | 'unknown'; url?: string; reasonCode?: string } & Partial<LocalStubMarker>>;
  reconcile(providerRef: string, signal: AbortSignal): Promise<{ status: 'published' | 'blocked' | 'unknown'; url?: string; reasonCode?: string } & Partial<LocalStubMarker>>;
  cancel(providerRef: string, signal: AbortSignal): Promise<CancelOutcome>;
}

/**
 * Hasil penyesuaian (reconcile). Penanda stub tempatan adalah pilihan: ia hadir
 * HANYA jika transport yang menjawab memang menandakannya sebagai stub tempatan.
 */
export interface PostizReconcileOutcome {
  status: 'published' | 'blocked' | 'unknown';
  providerRef: string;
  url?: string;
  reasonCode: string;
  transport?: LocalStubMarker['transport'];
  delivered?: LocalStubMarker['delivered'];
  externalEffect?: LocalStubMarker['externalEffect'];
}

export interface AutomationOptions {
  hermes?: ReadOnlyHermesTransport;
  agentReach?: ReadOnlyResearchTransport;
  postiz?: PostizPublisherTransport;
  externalUsage?: () => UsageSnapshot;
  timeoutMs?: number;
}
export class HermesAdapter {
  constructor(readonly transport?: ReadOnlyHermesTransport, readonly timeoutMs = 10_000) {}
  async run(task: ReadOnlyAgentTask, usage: UsageSnapshot, signal: AbortSignal): Promise<AgentResult> {
    const denied = (reason: string): AgentResult => ({ status: 'blocked', artifactIds: [], evidenceIds: [], unknownReasons: [reason] });
    if (!this.transport || this.transport.zeroNewSpend !== true) return denied('HERMES_UNAVAILABLE');
    // These are first-party read capabilities, never upstream tool names inferred from documentation.
    if (task.allowedToolIds.some(tool => !['research.sources.read', 'knowledge.approved.read'].includes(tool))) return denied('TOOL_SCOPE_DENIED');
    if (!admitWork({ operation: 'read_only_agent', providerId: usage.providerId, estimatedUnits: 1 }, usage).allowed) return denied('USAGE_NOT_ADMITTED');
    text(task.jobId, 'Job ID', 120); text(task.objective, 'Objective', 2000);
    list(task.sourceRefs, 20);
    if (signal.aborted) return denied('REQUEST_ABORTED');
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const operatorAbort = () => controller.abort();
    signal.addEventListener('abort', operatorAbort, { once: true });
    try {
      const output = object(await Promise.race([
        this.transport.run(task, controller.signal),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('HERMES_TIMEOUT')); }, boundedTimeout(this.timeoutMs)); }),
      ]));
      if (signal.aborted || controller.signal.aborted) return { status: 'unknown', artifactIds: [], evidenceIds: [], unknownReasons: ['HERMES_ABORTED_RESULT_UNVERIFIED'] };
      if (!['completed', 'partial', 'unknown', 'blocked'].includes(String(output.status))) fail('INVALID_AGENT_OUTPUT');
      return { status: output.status as AgentResult['status'], artifactIds: strings(output.artifactIds), evidenceIds: strings(output.evidenceIds), unknownReasons: strings(output.unknownReasons) };
    } catch { return { status: 'unknown', artifactIds: [], evidenceIds: [], unknownReasons: [controller.signal.aborted && !signal.aborted ? 'HERMES_TIMEOUT' : 'HERMES_RESULT_UNVERIFIED'] }; }
    finally { if (timer) clearTimeout(timer); controller.abort(); signal.removeEventListener('abort', operatorAbort); }
  }
}

/** Verified pilot channel publisher adapter with bounded timeout and idempotency. */
export class PostizPublisherAdapter {
  constructor(readonly transport?: PostizPublisherTransport, readonly timeoutMs = 10_000) {}

  async publish(intent: PublishIntent, signal: AbortSignal): Promise<PublishOutcome> {
    const intentId = text(intent.id, 'Intent ID', 120);
    if (!this.transport || this.transport.zeroNewSpend !== true) {
      return { intentId, status: 'blocked', evidenceIds: [], reasonCode: 'REMOTE_PUBLISH_DISABLED' };
    }
    if (intent.channel !== this.transport.channel) {
      return { intentId, status: 'blocked', evidenceIds: [], reasonCode: 'CHANNEL_NOT_SUPPORTED' };
    }
    if (signal.aborted) {
      return { intentId, status: 'blocked', evidenceIds: [], reasonCode: 'REQUEST_ABORTED' };
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const operatorAbort = () => controller.abort();
    signal.addEventListener('abort', operatorAbort, { once: true });
    try {
      const outcome = await Promise.race([
        this.transport.publish(intent, controller.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('POSTIZ_TIMEOUT'));
          }, boundedTimeout(this.timeoutMs));
        }),
      ]);
      return {
        intentId,
        status: outcome.status,
        providerRef: outcome.providerRef,
        evidenceIds: [],
        reasonCode: outcome.reasonCode ?? (outcome.status === 'published' ? 'POSTIZ_PUBLISHED' : 'POSTIZ_FAILED'),
        // Penanda stub tempatan mesti mencapai HTTP response supaya pengguna
        // tidak tersalah anggap hasil ini sebagai penerbitan sebenar. Transport
        // sebenar tidak membawa penanda, jadi tiada penanda dicipta di sini.
        ...localStubMarkerOf(outcome),
      };
    } catch {
      return {
        intentId,
        status: 'unknown',
        evidenceIds: [],
        reasonCode: controller.signal.aborted && !signal.aborted ? 'POSTIZ_TIMEOUT' : 'POSTIZ_RESULT_UNVERIFIED',
      };
    } finally {
      if (timer) clearTimeout(timer);
      controller.abort();
      signal.removeEventListener('abort', operatorAbort);
    }
  }

  async reconcile(providerRef: string, signal: AbortSignal = new AbortController().signal): Promise<PostizReconcileOutcome> {
    const safeRef = text(providerRef, 'Provider reference', 200);
    if (!this.transport || this.transport.zeroNewSpend !== true) {
      return { status: 'unknown', providerRef: safeRef, reasonCode: 'REMOTE_PUBLISH_DISABLED' };
    }
    try {
      const outcome = await this.transport.reconcile(safeRef, signal);
      // Penanda stub tempatan dihantar terus — penyesuaian tempatan juga
      // tidak boleh mengesahkan penerbitan luaran.
      return { status: outcome.status, providerRef: safeRef, url: outcome.url, reasonCode: outcome.reasonCode ?? 'RECONCILED', ...localStubMarkerOf(outcome) };
    } catch {
      return { status: 'unknown', providerRef: safeRef, reasonCode: 'RECONCILIATION_FAILED' };
    }
  }

  async cancel(providerRef: string, signal: AbortSignal = new AbortController().signal): Promise<CancelOutcome> {
    const safeRef = text(providerRef, 'Provider reference', 200);
    if (!this.transport || this.transport.zeroNewSpend !== true) {
      return { providerRef: safeRef, status: 'unknown', evidenceIds: [] };
    }
    return this.transport.cancel(safeRef, signal);
  }
}

export const boundedTimeout = (value: number | undefined) => integer(value ?? 10_000, 'Research timeout', 10, 10_000);
