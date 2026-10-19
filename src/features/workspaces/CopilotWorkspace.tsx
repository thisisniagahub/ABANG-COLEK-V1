import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Database,
  Loader2,
  Sparkles,
  Activity,
  FileText,
  Mail,
  CheckSquare,
  FolderOpen,
  Calendar,
  FileSpreadsheet,
  Video,
  MessageSquare,
  Zap,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Check,
  XCircle,
  Cpu,
  Server
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import type { 
  ChatMessage, 
  ToolCall, 
  AgentStep 
} from '../../services/gemini';
import { JevAssessmentCard } from '../jev';
import { PluginArtifactCard } from '../../components/PluginArtifactCard';
import { api, currentCsrfToken, useResource } from '../platform/client';
import type { RedactedHealth } from '../../../shared/platform-contracts';

export interface FreeProviderItem {
  id: string;
  name: string;
  defaultModel: string;
  contextWindow: number;
  rateLimitNote: string;
  isConfigured?: boolean;
  isActive?: boolean;
}

export interface CopilotChatMessage extends ChatMessage {
  providerUsed?: string;
  modelUsed?: string;
  generativeUi?: {
    name: string;
    props: Record<string, any>;
  };
  hitlAction?: {
    id: string;
    actionType: 'refund' | 'stock_quarantine' | 'founder_override' | 'commission_contra';
    description: string;
    payload: Record<string, any>;
    status: 'pending_approval' | 'approved' | 'rejected';
    createdAt: string;
  };
}

const DEFAULT_PROVIDERS: FreeProviderItem[] = [
  { id: 'gemini_free', name: 'Google Gemini Flash (AI Studio)', defaultModel: 'gemini-2.5-flash', contextWindow: 1048576, rateLimitNote: '15 RPM / 1M TPM free tier', isConfigured: true, isActive: true },
  { id: 'nvidia', name: 'NVIDIA NIM Flagship Free', defaultModel: 'deepseek-ai/deepseek-r1', contextWindow: 131072, rateLimitNote: 'Free 1,000 requests/key', isConfigured: true, isActive: false },
  { id: 'openrouter', name: 'OpenRouter Free Tier', defaultModel: 'meta-llama/llama-3.3-70b-instruct:free', contextWindow: 131072, rateLimitNote: 'Rotating community free quota', isConfigured: true, isActive: false },
  { id: 'opencode_zen', name: 'OpenCode Zen Coding Free', defaultModel: 'x-preview-f-free', contextWindow: 1048576, rateLimitNote: '1M context free tier for developer tools', isConfigured: true, isActive: false },
  { id: 'ollama', name: 'Ollama Local / Cloud', defaultModel: 'llama3.2:latest', contextWindow: 32768, rateLimitNote: '100% Unlimited local hardware', isConfigured: true, isActive: false },
  { id: 'groq', name: 'Groq LPUs (Fast Free Tier)', defaultModel: 'llama-3.3-70b-versatile', contextWindow: 131072, rateLimitNote: '30 RPM free tier', isConfigured: true, isActive: false },
];

const AgentStepBlock = ({ step }: { step: AgentStep }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-2xl transition-all",
        step.status === 'streaming' 
          ? "bg-[var(--ui-surface)] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[var(--ui-border)]" 
          : "bg-[var(--ui-soft)] border border-[var(--ui-border)]"
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[var(--ui-surface)] shadow-sm border border-[var(--ui-border)] text-[var(--ui-muted)]">
          {step.type === 'tool' ? <Database size={12} /> : <Bot size={12} />}
        </div>
        <span className="font-semibold text-[13px] text-[var(--ui-text)] truncate">
          {step.type === 'tool' ? `Tool Call: ${step.toolName}` : 'Thinking'}
        </span>
        {step.status === 'streaming' && <Loader2 size={12} className="animate-spin text-[var(--ui-muted)] ml-auto shrink-0" />}
        {step.status === 'completed' && step.latencyMs !== undefined && (
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span className="text-[10px] text-[var(--ui-muted)] font-medium">
              {(step.latencyMs / 1000).toFixed(2)}s
            </span>
            <CheckCircle2 size={12} className="text-emerald-500" />
          </div>
        )}
      </div>
      
      {step.type === 'tool' && step.toolArgs && (
        <pre className="text-[10px] bg-[var(--ui-surface)] text-[var(--ui-muted)] p-3 rounded-xl overflow-x-auto mt-2 font-mono whitespace-pre-wrap border border-[var(--ui-border)]">
          {JSON.stringify(step.toolArgs, null, 2)}
        </pre>
      )}
      
      {step.type === 'text' && step.content && (
        <div className="text-[13px] text-[var(--ui-muted)] mt-2 line-clamp-2 leading-relaxed">
          "{step.content}"
        </div>
      )}

      {step.result && (
        <div className="mt-3 pt-2.5 border-t border-[var(--ui-border)] flex flex-col gap-1 text-[11px]">
          <span className="font-semibold text-[var(--ui-muted)] uppercase tracking-wider text-[9px]">Result</span> 
          <span className="text-[var(--ui-text)] truncate font-medium">{step.result.message || 'Success'}</span>
        </div>
      )}
    </motion.div>
  );
};

export default function CopilotWorkspace({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [history, setHistory] = useState<CopilotChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [providers, setProviders] = useState<FreeProviderItem[]>(DEFAULT_PROVIDERS);
  const [activeProviderId, setActiveProviderId] = useState<string>('gemini_free');
  const [switchingProvider, setSwitchingProvider] = useState(false);
  const health = useResource<RedactedHealth[]>('/health');

  const scrollRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);

  // Load available providers from platform API
  useEffect(() => {
    api<FreeProviderItem[]>('/copilot/providers')
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setProviders(res);
          const active = res.find(p => p.isActive);
          if (active) setActiveProviderId(active.id);
        }
      })
      .catch(() => {
        // Fallback to initial local catalogue
      });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isProcessing, streamingText]);

  useEffect(() => {
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = leftScrollRef.current.scrollHeight;
    }
  }, [agentSteps]);

  const handleSelectProvider = async (providerId: string) => {
    if (providerId === activeProviderId || switchingProvider) return;
    setSwitchingProvider(true);
    try {
      await api('/copilot/provider', {
        method: 'POST',
        body: JSON.stringify({ providerId })
      });
      setActiveProviderId(providerId);
      setProviders(prev => prev.map(p => ({
        ...p,
        isActive: p.id === providerId
      })));
    } catch (err) {
      console.error('Ralat pertukaran provider:', err);
    } finally {
      setSwitchingProvider(false);
    }
  };

  const handleHitlDecide = async (actionId: string, approve: boolean) => {
    try {
      await api(`/copilot/hitl/${actionId}/decide`, {
        method: 'POST',
        body: JSON.stringify({ approve })
      });
      setHistory(prev => prev.map(msg => {
        if (msg.hitlAction?.id === actionId) {
          return {
            ...msg,
            hitlAction: {
              ...msg.hitlAction,
              status: approve ? 'approved' : 'rejected'
            }
          };
        }
        return msg;
      }));
    } catch (err: any) {
      alert(`Gagal memproses keputusan HITL: ${err?.message || 'Ralat'}`);
    }
  };

  const handleSendMessage = async (msg: string) => {
    if (!msg.trim() || isProcessing) return;
    setIsProcessing(true);
    setStreamingText('');
    setAgentSteps([
      { id: 'step-start', type: 'text', content: `Menghubungi Copilot ADK (${activeProviderId})...`, status: 'streaming' }
    ]);

    const userMsg: CopilotChatMessage = {
      role: 'user',
      parts: [{ text: msg }],
      timestamp: new Date()
    };
    setHistory(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/platform/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(currentCsrfToken() ? { 'X-CSRF-Token': currentCsrfToken() } : {})
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          message: msg,
          history: history.map(h => ({
            role: h.role === 'model' ? 'assistant' : h.role,
            content: (h.parts && h.parts[0] && 'text' in h.parts[0] ? h.parts[0].text : '') || ''
          })),
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Platform error HTTP ${response.status}`);
      }

      let replyAccumulator = '';
      let genUi: any = null;
      let hitl: any = null;
      let providerUsed = activeProviderId;
      let modelUsed = '';

      if (response.headers.get('content-type')?.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              try {
                const parsed = JSON.parse(dataStr);
                if (currentEvent === 'start') {
                  setAgentSteps(prev => [
                    ...prev.map(s => ({ ...s, status: 'completed' as const })),
                    { id: 'step-run', type: 'text', content: `Penyedia model percuma aktif: ${parsed.activeProvider}`, status: 'streaming' }
                  ]);
                } else if (currentEvent === 'gen_ui') {
                  genUi = parsed;
                  setAgentSteps(prev => [
                    ...prev,
                    { id: 'step-genui', type: 'tool', toolName: parsed.name, status: 'completed', toolArgs: parsed.props }
                  ]);
                } else if (currentEvent === 'hitl_prompt') {
                  hitl = parsed;
                  setAgentSteps(prev => [
                    ...prev,
                    { id: 'step-hitl', type: 'tool', toolName: 'Human-In-The-Loop Gate', status: 'completed', toolArgs: { actionType: parsed.actionType, description: parsed.description } }
                  ]);
                } else if (currentEvent === 'text_delta') {
                  if (parsed.content) {
                    replyAccumulator += parsed.content;
                    setStreamingText(replyAccumulator);
                  }
                } else if (currentEvent === 'done') {
                  if (parsed.reply) replyAccumulator = parsed.reply;
                  if (parsed.providerUsed) providerUsed = parsed.providerUsed;
                  if (parsed.modelUsed) modelUsed = parsed.modelUsed;
                  if (parsed.generativeUi) genUi = parsed.generativeUi;
                  if (parsed.hitlAction) hitl = parsed.hitlAction;
                }
              } catch {
                // Ignore parse errors on partial stream lines
              }
            }
          }
        }
      } else {
        const resData = await response.json();
        const payload = resData.data || resData;
        replyAccumulator = payload.reply || '';
        genUi = payload.generativeUi;
        hitl = payload.hitlAction;
        providerUsed = payload.providerUsed || activeProviderId;
        modelUsed = payload.modelUsed || '';
      }

      const botMsg: CopilotChatMessage = {
        role: 'model',
        parts: [{ text: replyAccumulator }],
        timestamp: new Date(),
        generativeUi: genUi,
        hitlAction: hitl,
        providerUsed,
        modelUsed
      };

      setHistory(prev => [...prev, botMsg]);
      setStreamingText('');
      setAgentSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));
    } catch (err: any) {
      console.error(err);
      const errorMsg: CopilotChatMessage = {
        role: 'model',
        parts: [{ text: `⚠️ **Ralat Pemprosesan:** ${err?.message || 'Gagal menghubungi Copilot ADK'}` }],
        timestamp: new Date()
      };
      setHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    const msg = input;
    setInput('');
    void handleSendMessage(msg);
  };

  const currentProvider = providers.find(p => p.id === activeProviderId) || DEFAULT_PROVIDERS[0];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-2 md:p-4">
      {/* Top Banner Status & Multi-Provider Free Router */}
      <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-[16px] text-[var(--ui-text)]">
                Google ADK Copilot — {currentProvider.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Zap size={11} className="text-emerald-600" /> Sifar Kos Protocol
              </span>
            </div>
            <p className="text-[12px] text-[var(--ui-muted)]">
              Pembantu operasi berbilang penyedia percuma. Auto-failover antara NVIDIA NIM, OpenRouter, OpenCode Zen, Gemini Flash, & Ollama.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Free Provider Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-[var(--ui-soft)] border border-[var(--ui-border)] rounded-xl px-2.5 py-1">
            <Cpu size={14} className="text-amber-500" />
            <select
              value={activeProviderId}
              onChange={e => void handleSelectProvider(e.target.value)}
              disabled={switchingProvider || isProcessing}
              className="bg-transparent text-[12px] font-semibold text-[var(--ui-text)] outline-none cursor-pointer"
            >
              {providers.map(p => (
                <option key={p.id} value={p.id} className="bg-[var(--ui-surface)] text-[var(--ui-text)]">
                  {p.name} ({p.defaultModel})
                </option>
              ))}
            </select>
            {switchingProvider && <Loader2 size={12} className="animate-spin text-amber-500 ml-1" />}
          </div>

          <button 
            onClick={() => onNavigate('/founder/cases')} 
            className="px-3 py-1.5 rounded-xl border border-[var(--ui-border)] text-[12px] font-medium text-[var(--ui-text)] hover:bg-[var(--ui-soft)] transition-colors"
          >
            Aduan & JEV &rarr;
          </button>
          <button 
            onClick={() => onNavigate('/founder/plugins')} 
            className="px-3 py-1.5 rounded-xl border border-[var(--ui-border)] text-[12px] font-medium text-[var(--ui-text)] hover:bg-[var(--ui-soft)] transition-colors"
          >
            Plugins &rarr;
          </button>
        </div>
      </div>

      {/* Main Split Layout: Chat & Execution Trace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        {/* Left: Chat Pane (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-3xl bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-xs overflow-hidden">
          {/* Chat Header */}
          <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--ui-border)] shrink-0">
            <span className="font-semibold text-[14px] text-[var(--ui-text)] flex items-center gap-2">
              <MessageSquare size={16} className="text-amber-500" />
              Sesi Perbualan Langsung (ADK Stream)
            </span>
            <span className="text-[11px] font-medium text-[var(--ui-muted)] flex items-center gap-1.5">
              <Server size={12} className="text-emerald-500" /> {currentProvider.defaultModel}
            </span>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-h-[500px]" ref={scrollRef}>
            {history.length === 0 && (
              <div className="h-full py-8 flex flex-col items-center justify-center text-center space-y-4 text-[var(--ui-muted)]">
                <div className="w-14 h-14 rounded-2xl bg-[var(--ui-soft)] flex items-center justify-center text-[var(--ui-text)] border border-[var(--ui-border)]">
                  <Bot size={28} />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-[var(--ui-text)]">Bagaimana saya boleh bantu operasi hari ini?</h3>
                  <p className="text-[13px] text-[var(--ui-muted)] mt-1 max-w-md">
                    Pilih daripada tugasan cadangan di bawah atau taip arahan terus ke dalam kotak input.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-xl pt-2">
                  <button 
                    onClick={() => void handleSendMessage("Siasat aduan pembungkusan botol kuah colek bocor (LEAKAGE) dan minta gantian rugi (refund)")} 
                    className="px-3.5 py-1.5 bg-[var(--ui-soft)] hover:bg-[var(--ui-soft)]/80 rounded-xl text-[12px] font-medium text-[var(--ui-text)] border border-[var(--ui-border)] flex items-center gap-1.5 transition-all text-left"
                  >
                    <Mail size={13} className="text-amber-500" /> Siasat Botol Bocor & Refund (HITL)
                  </button>
                  <button 
                    onClick={() => void handleSendMessage("Simulasi margin sumbangan kempen promosi Beli 3 Percuma 1")} 
                    className="px-3.5 py-1.5 bg-[var(--ui-soft)] hover:bg-[var(--ui-soft)]/80 rounded-xl text-[12px] font-medium text-[var(--ui-text)] border border-[var(--ui-border)] flex items-center gap-1.5 transition-all text-left"
                  >
                    <Sparkles size={13} className="text-emerald-500" /> Simulasi Margin Promosi
                  </button>
                  <button 
                    onClick={() => void handleSendMessage("Jejak status kargo bas ekspres Pantai Timur (TBS ke MBKT)")} 
                    className="px-3.5 py-1.5 bg-[var(--ui-soft)] hover:bg-[var(--ui-soft)]/80 rounded-xl text-[12px] font-medium text-[var(--ui-text)] border border-[var(--ui-border)] flex items-center gap-1.5 transition-all text-left"
                  >
                    <Activity size={13} className="text-blue-500" /> Penjejakan Kargo Bas (TBS)
                  </button>
                  <button 
                    onClick={() => void handleSendMessage("Jadualkan sesi taklimat stokis Terengganu & selatan dalam Google Calendar")} 
                    className="px-3.5 py-1.5 bg-[var(--ui-soft)] hover:bg-[var(--ui-soft)]/80 rounded-xl text-[12px] font-medium text-[var(--ui-text)] border border-[var(--ui-border)] flex items-center gap-1.5 transition-all text-left"
                  >
                    <Calendar size={13} className="text-purple-500" /> Taklimat Stokis (Calendar)
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
                  "flex gap-3 max-w-full",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-auto mb-1",
                  msg.role === 'user' ? "bg-[var(--ui-primary)] text-[var(--ui-primary-ink)]" : "bg-[var(--ui-soft)] border border-[var(--ui-border)] text-[var(--ui-text)]"
                )}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                
                <div className={cn(
                  "rounded-2xl text-[13.5px] leading-relaxed max-w-[85%] font-medium",
                  msg.role === 'user' 
                    ? "p-4 bg-[var(--ui-primary)] text-[var(--ui-primary-ink)] rounded-br-xs" 
                    : "p-4 bg-[var(--ui-soft)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-bl-xs"
                )}>
                  {/* Generative UI: JEV Assessment Card */}
                  {msg.role === 'model' && msg.generativeUi?.name === 'JevAssessmentCard' && (
                    <div className="mb-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-[12.5px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-amber-700 dark:text-amber-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle size={13} /> Semakan JEV Sistem-1
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {msg.generativeUi.props.issueClass} ({(msg.generativeUi.props.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <p className="text-[12px] text-[var(--ui-text)] font-semibold mb-1">
                        SOP: {msg.generativeUi.props.sopAction}
                      </p>
                      <p className="text-[11px] text-[var(--ui-muted)]">
                        Invariant: Punca utama (Root Cause) = <span className="font-mono font-bold text-amber-600">{msg.generativeUi.props.rootCause}</span> sehingga semakan kilang selesai.
                      </p>
                    </div>
                  )}

                  {/* Generative UI: Margin Simulator Card */}
                  {msg.role === 'model' && msg.generativeUi?.name === 'MarginSimulator' && (
                    <div className="mb-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-[12.5px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={13} /> Margin Guardian Simulator
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {msg.generativeUi.props.status || 'PASSED'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[20px] font-black text-emerald-600">{msg.generativeUi.props.contributionMarginPct}%</span>
                        <span className="text-[11px] text-[var(--ui-muted)]">(Ambang minima: {msg.generativeUi.props.requiredMarginPct}%)</span>
                      </div>
                      <p className="text-[11px] text-[var(--ui-muted)]">Margin sumbangan mencukupi. Invariant Rules Own The Money dipatuhi.</p>
                    </div>
                  )}

                  {/* Generative UI: Order Tracking Badge */}
                  {msg.role === 'model' && msg.generativeUi?.name === 'OrderTrackingBadge' && (
                    <div className="mb-3 p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 text-[12.5px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-blue-700 dark:text-blue-400 text-[11px] uppercase tracking-wider">
                          Penjejakan Kargo Bas Bersepadu
                        </span>
                        <span className="text-[10px] font-mono text-blue-600">TBS &rarr; MBKT</span>
                      </div>
                      <p className="text-[11px] text-[var(--ui-muted)] mb-1">Status: Notifikasi automatik WhatsApp 1 jam sebelum tiba diaktifkan.</p>
                      <span className="text-[10px] font-mono text-[var(--ui-muted)]">{msg.generativeUi.props.security}</span>
                    </div>
                  )}

                  {/* Human-In-The-Loop Approval Gate Card */}
                  {msg.role === 'model' && msg.hitlAction && (
                    <div className="mb-3 p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-[12.5px]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-[11px] uppercase tracking-wider">
                          <ShieldAlert size={14} /> Human-In-The-Loop Gate
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          msg.hitlAction.status === 'approved' ? "bg-emerald-100 text-emerald-800" :
                          msg.hitlAction.status === 'rejected' ? "bg-rose-100 text-rose-800" :
                          "bg-amber-100 text-amber-900"
                        )}>
                          {msg.hitlAction.status === 'approved' ? 'Diluluskan' : msg.hitlAction.status === 'rejected' ? 'Ditolak' : 'Menunggu Pengesahan'}
                        </span>
                      </div>
                      <p className="text-[var(--ui-text)] font-semibold mb-1">{msg.hitlAction.description}</p>
                      <pre className="text-[10px] bg-[var(--ui-surface)] p-2 rounded border border-[var(--ui-border)] overflow-x-auto mb-2 text-[var(--ui-muted)] font-mono">
                        {JSON.stringify(msg.hitlAction.payload, null, 2)}
                      </pre>
                      {msg.hitlAction.status === 'pending_approval' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleHitlDecide(msg.hitlAction!.id, true)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11.5px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Check size={12} /> Luluskan Tindakan
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHitlDecide(msg.hitlAction!.id, false)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11.5px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <XCircle size={12} /> Tolak Permintaan
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Standard Text Markdown Body */}
                  {msg.parts && msg.parts.map((p, pIdx) => {
                    if ('text' in p && p.text) {
                      return (
                        <div key={pIdx} className="markdown-body">
                          <ReactMarkdown>{p.text}</ReactMarkdown>
                        </div>
                      );
                    }
                    return null;
                  })}

                  {/* Model & Provider Attribution Footer */}
                  {msg.role === 'model' && (msg.providerUsed || msg.modelUsed) && (
                    <div className="mt-2.5 pt-2 border-t border-[var(--ui-border)] text-[10px] text-[var(--ui-muted)] flex items-center gap-2 font-mono">
                      <Cpu size={10} className="text-amber-500" />
                      <span>{msg.providerUsed || 'Gemini'}</span>
                      {msg.modelUsed && <span>• {msg.modelUsed}</span>}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isProcessing && streamingText && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-full"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--ui-soft)] border border-[var(--ui-border)] text-[var(--ui-text)] flex items-center justify-center shrink-0 mt-auto mb-1">
                  <Bot size={14} />
                </div>
                <div className="p-4 rounded-2xl text-[13.5px] leading-relaxed max-w-[85%] font-medium bg-[var(--ui-soft)] text-[var(--ui-text)] border border-[var(--ui-border)] opacity-90">
                  <ReactMarkdown>{streamingText}</ReactMarkdown>
                </div>
              </motion.div>
            )}

            {isProcessing && !streamingText && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--ui-soft)] border border-[var(--ui-border)] text-[var(--ui-text)] flex items-center justify-center mt-auto mb-1">
                  <Bot size={14} />
                </div>
                <div className="bg-[var(--ui-soft)] px-4 py-3 rounded-2xl border border-[var(--ui-border)] flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-[var(--ui-border)] bg-[var(--ui-surface)]">
            <form onSubmit={handleSubmit} className="relative flex items-center bg-[var(--ui-soft)] rounded-full border border-[var(--ui-border)] p-1.5 focus-within:ring-2 focus-within:ring-amber-500/20">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya copilot apa sahaja mengenai operasi, stok, atau isu kualiti..."
                disabled={isProcessing}
                className="flex-1 bg-transparent px-4 py-2 outline-none placeholder:text-[var(--ui-muted)] text-[var(--ui-text)] text-[13.5px] font-medium"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="w-9 h-9 rounded-full bg-[var(--ui-primary)] text-[var(--ui-primary-ink)] flex items-center justify-center disabled:opacity-50 transition-colors shrink-0"
              >
                {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Execution Trace Pane (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-xs overflow-hidden">
          <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--ui-border)] shrink-0">
            <span className="font-semibold text-[14px] text-[var(--ui-text)] flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" />
              Jejak Pelaksanaan (Execution Trace)
            </span>
            <span className="text-[11px] font-mono text-[var(--ui-muted)]">
              {agentSteps.length} langkah
            </span>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[560px]" ref={leftScrollRef}>
            {agentSteps.length === 0 && !isProcessing && (
              <div className="h-full py-12 flex flex-col items-center justify-center text-center text-[var(--ui-muted)] space-y-2">
                <Database size={24} className="opacity-40" />
                <p className="text-[13px] font-medium">Tiada panggilan alatan aktif.</p>
                <p className="text-[11px] text-[var(--ui-muted)] max-w-xs">
                  Sebaik sahaja arahan copilot dihantar, langkah alatan dan parameter audit akan dipaparkan di sini.
                </p>
              </div>
            )}
            {agentSteps.map((step) => (
              <AgentStepBlock key={step.id} step={step} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
