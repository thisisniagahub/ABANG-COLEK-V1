import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { A2UI_ALLOWLISTED_COMPONENTS, validateA2UIComponent } from '../../../shared/copilot-contracts';
import type { OrderRecord, SessionData } from '../../../shared/platform-contracts';
import type { DealerCommissionSummary } from '../../../shared/growth-contracts';
import { CopilotSurfaceCard } from '../copilot/components/CopilotSurfaceCard';
import {
  createFrontendToolAdapter,
  extractAguiFrontendToolActions,
  FRONTEND_ACTION_TYPES,
} from '../copilot/components/frontendToolAdapters';
import { OrderSummaryCard } from '../copilot/cards/OrderSummaryCard';
import { OrderTrackingCard } from '../copilot/cards/OrderTrackingCard';
import { CommissionSummaryCard } from '../copilot/cards/CommissionSummaryCard';
import { JevAssessmentCard } from '../copilot/cards/JevAssessmentCard';
import { MarginSummaryCard } from '../copilot/cards/MarginSummaryCard';
import { A2UIFixedRenderer } from '../copilot/declarative/A2UIFixedRenderer';
import { ApprovalReviewCard } from '../copilot/interactive/ApprovalReviewCard';
import {
  MarginSimulatorForm,
  type MarginSimulationDraft,
  type MarginSimulationServerReceipt,
} from '../copilot/interactive/MarginSimulatorForm';
import { McpAppSandboxHostFrame } from '../copilot/mcp-apps/OperationsBriefApp';
import { ScopedStateView } from '../copilot/state-rendering/ScopedStateView';
import { buildScopedStateProjection } from '../copilot/state-rendering/scopedStateProjection';
import { ToolStatusView } from '../copilot/tool-rendering/ToolStatusView';
import {
  initialAguiRunState,
  reduceAguiEvent,
  runToolStatus,
  type AguiRunState,
} from '../copilot/agui/aguiRunState';
import { streamCopilotRun } from '../copilot/agui/aguiClient';
import { buildCopilotRunRequest } from '../copilot/agui/copilotRunRequest';
import {
  copilotRunController,
  describeRunCorrelation,
} from '../copilot/runIdentity';
import type { CopilotRunController, CopilotRunIdentity } from '../intelligence/copilotRunController';
import { api, apiRawJson, currentCsrfToken, PlatformError } from '../platform/client';

export interface WorkspaceLiveDataCards {
  latestOrder?: OrderRecord | null;
  commissionSummary?: DealerCommissionSummary | null;
  latestJev?: {
    issueClass: 'LEAKAGE' | 'CAP_DEFECT' | 'TASTE_ANOMALY' | 'LABEL_MISPRINT';
    rootCause: 'UNDETERMINED' | 'SUPPLIER_BATCH_CONTAMINATION' | 'PACKAGING_CRIMP_FAILURE';
    sopAction: string;
    evaluationState: 'reviewed' | 'pending_quarantine';
    evidencePhotoRequired: boolean;
    revision?: number | string;
  } | null;
  latestMargin?: {
    contributionSen: number;
    contributionMarginPct: number;
    requiredContributionSen: number;
    requiredMarginPct: number;
    status: 'PASSED' | 'INSUFFICIENT_CASH_MARGIN' | 'INSUFFICIENT_PERCENT_MARGIN';
    revision?: number | string;
  } | null;
}

/**
 * GUI-01 / GUI-07: Fetches workspace operational projections from the same `/orders`
 * and `/dealer/commissions` platform API paths as the rest of the workspace.
 */
export async function loadWorkspaceLiveDataCards(
  fetcher: <T>(path: string) => Promise<T> = api,
): Promise<WorkspaceLiveDataCards> {
  const [orders, commissionSummary] = await Promise.all([
    fetcher<OrderRecord[]>('/orders').catch(() => []),
    fetcher<DealerCommissionSummary>('/dealer/commissions').catch(() => null),
  ]);
  return {
    latestOrder: Array.isArray(orders) && orders.length > 0 ? orders[0] : null,
    commissionSummary: commissionSummary ?? null,
  };
}

/**
 * Kontrak descriptor runtime — bentuk asas yang dikongsi oleh descriptor
 * rasmi (`api/copilotkit.ts`) dan descriptor legasi (`server/platform/app.ts`).
 *
 * Bentuk ini SAHAJA tidak membuktikan apa-apa: ia hanya menyatakan kontrak
 * data. Bukti bahwa runtime CopilotKit rasmi benar-benar berkhidmat datang
 * daripada medan penanda pelaksanaan dalam `CopilotRuntimeDescriptor`.
 */
export type CopilotV2Descriptor = {
  version: '2.0.0';
  runtime: 'copilotkit-v2-agui';
  schema: 'a2ui.v1';
  activeProvider: string;
  candidateModels: Array<{ providerId: string; model: string; name: string }>;
  allowlistedComponents: string[];
  paidFallbackAllowed: false;
};

/**
 * Descriptor rasmi yang diservis oleh `GET /api/copilotkit/descriptor`.
 *
 * Ia adalah descriptor asas DAN penanda pelaksanaan yang jujur:
 * `copilotkitRuntimeImplemented` / `aguiProtocolImplemented` mesti `true`, dan
 * laluan run mesti dinyatakan. Tanpa penanda itu, descriptor hanya
 * menyatakan kontrak data — UI mesti tetap melumpuhkan chat.
 */
export type CopilotRuntimeDescriptor = CopilotV2Descriptor & {
  aguiProtocolImplemented: true;
  copilotkitRuntimeImplemented: true;
  copilotkitRuntimeVersion: string;
  aguiRunRoute: string;
  platformRunRoute: string;
  providerReachability: string;
};

export type RuntimeCheckState =
  | { kind: 'checking' }
  | { kind: 'unavailable'; code: string }
  | { kind: 'unrecognized' }
  | { kind: 'descriptor'; value: CopilotRuntimeDescriptor };

/**
 * Laluan descriptor rasmi. Ia adalah endpoint yang MEMERIHALKAN laluan yang
 * dikendalikan oleh runtime CopilotKit rasmi — bukan router kata kunci
 * tempatan — jadi itulah tempat frontend bertanya "adakah runtime rasmi
 * benar-benar berkhidmat?".
 */
export const RUNTIME_DESCRIPTOR_PATH = '/api/copilotkit/descriptor';

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  a2ui?: unknown;
  hitlAction?: unknown;
  createdAt: string;
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Kontrak descriptor asas. Ia tidak menyatakan bahawa runtime rasmi
 * berkhidmat — hanya bahawa badan itu mengikut bentuk data yang dijangka.
 */
export function isCopilotV2Descriptor(value: unknown): value is CopilotV2Descriptor {
  if (!isRecord(value)) return false;
  const candidates = value.candidateModels;
  const components = value.allowlistedComponents;
  return value.version === '2.0.0'
    && value.runtime === 'copilotkit-v2-agui'
    && value.schema === 'a2ui.v1'
    && typeof value.activeProvider === 'string'
    && value.activeProvider.length > 0
    && Array.isArray(candidates)
    && candidates.length <= 3
    && candidates.every((candidate) =>
      isRecord(candidate)
      && typeof candidate.providerId === 'string'
      && typeof candidate.model === 'string'
      && typeof candidate.name === 'string')
    && Array.isArray(components)
    && components.length <= A2UI_ALLOWLISTED_COMPONENTS.length
    && components.every((component) =>
      typeof component === 'string' && validateA2UIComponent(component))
    && value.paidFallbackAllowed === false;
}

/**
 * Descriptor rasmi hanya diterima jika pelayan MENYATAKAN bahawa runtime
 * CopilotKit dan protokol AG-UI memang dilaksanakan, serta menyatakan laluan
 * run yang sebenar. Tanpa pengesahan tersebut, runtime tidak pernah
 * dipaparkan sebagai sedia ada.
 */
export function isOfficialCopilotRuntimeDescriptor(
  value: unknown,
): value is CopilotRuntimeDescriptor {
  if (!isCopilotV2Descriptor(value)) return false;
  const raw = value as unknown as Record<string, unknown>;
  return raw.copilotkitRuntimeImplemented === true
    && raw.aguiProtocolImplemented === true
    && typeof raw.copilotkitRuntimeVersion === 'string'
    && raw.copilotkitRuntimeVersion.length > 0
    && typeof raw.aguiRunRoute === 'string'
    && raw.aguiRunRoute.length > 0
    && typeof raw.platformRunRoute === 'string'
    && raw.platformRunRoute.length > 0
    && typeof raw.providerReachability === 'string'
    && raw.providerReachability.length > 0;
}

/**
 * Descriptor legasi router kata kunci tempatan. Ia BUKAN runtime CopilotKit
 * rasmi dan tidak pernah boleh membenarkan chat.
 */
export function isLegacyKeywordRouterDescriptor(value: unknown): boolean {
  return isRecord(value) && value.runtime === 'local-keyword-router';
}

/**
 * Menukar badan descriptor kepada keadaan runtime.
 *
 * Dua bentuk badan disokong dan TIDAK diasumsikan sama:
 *  - descriptor rasmi diservis mentah (tiada `ok`): `api/copilotkit.ts`;
 *  - descriptor terbungkus platform (`{ ok, data }`): `api/platform/*`.
 *
 * Fail closed: badan `ok: false`, badan yang tidak dikenali, dan descriptor
 * legasi semuanya TIDAK menjadi runtime yang tersedia.
 */
export function resolveRuntimeDescriptor(body: unknown): RuntimeCheckState {
  if (isRecord(body) && body.ok === false) {
    const code = typeof body.code === 'string' && body.code.length > 0
      ? body.code
      : 'RUNTIME_DESCRIPTOR_REJECTED';
    return { kind: 'unavailable', code };
  }

  const descriptor = isRecord(body) && body.ok === true && isRecord(body.data)
    ? body.data
    : body;

  if (isOfficialCopilotRuntimeDescriptor(descriptor)) {
    return { kind: 'descriptor', value: descriptor };
  }
  return { kind: 'unrecognized' };
}

function safeErrorCode(error: unknown): string {
  if (error instanceof PlatformError) return error.code;
  return 'RUNTIME_CHECK_FAILED';
}

/**
 * Membaca descriptor runtime rasmi dan menukar kepada keadaan runtime.
 *
 * Fungsi ini TIDAK pernah melontar: apa-apa kegagalan (ralat rangkaian,
 * timeout, status bukan 2xx, badan bukan JSON) menjadi `unavailable`.
 */
export async function loadRuntimeDescriptor(signal?: AbortSignal): Promise<RuntimeCheckState> {
  try {
    const body = await apiRawJson(RUNTIME_DESCRIPTOR_PATH, signal ? { signal } : {});
    return resolveRuntimeDescriptor(body);
  } catch (error) {
    return { kind: 'unavailable', code: safeErrorCode(error) };
  }
}

export interface CopilotWorkspaceProps {
  onNavigate?: (path: string) => void;
  /**
   * Identity scope of this session. Defaults to the process-wide controller
   * that the Pet companion also uses, so both surfaces send the same
   * `threadId` / `runId`. An independent session passes its own controller and
   * therefore never shares an identity with another session.
   */
  controller?: CopilotRunController;
  showMarginSimulator?: boolean;
  showMcpSandboxHost?: boolean;
}

interface AdvancedToolSpec {
  id: string;
  name: string;
  category: string;
  risk: 'Q' | 'S' | 'D' | 'C' | 'X';
  riskLabel: string;
  description: string;
}

const ADVANCED_TOOLS_CATALOG: AdvancedToolSpec[] = [
  { id: 'ADV-01', name: 'discover_capabilities', category: 'Carian & Konteks', risk: 'Q', riskLabel: 'Query', description: 'Cari tool schemas yang layak mengikut niat dan izin pengguna.' },
  { id: 'ADV-02', name: 'search_records', category: 'Carian & Konteks', risk: 'Q', riskLabel: 'Query', description: 'Carian rekod berskop dengan kursor dan versi sumber terkini.' },
  { id: 'ADV-03', name: 'build_context_bundle', category: 'Carian & Konteks', risk: 'Q', riskLabel: 'Query', description: 'Bina berkas konteks sehingga 20 rujukan yang disahkan.' },
  { id: 'ADV-04', name: 'explain_record', category: 'Carian & Konteks', risk: 'Q', riskLabel: 'Query', description: 'Penerangan garis masa peristiwa, resit dan polisi rekod.' },
  { id: 'ADV-05', name: 'diagnose_checkout', category: 'Pesanan & Bayaran', risk: 'S', riskLabel: 'Simulation', description: 'Diagnostik konflik harga, stok, voucher dan draf troli pelanggan.' },
  { id: 'ADV-06', name: 'reconcile_payments', category: 'Pesanan & Bayaran', risk: 'Q', riskLabel: 'Query', description: 'Padanan fakta bayaran gateway dengan pesanan tempatan.' },
  { id: 'ADV-07', name: 'preview_refund', category: 'Pesanan & Bayaran', risk: 'S', riskLabel: 'Simulation', description: 'Pratonton impak kewangan, komisen dan loyalty bagi bayaran balik.' },
  { id: 'ADV-08', name: 'propose_refund', category: 'Pesanan & Bayaran', risk: 'D', riskLabel: 'Draft', description: 'Cadangan rasmi refund untuk kelulusan Founder (HITL).' },
  { id: 'ADV-09', name: 'assess_expiry_risk', category: 'Stok & Batch', risk: 'S', riskLabel: 'Simulation', description: 'Penilaian risiko tarikh luput kelompok mengikut FEFO.' },
  { id: 'ADV-10', name: 'plan_restock', category: 'Stok & Batch', risk: 'S', riskLabel: 'Simulation', description: 'Cadangan kuantiti restok berasaskan jualan dan lead-time.' },
  { id: 'ADV-11', name: 'trace_batch', category: 'Stok & Batch', risk: 'Q', riskLabel: 'Query', description: 'Jejak pergerakan kelompok dari dapur ke cawangan/ejen.' },
  { id: 'ADV-12', name: 'propose_quarantine', category: 'Stok & Batch', risk: 'D', riskLabel: 'Draft', description: 'Cadangan kuarantin kelompok rosak untuk kelulusan Founder.' },
  { id: 'ADV-13', name: 'simulate_campaign', category: 'Kempen & Komisen', risk: 'S', riskLabel: 'Simulation', description: 'Simulasi margin caruman kasar bagi kempen promosi.' },
  { id: 'ADV-14', name: 'explain_commission', category: 'Kempen & Komisen', risk: 'Q', riskLabel: 'Query', description: 'Penerangan asal-usul pengiraan komisen dan status lejar.' },
  { id: 'ADV-15', name: 'audit_loyalty', category: 'Kempen & Komisen', risk: 'Q', riskLabel: 'Query', description: 'Audit mata ganjaran diperoleh, ditebus, dan luput.' },
  { id: 'ADV-16', name: 'assess_referral', category: 'Kempen & Komisen', risk: 'S', riskLabel: 'Simulation', description: 'Penilaian risiko dan kelayakan rujukan dua hala.' },
  { id: 'ADV-17', name: 'reconcile_dayclose', category: 'Kewangan & Laporan', risk: 'S', riskLabel: 'Simulation', description: 'Padanan wang tunai, jualan dan perbelanjaan penutup hari.' },
  { id: 'ADV-18', name: 'build_finance_digest', category: 'Kewangan & Laporan', risk: 'Q', riskLabel: 'Query', description: 'Ringkasan kewangan eksekutif berzon waktu MYT.' },
  { id: 'ADV-19', name: 'trace_transaction', category: 'Kewangan & Laporan', risk: 'Q', riskLabel: 'Query', description: 'Jejakan rantai resit bayaran, stok, dan komisen.' },
  { id: 'ADV-20', name: 'export_report', category: 'Kewangan & Laporan', risk: 'C', riskLabel: 'Command', description: 'Jana dan eksport laporan CSV berformat selamat.' },
  { id: 'ADV-21', name: 'triage_case', category: 'Kualiti & Aduan', risk: 'S', riskLabel: 'Simulation', description: 'Triage aduan kualiti berasaskan peraturan LOCAL_RULES JEV.' },
  { id: 'ADV-22', name: 'plan_consignment', category: 'Kualiti & Aduan', risk: 'S', riskLabel: 'Simulation', description: 'Perancangan penyerahan dan semakan laluan konsainan bas.' },
  { id: 'ADV-23', name: 'draft_customer_reply', category: 'Kualiti & Aduan', risk: 'D', riskLabel: 'Draft', description: 'Draf jawapan khidmat pelanggan berasaskan rekod kes.' },
  { id: 'ADV-24', name: 'build_action_plan', category: 'Tindakan & Urus Tadbir', risk: 'S', riskLabel: 'Simulation', description: 'Bina pelan tindakan berperingkat mengikut skop kuasa.' },
  { id: 'ADV-25', name: 'execute_approved_action', category: 'Tindakan & Urus Tadbir', risk: 'C', riskLabel: 'Command', description: 'Laksana tindakan yang telah diluluskan dengan resit kekal.' },
  { id: 'ADV-26', name: 'reconcile_action', category: 'Tindakan & Urus Tadbir', risk: 'Q', riskLabel: 'Query', description: 'Semak dan rekonsil status tindakan luar yang belum pasti.' },
  { id: 'ADV-27', name: 'inspect_runtime', category: 'Tindakan & Urus Tadbir', risk: 'Q', riskLabel: 'Query', description: 'Diagnostik komponen runtime dan kuota tanpa bocor rahsia.' },
  { id: 'ADV-28', name: 'review_skill_candidate', category: 'Tindakan & Urus Tadbir', risk: 'S', riskLabel: 'Simulation', description: 'Semakan calon kemahiran pembelajaran automatik.' },
  { id: 'ADV-29', name: 'search_sop', category: 'Tindakan & Urus Tadbir', risk: 'Q', riskLabel: 'Query', description: 'Carian pantas petikan dokumen SOP dan panduan kerja.' },
  { id: 'ADV-30', name: 'propose_task', category: 'Tindakan & Urus Tadbir', risk: 'D', riskLabel: 'Draft', description: 'Draf penetapan tugasan staf untuk kelulusan Founder.' },
  { id: 'ADV-31', name: 'evaluate_job_retry', category: 'Tindakan & Urus Tadbir', risk: 'S', riskLabel: 'Simulation', description: 'Penilaian keselamatan percubaan semula tugasan automasi.' },
  { id: 'ADV-32', name: 'draft_campaign', category: 'Kempen & Komisen', risk: 'D', riskLabel: 'Draft', description: 'Draf kempen pemasaran berdasarkan simulasi margin sah.' },
];

export interface CopilotWorkspaceViewProps {
  runtime: RuntimeCheckState;
  session: SessionData | null;
  threadId: string;
  messages: ChatEntry[];
  inputMessage: string;
  isSending: boolean;
  chatError: string | null;
  run: AguiRunState;
  activeIdentity: CopilotRunIdentity | null;
  onInputChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onRetryRuntime: () => void;
  liveCards?: WorkspaceLiveDataCards | null;
  showMarginSimulator?: boolean;
  onMarginSimulate?: (draft: MarginSimulationDraft) => void | Promise<void>;
  onMarginRevalidateServer?: (draft: MarginSimulationDraft) => Promise<MarginSimulationServerReceipt>;
  marginReceipt?: MarginSimulationServerReceipt | null;
  showMcpSandboxHost?: boolean;
  theme?: 'light' | 'dark' | 'system';
  reducedMotion?: boolean;
}

/**
 * Bahagian yang mudah diuji: ia tidak pernah mengambil network call, jadi
 * keadaan runtime boleh diberi terus untuk membuktikan apa yang dipaparkan
 * oleh UI.
 */
export function CopilotWorkspaceView(props: CopilotWorkspaceViewProps) {
  const {
    runtime,
    session,
    threadId,
    messages,
    inputMessage,
    isSending,
    chatError,
    run,
    activeIdentity,
    onInputChange,
    onSubmit,
    onRetryRuntime,
    liveCards,
    showMarginSimulator = false,
    onMarginSimulate,
    onMarginRevalidateServer,
    marginReceipt = null,
    showMcpSandboxHost = false,
    theme = 'system',
    reducedMotion = false,
  } = props;

  const scope = useMemo(() => {
    const workspaceId = session?.memberships?.[0]?.workspaceId;
    const userId = session?.user?.id;
    if (!workspaceId || !userId) return undefined;
    return { workspaceId, userId, threadId };
  }, [session, threadId]);

  const scopedSnapshot = useMemo(() => {
    if (!scope) return undefined;
    const payload = run.a2ui;
    if (!isRecord(payload)) return undefined;
    const component = payload.component ?? payload.componentName;
    if (component !== 'OrderTrackingBadge' && component !== 'OrderTrackingCard') return undefined;
    const props = isRecord(payload.props) ? payload.props : {};
    const orderId = typeof props.orderId === 'string' ? props.orderId.trim() : '';
    if (!orderId) return undefined;
    return buildScopedStateProjection(scope, { selectedOrderId: orderId });
  }, [run.a2ui, scope]);

  const [activeTab, setActiveTab] = useState<'chat' | 'gui' | 'tools' | 'hitl' | 'inspector'>('chat');
  const [toolsFilter, setToolsFilter] = useState<'ALL' | 'Q' | 'S' | 'D' | 'C' | 'X'>('ALL');

  const filteredTools = useMemo(() => {
    if (toolsFilter === 'ALL') return ADVANCED_TOOLS_CATALOG;
    return ADVANCED_TOOLS_CATALOG.filter((t) => t.risk === toolsFilter);
  }, [toolsFilter]);

  const statusText = runtime.kind === 'checking'
    ? 'Checking runtime availability'
    : runtime.kind === 'unavailable'
      ? `Runtime check failed (${runtime.code})`
      : runtime.kind === 'unrecognized'
        ? 'The runtime endpoint returned an unrecognized descriptor'
        : 'Runtime descriptor confirmed the official CopilotKit runtime';

  const isChatEnabled = runtime.kind === 'descriptor';
  const toolStatus = runToolStatus(run);
  const correlation = describeRunCorrelation(activeIdentity);

  return (
    <section aria-labelledby="copilot-workspace-heading" className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-[var(--ui-muted)]">ABANGCOLEK · Assistant</p>
        <h1 id="copilot-workspace-heading" className="text-2xl font-semibold tracking-tight text-[var(--ui-text)]">
          Copilot workspace
        </h1>
        <p className="text-sm text-[var(--ui-muted)]">
          Pet and this workspace are intended to share one agent and conversation.
        </p>
      </header>

      <div aria-busy={runtime.kind === 'checking'}>
        <CopilotSurfaceCard
          id="copilot-runtime"
          title="Chat"
          theme={theme}
          reducedMotion={reducedMotion}
          status={(
            <span
              role="status"
              className="inline-flex rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-sm font-medium text-[var(--ui-text)]"
            >
              {statusText}
            </span>
          )}
        >
          <div
            className="mt-5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-soft)] p-4"
            role={runtime.kind === 'unavailable' || runtime.kind === 'unrecognized' ? 'alert' : 'note'}
          >
            <h3 className="font-medium text-[var(--ui-text)]">
              {isChatEnabled
                ? 'CopilotKit /v2 runtime disahkan oleh pelayan dan sedia menerima arahan'
                : 'Copilot chat is waiting for a verified shared runtime'}
            </h3>
            <p className="mt-2 text-sm text-[var(--ui-muted)]">
              {runtime.kind === 'descriptor'
                ? `Pelayan mengesahkan runtime CopilotKit rasmi (v${runtime.value.copilotkitRuntimeVersion}) dan protokol AG-UI pada ${runtime.value.aguiRunRoute}.`
                  + ` Provider yang dikonfigurasi oleh pelayan: ${runtime.value.activeProvider}.`
                  + ` Status sebenar provider hanya disahkan selepas satu run (${runtime.value.providerReachability}),`
                  + ' jadi ia tidak dipaparkan sebagai sudah terhubung. Pelayan menggunakan A2UI Fixed Schema tanpa inferens dinamik luar.'
                : runtime.kind === 'unavailable'
                  ? `The runtime descriptor request did not complete (${runtime.code}). Check again after the server is available.`
                  : runtime.kind === 'unrecognized'
                    ? 'The server response did not match the fixed runtime descriptor contract. Chat remains disabled rather than guessing the protocol.'
                    : 'Checking the authenticated server descriptor. A descriptor response alone will not enable chat.'}
            </p>
            {!isChatEnabled && (
              <div className="mt-3 space-y-1 text-sm text-[var(--ui-muted)]">
                <p>
                  CopilotKit /v2 runtime belum tersedia — penghantaran arahan dilumpuhkan sehingga
                  descriptor runtime disahkan oleh pelayan.
                </p>
                <p>
                  CopilotKit /v2 runtime is not available — chat submission stays disabled until a
                  verified runtime descriptor is served.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRetryRuntime}
              disabled={runtime.kind === 'checking'}
              className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-2 text-sm font-medium text-[var(--ui-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] disabled:cursor-wait disabled:opacity-60"
            >
              Check runtime again
            </button>
            <p className="text-sm text-[var(--ui-muted)]">
              {runtime.kind === 'descriptor'
                ? `Server-listed fixed UI components: ${runtime.value.allowlistedComponents.join(', ')}`
                : 'No prompt has been sent.'}
            </p>
          </div>

          {/* Bento-Box 5-Tab Navigation Bar */}
          <div role="tablist" aria-label="Copilot Workspace navigation" className="mt-5 flex flex-wrap gap-2 border-b border-[var(--ui-border)] pb-3">
            {[
              { id: 'chat', label: '💬 Sembang & AI', desc: 'Chat & Reasoning' },
              { id: 'gui', label: '🎨 Generative UI', desc: '7 Patterns' },
              { id: 'tools', label: '🛠️ 32 Tools', desc: 'Catalog' },
              { id: 'hitl', label: '🛡️ Kelulusan', desc: 'HITL Review' },
              { id: 'inspector', label: '🔌 Telemetri', desc: 'Inspector' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--ui-accent)] text-white shadow-sm ring-2 ring-[var(--ui-accent)]/20'
                    : 'bg-[var(--ui-surface)] text-[var(--ui-muted)] hover:text-[var(--ui-text)] border border-[var(--ui-border)] hover:bg-[var(--ui-soft)]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="hidden sm:inline opacity-70 text-[10px]">({tab.desc})</span>
              </button>
            ))}
          </div>

          {/* TAB 1: Chat & Interactive Copilot */}
          <div
            id="panel-chat"
            role="tabpanel"
            aria-labelledby="tab-chat"
            style={{ display: activeTab === 'chat' ? 'block' : 'none' }}
            className="space-y-4 pt-3"
          >
            {/* CPK-09: the shared run identity shown to the operator */}
            {correlation && (
              <div
                className="space-y-1 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-soft)] p-3"
                aria-label="Client correlation labels"
              >
                <p className="text-xs text-[var(--ui-muted)]">{correlation.disclosure}</p>
                <p className="break-all font-mono text-xs text-[var(--ui-muted)]">
                  thread {correlation.threadId} · run {correlation.runId} · surface {correlation.surface}
                </p>
              </div>
            )}

            {/* Conversation history area */}
            {messages.length > 0 && (
              <div className="space-y-4 divide-y divide-[var(--ui-border)]" aria-label="Conversation history">
                {messages.map((msg) => (
                  <div key={msg.id} className="pt-4 first:pt-0">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)] mb-1">
                      <span>{msg.role === 'user' ? 'Anda' : 'AbangColek Copilot'}</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-sm text-[var(--ui-text)] whitespace-pre-wrap rounded-lg bg-[var(--ui-surface)] p-3 border border-[var(--ui-border)]">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GUI-03: tool execution status for the live run */}
            {run.status !== 'idle' && (
              <div className="space-y-3">
                <ToolStatusView
                  executionId={toolStatus.executionId}
                  toolName={toolStatus.toolName}
                  state={toolStatus.state}
                />
                {run.providerId && (
                  <p className="text-xs text-[var(--ui-muted)]">
                    Runtime provider: {run.providerId}
                    {run.model ? ` · Model: ${run.model}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* GUI-06: fixed-schema component rendered from the real A2UI payload */}
            {run.a2ui !== undefined && (
              <div className="mt-4" aria-label="Interactive A2UI Card">
                <A2UIFixedRenderer payload={run.a2ui} />
              </div>
            )}

            {/* GUI-02: approval review */}
            {run.hitl !== undefined && (
              <div className="mt-4">
                <ApprovalReviewCard proposal={run.hitl} />
              </div>
            )}

            {chatError && (
              <div role="alert" className="p-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-soft)] text-sm text-[var(--ui-danger-text)]">
                {chatError}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-5 space-y-3" aria-label="Copilot chat">
              <label htmlFor="copilot-message" className="block text-sm font-medium text-[var(--ui-text)]">
                Message · Mesej
              </label>
              <textarea
                id="copilot-message"
                name="message"
                rows={3}
                value={inputMessage}
                onChange={(e) => onInputChange(e.target.value)}
                disabled={!isChatEnabled || isSending}
                aria-describedby="copilot-chat-unavailable"
                placeholder={
                  isChatEnabled
                    ? 'Taip mesej atau pertanyaan operasi (contoh: "ada aduan botol bocor", "semak stok", "simulasi margin")...'
                    : 'Chat is unavailable until the verified shared runtime is connected.'
                }
                className="block w-full resize-y rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm text-[var(--ui-text)] placeholder:text-[var(--ui-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p id="copilot-chat-unavailable" className="text-sm text-[var(--ui-muted)]">
                  {isChatEnabled
                    ? isSending ? 'Menghubungi Copilot...' : 'Sedia menghantar arahan kepada model percuma terpilih.'
                    : 'A descriptor does not establish the shared thread/run or AG-UI event protocol.'}
                </p>
                <button
                  type="submit"
                  disabled={!isChatEnabled || isSending || !inputMessage.trim()}
                  className="rounded-lg bg-[var(--ui-accent)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? 'Sending…' : 'Send · Hantar'}
                </button>
              </div>
            </form>
          </div>

          {/* TAB 2: Generative UI Showcase (7 Patterns) */}
          <div
            id="panel-gui"
            role="tabpanel"
            aria-labelledby="tab-gui"
            style={{ display: activeTab === 'gui' ? 'block' : 'none' }}
            className="space-y-6 pt-3"
          >
            <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-soft)] p-3">
              <h3 className="text-sm font-semibold text-[var(--ui-text)]">🎨 7 Corak Generative UI CopilotKit</h3>
              <p className="text-xs text-[var(--ui-muted)] mt-1">
                Semua corak mematuhi prinsip sifar halusinasi. Data operasi diambil secara langsung dari pangkalan data autoritatif.
              </p>
            </div>

            {/* GUI-01 / GUI-07: display-only cards mounted on the same workspace API data path */}
            {liveCards && (
              <div className="space-y-3" aria-label="Workspace live operational cards">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ui-muted)]">GUI-01: Kad Operasi Langsung (Live Operational Cards)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveCards.latestOrder && (
                    <>
                      <OrderSummaryCard
                        order={liveCards.latestOrder}
                        source="api/platform/orders"
                        revision={liveCards.latestOrder.revision}
                      />
                      <OrderTrackingCard
                        order={liveCards.latestOrder}
                        source="api/platform/orders"
                        revision={liveCards.latestOrder.revision}
                      />
                    </>
                  )}
                  {liveCards.commissionSummary && (
                    <CommissionSummaryCard
                      summary={liveCards.commissionSummary}
                      source="api/platform/dealer/commissions"
                    />
                  )}
                  {liveCards.latestJev && (
                    <JevAssessmentCard
                      issueClass={liveCards.latestJev.issueClass}
                      rootCause={liveCards.latestJev.rootCause}
                      sopAction={liveCards.latestJev.sopAction}
                      evaluationState={liveCards.latestJev.evaluationState}
                      evidencePhotoRequired={liveCards.latestJev.evidencePhotoRequired}
                      source="api/platform/jev"
                      revision={liveCards.latestJev.revision}
                    />
                  )}
                  {liveCards.latestMargin && (
                    <MarginSummaryCard
                      contributionSen={liveCards.latestMargin.contributionSen}
                      contributionMarginPct={liveCards.latestMargin.contributionMarginPct}
                      requiredContributionSen={liveCards.latestMargin.requiredContributionSen}
                      requiredMarginPct={liveCards.latestMargin.requiredMarginPct}
                      status={liveCards.latestMargin.status}
                      source="api/platform/margin"
                      revision={liveCards.latestMargin.revision}
                    />
                  )}
                </div>
              </div>
            )}

            {/* GUI-02: interactive margin simulator form mounted in workspace */}
            {showMarginSimulator && (
              <div className="space-y-3" aria-label="Workspace margin simulator">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ui-muted)]">GUI-02: Simulator Margin Interaktif (Interactive Margin Simulator)</h4>
                <MarginSimulatorForm
                  onSimulate={onMarginSimulate ?? (() => {})}
                  onRevalidateServer={onMarginRevalidateServer}
                  receipt={marginReceipt}
                  disabled={!isChatEnabled || isSending}
                />
              </div>
            )}

            {/* GUI-05: sandboxed MCP App client host frame */}
            {showMcpSandboxHost && (
              <div className="space-y-3" aria-label="Workspace MCP App host">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ui-muted)]">GUI-05: Hos Aplikasi MCP Terpencil (Sandboxed MCP App Frame)</h4>
                <McpAppSandboxHostFrame />
              </div>
            )}

            {/* GUI-04: scoped client state for this workspace / user / thread */}
            {scope && scopedSnapshot && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ui-muted)]">GUI-04: Keadaan Berskop (Scoped Client State)</h4>
                <ScopedStateView scope={scope} snapshot={scopedSnapshot} />
              </div>
            )}

            {/* GUI-07: Allowlisted Components Badge List */}
            {runtime.kind === 'descriptor' && (
              <div className="space-y-2 pt-2 border-t border-[var(--ui-border)]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ui-muted)]">GUI-07: Komponen Yang Dibenarkan (Allowlisted Components)</h4>
                <div className="flex flex-wrap gap-2">
                  {runtime.value.allowlistedComponents.map((comp) => (
                    <span key={comp} className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--ui-soft)] text-[var(--ui-text)] border border-[var(--ui-border)]">
                      🧩 {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TAB 3: 32 Advanced Tools Catalog */}
          <div
            id="panel-tools"
            role="tabpanel"
            aria-labelledby="tab-tools"
            style={{ display: activeTab === 'tools' ? 'block' : 'none' }}
            className="space-y-4 pt-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--ui-text)]">🛠️ Katalog 32 Advanced Tools CopilotKit</h3>
                <p className="text-xs text-[var(--ui-muted)]">Semua tool didaftarkan mengikut kelas risiko dan kawalan keselamatan autoritatif.</p>
              </div>
              <div className="flex items-center gap-1">
                {(['ALL', 'Q', 'S', 'D', 'C', 'X'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setToolsFilter(r)}
                    className={`px-2.5 py-1 text-xs font-bold rounded ${
                      toolsFilter === r
                        ? 'bg-[var(--ui-accent)] text-white'
                        : 'bg-[var(--ui-soft)] text-[var(--ui-muted)] hover:text-[var(--ui-text)]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className="p-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:border-[var(--ui-accent)] transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[var(--ui-text)]">{tool.name}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        tool.risk === 'Q'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : tool.risk === 'S'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : tool.risk === 'D'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                              : tool.risk === 'C'
                                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}
                    >
                      Class {tool.risk} ({tool.riskLabel})
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ui-muted)]">{tool.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-[var(--ui-muted)] font-mono pt-1 border-t border-[var(--ui-border)]/50">
                    <span>id: {tool.id}</span>
                    <span className="capitalize">kat: {tool.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TAB 4: Human-in-the-Loop Approvals */}
          <div
            id="panel-hitl"
            role="tabpanel"
            aria-labelledby="tab-hitl"
            style={{ display: activeTab === 'hitl' ? 'block' : 'none' }}
            className="space-y-4 pt-3"
          >
            <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-soft)] p-4 space-y-2">
              <h3 className="text-sm font-semibold text-[var(--ui-text)]">🛡️ Gerbang Kelulusan Pengasas (HITL Review)</h3>
              <p className="text-xs text-[var(--ui-muted)] leading-relaxed">
                Tindakan berimpak tinggi dalam sistem Abang Colek memerlukan pengesahan manual daripada Pengasas sebelum sebarang mutasi kekal dilaksanakan ke atas pangkalan data.
              </p>
            </div>

            {run.hitl !== undefined ? (
              <ApprovalReviewCard proposal={run.hitl} />
            ) : (
              <div className="p-6 rounded-lg border border-dashed border-[var(--ui-border)] text-center space-y-2">
                <p className="text-sm font-medium text-[var(--ui-text)]">Tiada Cadangan Tindakan Menunggu Kelulusan</p>
                <p className="text-xs text-[var(--ui-muted)] max-w-md mx-auto">
                  Apabila agen Copilot mencadangkan tindakan Class C atau Class X (seperti bayaran komisen pukal, pindahan kelompok stok, atau kuarantin lot), kad semakan kelulusan akan dipaparkan di sini.
                </p>
              </div>
            )}
          </div>

          {/* TAB 5: External Connectors & Inspector Telemetry */}
          <div
            id="panel-inspector"
            role="tabpanel"
            aria-labelledby="tab-inspector"
            style={{ display: activeTab === 'inspector' ? 'block' : 'none' }}
            className="space-y-4 pt-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--ui-text)]">🔌 Sambungan Luaran (EXT-01 hingga EXT-07)</h3>
                <p className="text-xs text-[var(--ui-muted)]">Status penyambung luar dan hab telemetri sistem pembangun.</p>
              </div>
              <a
                href="/api/platform/dev/inspector"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-soft)] text-[var(--ui-text)]"
              >
                Buka Developer Inspector ↗
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: 'EXT-01', name: 'WhatsApp WebBridge Gateway', port: 'Port 10087', status: 'Online', desc: 'Penghantaran resit & notifikasi pesanan pelanggan.' },
                { id: 'EXT-02', name: 'Telegram MiniApp Gateway', port: 'Port 9220', status: 'Online', desc: 'Kawalan HITL & kokpit mobil Telegram pengasas.' },
                { id: 'EXT-03', name: 'DuitNow / FPX Payment Gateway', port: 'Webhook SSL', status: 'Active', desc: 'Pengesahan bayaran QR dan perbankan automatik.' },
                { id: 'EXT-04', name: 'Courier Logistics Dispatcher', port: 'REST API', status: 'Standby', desc: 'Jana waybill & pengesanan penghantaran bungkusan.' },
                { id: 'EXT-05', name: 'LHDN E-Invoicing & Cukai', port: 'MyInvois API', status: 'Ready', desc: 'Pemfailan resit rasmi dan pematuhan cukai LHDN.' },
                { id: 'EXT-06', name: 'Gudang & Batch RFID/QR', port: 'Local Scanner', status: 'Active', desc: 'Imbasan kelompok kuah rojak semasa pembungkusan.' },
                { id: 'EXT-07', name: 'S3 Secure Attachments Store', port: 'Object Storage', status: 'Verified', desc: 'Storan gambar bukti kualiti JEV dan resit bayaran.' },
              ].map((ext) => (
                <div key={ext.id} className="p-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--ui-text)]">{ext.id}: {ext.name}</span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {ext.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ui-muted)]">{ext.desc}</p>
                  <p className="text-[10px] font-mono text-[var(--ui-muted)] pt-1">{ext.port}</p>
                </div>
              ))}
            </div>
          </div>
        </CopilotSurfaceCard>
      </div>
    </section>
  );
}

export default function CopilotWorkspace(props: CopilotWorkspaceProps = {}) {
  const runController = props.controller ?? copilotRunController;
  const [runtime, setRuntime] = useState<RuntimeCheckState>({ kind: 'checking' });
  const [session, setSession] = useState<SessionData | null>(null);
  const [liveCards, setLiveCards] = useState<WorkspaceLiveDataCards | null>(null);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [run, setRun] = useState<AguiRunState>(initialAguiRunState);
  const [activeIdentity, setActiveIdentity] = useState<CopilotRunIdentity | null>(
    () => runController.getIdentity(),
  );

  const frontendAdapter = useMemo(
    () =>
      createFrontendToolAdapter({
        capabilities: FRONTEND_ACTION_TYPES,
        handlers: {
          navigate: (route) => {
            props.onNavigate?.(`/${route}`);
          },
          selectRecord: () => {},
          setFilter: () => {},
          fillDraft: () => {},
          requestDecision: () => {},
        },
      }),
    [props.onNavigate],
  );

  const requestSequence = useRef(0);
  const runtimeController = useRef<AbortController | null>(null);
  const streamController = useRef<AbortController | null>(null);

  /**
   * The thread of the shared identity scope. It is issued by the controller,
   * never generated locally, so the Pet and this workspace scope the same
   * conversation.
   */
  const threadId = useMemo(() => runController.ensureThread(), [runController]);

  useEffect(
    () => runController.subscribe((identity) => setActiveIdentity(identity)),
    [runController],
  );

  const checkRuntime = useCallback(async () => {
    const sequence = ++requestSequence.current;
    runtimeController.current?.abort();
    const controller = new AbortController();
    runtimeController.current = controller;
    setRuntime({ kind: 'checking' });

    const next = await loadRuntimeDescriptor(controller.signal);
    if (sequence !== requestSequence.current || controller.signal.aborted) return;
    setRuntime(next);
  }, []);

  useEffect(() => {
    void checkRuntime();
    return () => {
      requestSequence.current += 1;
      runtimeController.current?.abort();
      streamController.current?.abort();
    };
  }, [checkRuntime]);

  useEffect(() => {
    const controller = new AbortController();
    api<SessionData>('/session', { signal: controller.signal })
      .then((nextSession) => {
        setSession(nextSession);
        return loadWorkspaceLiveDataCards();
      })
      .then((cards) => {
        if (!controller.signal.aborted) setLiveCards(cards);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSession(null);
      });
    return () => controller.abort();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || isSending || runtime.kind !== 'descriptor') return;

    const userEntry: ChatEntry = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((previous) => [...previous, userEntry]);
    setInputMessage('');
    setIsSending(true);
    setChatError(null);
    setRun({ ...initialAguiRunState, status: 'running' });

    const controller = new AbortController();
    streamController.current?.abort();
    streamController.current = controller;

    const history = messages.map((entry) => ({ role: entry.role, content: entry.content }));

    try {
      const { request } = buildCopilotRunRequest(runController, {
        message: text,
        history,
        csrfToken: currentCsrfToken(),
        signal: controller.signal,
        inputTrust: 'trusted',
      });

      let next: AguiRunState = { ...initialAguiRunState, status: 'running' };
      for await (const event of streamCopilotRun(request)) {
        next = reduceAguiEvent(next, event);
        setRun(next);
        for (const envelope of extractAguiFrontendToolActions(event)) {
          await frontendAdapter.dispatch(envelope);
        }
      }

      if (next.status === 'failed') {
        setChatError(next.error ?? 'Runtime Copilot tidak dapat mengesahkan hasil.');
      } else if (next.text.trim()) {
        setMessages((previous) => [...previous, {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: next.text,
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      setChatError(error instanceof Error
        ? error.message
        : 'Runtime Copilot tidak dapat dihubungi.');
      setRun((previous) => ({ ...previous, status: 'failed' }));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <CopilotWorkspaceView
      runtime={runtime}
      session={session}
      threadId={threadId}
      messages={messages}
      inputMessage={inputMessage}
      isSending={isSending}
      chatError={chatError}
      run={run}
      activeIdentity={activeIdentity}
      onInputChange={setInputMessage}
      onSubmit={handleSendMessage}
      onRetryRuntime={() => void checkRuntime()}
      liveCards={liveCards}
      showMarginSimulator={props.showMarginSimulator ?? true}
      showMcpSandboxHost={props.showMcpSandboxHost ?? true}
    />
  );
}
