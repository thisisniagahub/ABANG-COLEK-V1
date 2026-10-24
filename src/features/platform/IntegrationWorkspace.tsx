import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Search,
  Database,
  Loader2,
  Sparkles,
  CheckCircle2,
  Activity,
  FileText,
  Mail,
  CheckSquare,
  FolderOpen,
  Calendar,
  FileSpreadsheet,
  Video,
  MessageSquare,
  Flame,
  Zap,
  Sun,
  Moon,
  ShoppingBag,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useResource } from './client';
import type { RedactedHealth } from '../../../shared/platform-contracts';
import { JevAssessmentCard } from '@/features/jev';
import { cn } from '@/lib/utils';
import {
  sendMessageToAgentStream,
  type ChatMessage,
  type ToolCall,
  MOCK_DB,
  type AgentStep,
  subscribeToolExecution,
} from '@/services/gemini';
import { appStore } from '@/services/store';
import { AbangColekDiscoveryView } from '@/components/AbangColekDiscoveryView';
import { AgentInsightCard } from '@/components/AgentInsightCard';
import { PluginsView } from '@/components/PluginsView';
import { PluginArtifactCard } from '@/components/PluginArtifactCard';
import { FormsView } from '@/components/FormsView';
import { GmailView } from '@/components/GmailView';
import { TasksView } from '@/components/TasksView';
import { DocsView } from '@/components/DocsView';
import { GooglePickerButton } from '@/components/GooglePickerButton';
import { CalendarView } from '@/components/CalendarView';
import { SheetsView } from '@/components/SheetsView';
import { MapsView } from '@/components/MapsView';
import { MeetView } from '@/components/MeetView';
import { ChatWorkspaceView } from '@/components/ChatWorkspaceView';
import { WorkspaceSidebar as Sidebar, WorkspaceMobileMenu } from '@/components/WorkspaceSidebar';
import { useSupabaseAuth } from '@/services/supabaseAuth';
import '@/components/workspace-sidebar.css';
import { OrdersView } from '@/components/OrdersView';
import { KioskStorefrontView } from '@/components/KioskStorefrontView';
import { AgentRestockPortalView } from '@/components/AgentRestockPortalView';
import { BusFreightView } from '@/components/BusFreightView';
import { AgentPerformanceView } from '@/components/AgentPerformanceView';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { CommandPalette } from '@/components/CommandPalette';
import { useWorkspaceTheme } from '@/features/theme/useWorkspaceTheme';
import '@/features/theme/workspace-theme.css';
import {
  A2UI_ALLOWLISTED_COMPONENTS,
  validateA2UIPayload,
} from '@/features/copilot/a2ui-registry';
import { LoyaltyLedgerCard } from '@/features/copilot/cards/LoyaltyLedgerCard';
import { MarginSimulatorCard } from '@/features/copilot/components/MarginSimulatorCard';
import { OperationsBriefCard } from '@/features/copilot/components/OperationsBriefCard';
import { OrderTrackingBadge } from '@/features/copilot/components/OrderTrackingBadge';
import { RefundImpactPanel } from '@/features/copilot/components/RefundImpactPanel';
import {
  MCP_APP_RESOURCE_URI,
  mountMcpAppHost,
} from '@/features/copilot/mcp-apps/mcpAppHostFrame';
import { toolStatusFromDispatch } from '@/features/copilot/tool-rendering/toolExecutionState';
import {
  isLocalInspectorEnabled,
  loadLocalInspector,
  type LocalInspectorResult,
} from '@/features/intelligence/localInspector';
import {
  probeWebMcpSupport,
  readWebMcpGrant,
  grantWebMcp,
  revokeWebMcp,
  type WebMcpGrantState,
} from '@/features/intelligence/webmcpProbe';
import AnimatedColekWorld from '@/features/landing/AnimatedColekWorld';

const AgentStepBlock = ({ step }: { step: AgentStep }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-3xl transition-all',
        step.status === 'streaming'
          ? 'bg-[var(--ui-surface)] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[var(--ui-border)]'
          : 'bg-[var(--ui-soft)] border border-[var(--ui-border)]'
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[var(--ui-surface)] shadow-sm border border-[var(--ui-border)] text-[var(--ui-muted)]">
          {step.type === 'tool' ? <Database size={12} /> : <Bot size={12} />}
        </div>
        <span className="font-semibold text-[13px] text-[var(--ui-text)] truncate">
          {step.type === 'tool' ? `Tool Call: ${step.toolName}` : 'Thinking'}
        </span>
        {step.status === 'streaming' && (
          <Loader2 size={12} className="animate-spin text-[var(--ui-muted)] ml-auto shrink-0" />
        )}
        {step.status === 'completed' && (
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {step.latencyMs !== undefined && (
              <span className="text-[10px] text-[var(--ui-muted)] font-medium">
                {(step.latencyMs / 1000).toFixed(2)}s
              </span>
            )}
            <div className="text-[var(--ui-success-text)]">
              <CheckCircle2 size={14} />
            </div>
          </div>
        )}
      </div>

      {step.type === 'tool' && step.toolArgs && (
        <pre className="text-[10px] bg-[var(--ui-surface)] text-[var(--ui-muted)] p-3 rounded-2xl overflow-x-auto mt-3 font-mono whitespace-pre-wrap border border-[var(--ui-border)]">
          {JSON.stringify(step.toolArgs, null, 2)}
        </pre>
      )}

      {step.type === 'text' && step.content && (
        <div className="text-[13px] text-[var(--ui-muted)] mt-2 line-clamp-2 leading-relaxed">
          "{step.content}"
        </div>
      )}

      {step.result && (
        <div className="mt-4 pt-3 border-t border-[var(--ui-border)] flex flex-col gap-1 text-[11px]">
          <span className="font-semibold text-[var(--ui-muted)] uppercase tracking-wider text-[9px]">
            Result
          </span>
          <span className="text-[var(--ui-text)] truncate font-medium">
            {step.result.message || 'Success'}
          </span>
        </div>
      )}
    </motion.div>
  );
};

const ChatInterface = ({
  history,
  onSendMessage,
  isProcessing,
  currentTool,
  agentSteps,
  streamingText,
  setActiveTab,
}: {
  history: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isProcessing: boolean;
  currentTool: ToolCall | null;
  agentSteps: AgentStep[];
  streamingText: string;
  setActiveTab: (tab: string) => void;
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isProcessing, currentTool, streamingText]);

  useEffect(() => {
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = leftScrollRef.current.scrollHeight;
    }
  }, [agentSteps]);

  const isGeneratingReport = agentSteps.some(
    (s) => s.type === 'tool' && s.toolName === 'generate_yearly_report'
  );
  const isGeneratingDashboard = agentSteps.some(
    (s) => s.type === 'tool' && s.toolName === 'create_operations_dashboard'
  );
  const isGeneratingWidget = isGeneratingReport || isGeneratingDashboard;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col md:flex-row-reverse h-auto md:h-full w-full gap-4 md:gap-6">
      <div className="min-h-[300px] flex-1 md:min-h-0 md:flex-initial w-full md:w-[60%] flex flex-col rounded-[32px] bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden relative">
        <header className="h-[60px] md:h-[72px] flex items-center px-4 md:px-8 bg-[var(--ui-surface)] shrink-0 border-b border-[var(--ui-border)]">
          <h2 className="font-semibold text-[var(--ui-text)] text-[15px] flex items-center gap-3">
            {isProcessing ? (
              <Loader2 className="text-[var(--ui-muted)] animate-spin" size={16} />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--ui-soft)] flex items-center justify-center border border-[var(--ui-border)]">
                <Activity className="text-[var(--ui-muted)]" size={14} />
              </div>
            )}
            Execution Trace
          </h2>
        </header>
        <div
          className="flex-1 overflow-y-auto px-4 md:px-8 pb-4 md:pb-8 pt-4 md:pt-6 space-y-4"
          ref={leftScrollRef}
        >
          {agentSteps.length === 0 && !isProcessing && (
            <div className="text-[var(--ui-muted)] text-sm font-medium mt-10 text-center">
              Start a task to see agent steps here.
            </div>
          )}
          {agentSteps.map((step) => (
            <AgentStepBlock key={step.id} step={step} />
          ))}
        </div>
      </div>

      <div className="min-h-[450px] flex-1 md:min-h-0 md:flex-initial w-full md:w-[40%] flex flex-col rounded-[32px] bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden relative">
        <header className="h-[60px] md:h-[72px] flex items-center px-4 md:px-8 justify-between shrink-0 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--ui-soft)] flex items-center justify-center border border-[var(--ui-border)]">
              <Bot className="text-[var(--ui-muted)]" size={14} />
            </div>
            <h2 className="font-semibold text-[var(--ui-text)] text-[15px]">Virtual Assistant</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-8 space-y-6" ref={scrollRef}>
          {history.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-[var(--ui-muted)] space-y-6">
              <div className="w-16 h-16 bg-[var(--ui-surface)] shadow-sm border border-[var(--ui-border)] rounded-full flex items-center justify-center">
                <Bot size={32} className="text-[var(--ui-muted)]" />
              </div>
              <p className="font-medium text-[var(--ui-muted)]">
                Bagaimana saya boleh bantu operasi Abang Colek hari ini?
              </p>
              <div className="flex flex-wrap justify-center gap-2 w-full max-w-2xl">
                <button
                  onClick={() =>
                    onSendMessage(
                      'Siasat aduan pembungkusan botol kuah colek bocor (LEAKAGE) dan draf emel gantian di Gmail'
                    )
                  }
                  className="px-3.5 py-1.5 bg-[var(--ui-soft)] rounded-full transition-all border border-[var(--ui-border)] text-[var(--ui-accent-text)] font-medium text-[12px] flex items-center gap-1.5 shadow-xs"
                >
                  <Mail size={13} className="text-[var(--ui-accent-text)]" />
                  Aduan Botol Bocor (Gmail)
                </button>
                <button
                  onClick={() =>
                    onSendMessage(
                      'Jadualkan sesi taklimat stokis Terengganu & selatan dalam Google Calendar'
                    )
                  }
                  className="px-3.5 py-1.5 bg-[var(--ui-soft)] rounded-full transition-all border border-[var(--ui-border)] text-[var(--ui-accent-text)] font-medium text-[12px] flex items-center gap-1.5 shadow-xs"
                >
                  <Calendar size={13} className="text-[var(--ui-accent-text)]" />
                  Jadual Mesyuarat Stokis
                </button>
                <button
                  onClick={() =>
                    onSendMessage(
                      'Eksport rekod jualan kuah colek dan botol pakej ejen ke Google Sheets'
                    )
                  }
                  className="px-3.5 py-1.5 bg-[var(--ui-soft)] rounded-full transition-all border border-[var(--ui-border)] text-[var(--ui-success-text)] font-medium text-[12px] flex items-center gap-1.5 shadow-xs"
                >
                  <FileSpreadsheet size={13} className="text-[var(--ui-success-text)]" />
                  Eksport Stokis (Sheets)
                </button>
                <button
                  onClick={() =>
                    onSendMessage(
                      'Cipta tugasan pemeriksaan QC penutup botol kuah colek pembekal di Google Tasks'
                    )
                  }
                  className="px-3.5 py-1.5 bg-[var(--ui-soft)] rounded-full transition-all border border-[var(--ui-border)] text-[var(--ui-accent-text)] font-medium text-[12px] flex items-center gap-1.5 shadow-xs"
                >
                  <CheckSquare size={13} className="text-[var(--ui-accent-text)]" />
                  Tugasan QC Botol (Tasks)
                </button>
              </div>
            </div>
          )}

          {history.map((msg, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx}
              className={cn(
                'flex gap-4 max-w-full',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-auto mb-1',
                  msg.role === 'user'
                    ? 'bg-[var(--ui-inverse)] text-white'
                    : 'bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text)] shadow-sm'
                )}
              >
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>

              <div
                className={cn(
                  'rounded-3xl text-[14px] leading-relaxed max-w-[85%] font-medium',
                  msg.role === 'user'
                    ? 'p-5 bg-[var(--ui-inverse)] text-white rounded-br-[8px]'
                    : msg.hasReport ||
                        msg.hasDashboard ||
                        msg.hasForm ||
                        msg.hasEmail ||
                        msg.hasTask ||
                        msg.hasDoc ||
                        msg.hasCalendar ||
                        msg.hasSheet ||
                        msg.hasMeet ||
                        msg.hasChat ||
                        msg.hasPlugin
                      ? 'p-0'
                      : 'p-5 bg-[var(--ui-surface)] rounded-bl-[8px] text-[var(--ui-text)] border border-[var(--ui-border)] shadow-[0_2px_12px_rgba(0,0,0,0.02)]'
                )}
              >
                {msg.role === 'model' && msg.jevData?.assessment && (
                  <JevAssessmentCard
                    assessment={msg.jevData.assessment}
                    title="Semakan JEV untuk mesej ini"
                  />
                )}
                {msg.role === 'model' &&
                (msg.hasReport ||
                  msg.hasDashboard ||
                  msg.hasForm ||
                  msg.hasEmail ||
                  msg.hasTask ||
                  msg.hasDoc ||
                  msg.hasCalendar ||
                  msg.hasSheet ||
                  msg.hasMeet ||
                  msg.hasChat ||
                  msg.hasPlugin) ? (
                  <div className="flex flex-col gap-3 min-w-[220px]">
                    <div className="p-4 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-3xl rounded-bl-[8px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-2.5">
                      <span className="font-semibold text-[14px] text-[var(--ui-text)] flex items-center gap-2">
                        {msg.hasPlugin ? (
                          <>
                            <Zap
                              size={16}
                              className="text-[var(--ui-accent-text)] fill-[var(--ui-lilac)]"
                            />
                            Tindakan Plugin 3P Selesai
                          </>
                        ) : msg.hasEmail ? (
                          <>
                            <Mail size={16} className="text-[var(--ui-accent-text)]" />
                            Email Delivered via Gmail
                          </>
                        ) : msg.hasCalendar ? (
                          <>
                            <Calendar size={16} className="text-[var(--ui-accent-text)]" />
                            Event Scheduled in Google Calendar
                          </>
                        ) : msg.hasSheet ? (
                          <>
                            <FileSpreadsheet size={16} className="text-[var(--ui-success-text)]" />
                            Spreadsheet Created in Google Sheets
                          </>
                        ) : msg.hasTask ? (
                          <>
                            <CheckSquare size={16} className="text-[var(--ui-accent-text)]" />
                            Task Added to Google Tasks
                          </>
                        ) : msg.hasDoc ? (
                          <>
                            <FileText size={16} className="text-[var(--ui-accent-text)]" />
                            Document Created in Google Docs
                          </>
                        ) : msg.hasForm ? (
                          <>
                            <FolderOpen size={16} className="text-[var(--ui-accent-text)]" />
                            Google Form Created & Published
                          </>
                        ) : msg.hasMeet ? (
                          <>
                            <Video size={16} className="text-[var(--ui-accent-text)]" />
                            Google Meet Room Created
                          </>
                        ) : msg.hasChat ? (
                          <>
                            <MessageSquare size={16} className="text-[var(--ui-accent-text)]" />
                            Message Sent to Google Chat
                          </>
                        ) : msg.hasReport && msg.hasDashboard ? (
                          'Report & Dashboard ready'
                        ) : msg.hasReport ? (
                          'Report now ready'
                        ) : (
                          'Dashboard now ready'
                        )}
                      </span>
                      {msg.hasPlugin && msg.pluginData && (
                        <PluginArtifactCard
                          pluginType={msg.pluginType || ''}
                          data={msg.pluginData}
                          onOpenStore={() => setActiveTab('plugins')}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={cn(
                        'markdown-body',
                        msg.role === 'user' ? 'text-white' : 'text-[var(--ui-text)]'
                      )}
                    >
                      <ReactMarkdown>
                        {msg.parts?.map((p: { text?: string }) => p.text || '').join('') || ''}
                      </ReactMarkdown>
                    </div>
                    {msg.hasPlugin && msg.pluginData && (
                      <PluginArtifactCard
                        pluginType={msg.pluginType || ''}
                        data={msg.pluginData}
                        onOpenStore={() => setActiveTab('plugins')}
                      />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ))}

          {isProcessing && streamingText && !isGeneratingWidget && (
            <div className="flex gap-4 max-w-full">
              <div className="p-5 rounded-3xl text-[14px] leading-relaxed max-w-[85%] font-medium bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text)] opacity-70">
                <ReactMarkdown>{streamingText}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 shrink-0 bg-[var(--ui-surface)]">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center bg-[var(--ui-soft)] rounded-full border border-[var(--ui-border)] p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya apa sahaja atau aktifkan plugin..."
              disabled={isProcessing}
              className="flex-1 bg-transparent px-5 py-2 outline-none placeholder:text-[var(--ui-muted)] text-[var(--ui-text)] text-[14px] font-medium"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="w-10 h-10 rounded-full bg-[var(--ui-primary)] text-[var(--ui-primary-ink)] flex items-center justify-center disabled:opacity-50 transition-colors ml-2 cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 size={16} className="animate-spin text-[var(--ui-primary-ink)]" />
              ) : (
                <Send size={16} className="text-[var(--ui-primary-ink)]" strokeWidth={2} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ReviewsView = ({ onAction }: { onAction: (msg?: string) => void }) => (
  <div className="p-4 md:p-8 h-full overflow-y-auto">
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--ui-text)] tracking-tight">
          Maklum Balas & Ulasan Pelanggan
        </h2>
        <p className="text-[var(--ui-muted)] mt-1 text-[15px] font-medium">
          Pantau ulasan kuah colek, aduan kebocoran penutup botol, dan klasifikasi JEV System-1.
        </p>
      </div>
      <div className="grid gap-4">
        {MOCK_DB.reviews?.map((review, i) => {
          const order = appStore.getOrders().find((o) => o.order_id === review.order_id);
          const customerName = order?.customer_id || `Pelanggan #${review.order_id}`;
          return (
            <div
              key={review.review_id || i}
              className="bg-[var(--ui-surface)] p-6 rounded-3xl border border-[var(--ui-border)] flex justify-between items-start"
            >
              <div>
                <span className="font-semibold text-[17px] text-[var(--ui-text)]">
                  {customerName}
                </span>
                <p className="text-[var(--ui-text)] text-[15px] leading-relaxed my-2">
                  "{review.comment_message}"
                </p>
              </div>
              <button
                onClick={() =>
                  onAction(
                    `Nilaikan maklum balas pelanggan ini menggunakan JEV System-1: "${review.comment_message}"`
                  )
                }
                className="px-4 py-2 text-[12px] font-semibold rounded-full bg-[var(--ui-accent)] text-[var(--ui-accent-ink)]"
              >
                JEV Triage
              </button>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const ReportsView = ({ onAction }: { onAction: (msg?: string) => void }) => (
  <div className="p-4 md:p-8 h-full overflow-y-auto">
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-[var(--ui-text)] tracking-tight">
            Laporan Analisis Perniagaan
          </h2>
          <p className="text-[var(--ui-muted)] mt-1 text-[15px] font-medium">
            Laporan eksekutif operasi yang dijana secara automatik.
          </p>
        </div>
        <button
          onClick={() =>
            onAction(
              'Jana laporan tahunan terperinci prestasi jualan Kuah Colek Buah Abang Colek bagi tahun 2026.'
            )
          }
          className="px-5 py-2.5 bg-[var(--ui-primary)] text-[var(--ui-primary-ink)] rounded-full text-[13px] font-medium"
        >
          + Jana Laporan AI
        </button>
      </div>
      <div className="grid gap-6">
        {[...MOCK_DB.reports].reverse().map((report, i) => (
          <div
            key={i}
            className="bg-[var(--ui-surface)] rounded-[32px] border border-[var(--ui-border)] p-8"
          >
            <h3 className="font-semibold text-[20px] text-[var(--ui-text)]">{report.title}</h3>
            <p className="text-[var(--ui-muted)] mt-2 text-[14px]">{report.executive_summary}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CopilotDiagnosticsView = ({ onAction }: { onAction: (msg?: string) => void }) => {
  const [inspectorState, setInspectorState] = useState<LocalInspectorResult | null>(null);
  const [webMcpGrant, setWebMcpGrant] = useState<WebMcpGrantState>(() => readWebMcpGrant());
  const mcpHostRef = useRef<HTMLDivElement>(null);
  const webMcpSupport = probeWebMcpSupport();
  const sampleValidation = validateA2UIPayload({
    componentName: A2UI_ALLOWLISTED_COMPONENTS[0],
    props: {},
    schemaVersion: 1,
  });
  const sampleToolStatus = toolStatusFromDispatch(
    'verify_workspace_readiness',
    { ok: true, result: { ready: true } },
    'exec-readiness-1'
  );

  const handleLoadInspector = async () => {
    const res = await loadLocalInspector();
    setInspectorState(res);
  };

  const handleMountMcpPreview = () => {
    if (!mcpHostRef.current) return;
    mcpHostRef.current.innerHTML = '';
    mountMcpAppHost({
      container: mcpHostRef.current,
      resourceUri: MCP_APP_RESOURCE_URI,
      height: 220,
    });
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--ui-text)]">
            Copilot A2UI, MCP Host &amp; Diagnostik Tempatan
          </h2>
          <p className="text-xs text-[var(--ui-muted)]">
            Katalog komponen A2UI tetap ({A2UI_ALLOWLISTED_COMPONENTS.length} komponen dibenarkan ·
            status skema: {sampleValidation.valid ? 'SAH' : 'TIDAK SAH'} · status alat:{' '}
            {sampleToolStatus.state})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GooglePickerButton
            label="Pilih Dokumen Drive"
            onPicked={(file) => onAction(`Fail dipilih daripada Google Drive: ${file.name}`)}
          />
          <button
            type="button"
            onClick={handleLoadInspector}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--ui-soft)] border border-[var(--ui-border)] text-[var(--ui-text)]"
          >
            Muat Local Inspector ({isLocalInspectorEnabled() ? 'DEV' : 'PROD'})
          </button>
          <button
            type="button"
            onClick={() =>
              setWebMcpGrant(webMcpGrant.granted ? revokeWebMcp() : grantWebMcp())
            }
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--ui-soft)] border border-[var(--ui-border)] text-[var(--ui-text)]"
          >
            {webMcpGrant.granted ? 'Tarik Balik Kebenaran WebMCP' : 'Beri Kebenaran WebMCP'} (
            {webMcpSupport.reasonCode})
          </button>
          <button
            type="button"
            onClick={handleMountMcpPreview}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--ui-primary)] text-[var(--ui-primary-ink)]"
          >
            Pasang Sandbox MCP ({MCP_APP_RESOURCE_URI})
          </button>
        </div>
      </div>

      {inspectorState && (
        <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-xs text-[var(--ui-text)]">
          {'snapshot' in inspectorState
            ? `Snapshot Inspector: ${inspectorState.snapshot.totals.threads} thread, ${inspectorState.snapshot.totals.toolCalls} panggilan alat.`
            : `${inspectorState.reasonCode}: ${inspectorState.reason}`}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgentInsightCard onAction={onAction} />
        <OperationsBriefCard
          outletId="HQ-KUALA-TERENGGANU"
          date="2026-10-25"
          openOrdersCount={appStore.getOrders().length}
          totalCollectedCashSen={285000}
          pendingDeliveriesCount={4}
          qcAlertCount={0}
        />
        <MarginSimulatorCard
          netSalesSen={450000}
          cogsSen={270000}
          contributionSen={180000}
          marginBps={4000}
          status="passed"
        />
        <RefundImpactPanel
          orderId="ORD-AC-2026"
          requestedRefundSen={3500}
          totalAllocatedSen={3500}
          allocations={[
            { id: 'LINE-1', name: 'Kuah Colek Merah Padu', allocatedSen: 2000 },
            { id: 'LINE-2', name: 'Kuah Colek Hitam Pekat', allocatedSen: 1500 },
          ]}
          driftSen={0}
        />
        <OrderTrackingBadge
          orderId="ORD-AC-2026"
          fulfilmentStatus="dispatched"
          city="Kuala Terengganu"
          isTokenVerified={true}
        />
        <LoyaltyLedgerCard entries={[]} projectionState="ready" source="canonical-ledger" />
      </div>

      <div ref={mcpHostRef} className="rounded-2xl border border-[var(--ui-border)] overflow-hidden" />

      <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
        <AnimatedColekWorld active={0} phase="idle" direction={1} paused={true} />
      </div>
    </div>
  );
};

const BottomNav = ({
  activeTab,
  setActiveTab,
  isToolOrPluginInProgress,
}: {
  activeTab: string;
  setActiveTab: (t: string) => void;
  isToolOrPluginInProgress?: boolean;
}) => {
  const menuItems = [
    { id: 'dashboards', label: 'Utama', icon: Activity },
    { id: 'kiosk', label: 'Kios', icon: ShoppingBag },
    { id: 'orders', label: 'Pesanan', icon: Database },
    { id: 'discovery', label: 'Kualiti', icon: Flame },
    { id: 'chat', label: 'Pembantu', icon: Bot },
  ];

  return (
    <div className="ws-bottom-nav md:hidden flex items-center justify-around bg-[var(--ui-surface)] border-t border-[var(--ui-border)] px-2 py-2.5 shrink-0 pb-safe overflow-x-auto shadow-md">
      {menuItems.map((item) => {
        const isChat = item.id === 'chat';
        const isExecuting = isChat && isToolOrPluginInProgress;

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all shrink-0',
              activeTab === item.id
                ? 'bg-[var(--ui-primary)] text-[var(--ui-primary-ink)] border border-[var(--ui-border)] shadow-xs font-black'
                : 'text-[var(--ui-muted)] hover:text-[var(--ui-accent-text)]',
              isExecuting && activeTab !== item.id && 'text-[var(--ui-accent-text)] font-bold'
            )}
          >
            <item.icon
              size={18}
              strokeWidth={activeTab === item.id ? 2.5 : 2}
              className={activeTab === item.id ? 'text-[var(--ui-primary)]' : ''}
            />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const SUITE_VIEWS: ReadonlyArray<readonly [string, string]> = [
  ['dashboards', 'Dashboard'],
  ['discovery', 'Discovery & JEV'],
  ['orders', 'Pesanan'],
  ['kiosk', 'Kios'],
  ['agent_portal', 'Portal Ejen'],
  ['bus_freight', 'Kargo Bas'],
  ['agent_performance', 'Prestasi Ejen'],
  ['plugins', 'Plugins'],
  ['gmail', 'Gmail'],
  ['calendar', 'Calendar'],
  ['docs', 'Docs'],
  ['sheets', 'Sheets'],
  ['forms', 'Forms'],
  ['meet', 'Meet'],
  ['tasks', 'Tasks'],
  ['chat_workspace', 'Workspace Chat'],
  ['maps', 'Peta'],
  ['copilot_diagnostics', 'A2UI & Diagnostik'],
];

export default function IntegrationWorkspace({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const health = useResource<RedactedHealth[]>('/health');
  const { theme, toggleTheme } = useWorkspaceTheme();
  const [activeTab, setActiveTab] = useState('dashboards');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTool, setCurrentTool] = useState<ToolCall | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isToolExecuting, setIsToolExecuting] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { quickStaffSignIn } = useSupabaseAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    return subscribeToolExecution((executing) => {
      setIsToolExecuting(executing);
    });
  }, []);

  const isToolOrPluginInProgress = Boolean(
    isToolExecuting ||
      (isProcessing &&
        (Boolean(currentTool) ||
          agentSteps.some((s) => s.type === 'tool' && s.status === 'streaming')))
  );

  const handleSendMessage = async (msg: string) => {
    setIsProcessing(true);
    setStreamingText('');
    setAgentSteps([]);
    setCurrentTool(null);
    try {
      await sendMessageToAgentStream(history, msg, (data) => {
        if (data.isDone) {
          setHistory(data.history);
          setIsProcessing(false);
          setStreamingText('');
          setCurrentTool(null);
          setAgentSteps(data.steps);
        } else {
          setHistory(data.history);
          setAgentSteps(data.steps);
          setStreamingText(data.currentText);
          const activeToolStep = data.steps.find(
            (s) => s.type === 'tool' && s.status === 'streaming'
          );
          if (activeToolStep) {
            setCurrentTool({
              id: activeToolStep.id,
              name: activeToolStep.toolName || '',
              args: activeToolStep.toolArgs || {},
            });
          } else {
            setCurrentTool(null);
          }
        }
      });
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      setCurrentTool(null);
    }
  };

  const handleAction = (msg?: string) => {
    setActiveTab('chat');
    if (msg) {
      void handleSendMessage(msg);
    }
  };

  return (
    <section className="platform-legacy">
      <span className="platform-eyebrow">INTEGRATION WORKSPACE</span>
      <h1>Sambung kerja dengan rekod yang sama.</h1>
      <p>
        Dokumen, tugasan, calendar dan customer conversations kini menggunakan ruang kerja sebenar.
        Integrasi luar memerlukan sambungan yang disahkan sebelum digunakan.
      </p>
      <div className="platform-role-chips">
        {[
          ['documents', 'Dokumen'],
          ['tasks', 'Tugasan'],
          ['calendar', 'Calendar'],
          ['cases', 'Customer inbox'],
          ['marketing', 'Marketing studio'],
        ].map(([section, label]) => (
          <button
            key={section}
            className="platform-primary"
            onClick={() => onNavigate(`/founder/${section}`)}
          >
            {label}
          </button>
        ))}
      </div>
      {health.error && (
        <p role="alert" className="platform-alert">
          {health.error}
        </p>
      )}
      {health.loading && <p role="status">Menyemak sambungan…</p>}
      <dl>
        {health.data?.map((item) => (
          <div key={item.component}>
            <dt>{item.component}</dt>
            <dd>
              {item.status} · {item.reasonCode}
            </dd>
          </div>
        ))}
      </dl>
      <p>
        Rekod cloud sedia ada tidak dipindahkan secara automatik. Tiada demo email, meeting link
        atau sales chart digunakan sebagai rekod bisnes.
      </p>

      <div className="platform-role-chips" role="tablist" aria-label="Modul Integrasi & Suite">
        {SUITE_VIEWS.map(([tabId, label]) => (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={activeTab === tabId}
            className="platform-secondary"
            onClick={() => setActiveTab(tabId)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        data-theme={theme}
        data-view={activeTab}
        className="app-shell flex flex-col h-screen overflow-hidden selection:bg-[#8C7DFF] selection:text-[#171422] relative"
      >
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <Sidebar
            theme={theme}
            onToggleTheme={toggleTheme}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isToolOrPluginInProgress={isToolOrPluginInProgress}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />

          <div className="ws-mobile-header md:hidden flex items-center justify-between px-5 pt-4 pb-3 shrink-0 bg-[var(--ui-surface)] border-b border-[var(--ui-border)] shadow-xs">
            <button
              onClick={() => setActiveTab('discovery')}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="flex flex-col">
                <span className="text-base font-black text-[var(--ui-text)] tracking-tight">
                  ABANG COLEK OS
                </span>
                <span className="text-[9px] font-bold text-[var(--ui-accent-text)] uppercase tracking-wider">
                  Liurleleh House Malaysia
                </span>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <button
                aria-label={theme === 'dark' ? 'Tema cerah workspace' : 'Tema gelap workspace'}
                onClick={toggleTheme}
                className="w-11 h-11 rounded-xl bg-[var(--ui-soft)] text-[var(--ui-text)] border border-[var(--ui-border)]"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="p-1.5 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text)] shadow-2xs cursor-pointer"
                title="Cari arahan (Ctrl+K)"
              >
                <Search size={16} className="text-[var(--ui-accent-text)]" />
              </button>
              <WorkspaceMobileMenu activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
          </div>

          <main className="flex-1 flex flex-col overflow-hidden relative px-4 pb-4 pt-2 md:pt-6 md:pb-6 md:pr-6 md:pl-2">
            <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden relative">
              {activeTab === 'discovery' && <AbangColekDiscoveryView onAction={handleAction} />}
              {activeTab === 'chat' && (
                <ChatInterface
                  history={history}
                  onSendMessage={handleSendMessage}
                  isProcessing={isProcessing}
                  currentTool={currentTool}
                  agentSteps={agentSteps}
                  streamingText={streamingText}
                  setActiveTab={setActiveTab}
                />
              )}
              {activeTab === 'bus_freight' && <BusFreightView onAction={handleAction} />}
              {activeTab === 'agent_performance' && (
                <AgentPerformanceView onAction={handleAction} />
              )}
              {activeTab === 'plugins' && <PluginsView onAction={handleAction} />}
              {activeTab === 'gmail' && <GmailView onAction={handleAction} />}
              {activeTab === 'calendar' && <CalendarView onAction={handleAction} />}
              {activeTab === 'tasks' && <TasksView onAction={handleAction} />}
              {activeTab === 'docs' && <DocsView onAction={handleAction} />}
              {activeTab === 'sheets' && <SheetsView onAction={handleAction} />}
              {activeTab === 'forms' && <FormsView onAction={handleAction} />}
              {activeTab === 'meet' && <MeetView onAction={handleAction} />}
              {activeTab === 'chat_workspace' && <ChatWorkspaceView onAction={handleAction} />}
              {activeTab === 'maps' && <MapsView onAction={handleAction} />}
              {activeTab === 'kiosk' && <KioskStorefrontView onAction={handleAction} />}
              {activeTab === 'agent_portal' && <AgentRestockPortalView onAction={handleAction} />}
              {activeTab === 'orders' && <OrdersView onAction={handleAction} />}
              {activeTab === 'reviews' && <ReviewsView onAction={handleAction} />}
              {activeTab === 'reports' && <ReportsView onAction={handleAction} />}
              {activeTab === 'copilot_diagnostics' && (
                <CopilotDiagnosticsView onAction={handleAction} />
              )}
              {activeTab === 'dashboards' && (
                <DashboardView
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onAction={handleAction}
                  setActiveTab={setActiveTab}
                  dashboards={MOCK_DB.dashboards}
                />
              )}
            </div>
          </main>
        </div>

        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isToolOrPluginInProgress={isToolOrPluginInProgress}
        />

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setIsCommandPaletteOpen(false);
          }}
          onTriggerAction={(prompt) => {
            handleAction(prompt);
            setIsCommandPaletteOpen(false);
          }}
          onSwitchStaff={(role) => {
            void quickStaffSignIn(role);
            setIsCommandPaletteOpen(false);
          }}
        />
      </div>
    </section>
  );
}
