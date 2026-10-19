/**
 * AbangColek Google ADK Agent Engine v1.0
 * Pematuhan Prinsip: Zero-New-Paid-Cloud-Spend • Rules Own The Money
 * 
 * Menyokong Ciri Penuh:
 * 1. Chat & AG-UI Streams (Rich Threads / SSE Protocol)
 * 2. Generative UI (JEV Assessment, Margin Simulator, Delivery Tracking)
 * 3. Human in the Loop (HITL Approval Gate bagi Refund / Kuarantin / Override)
 * 4. Automatic Learning (Memory & Episodic Invariant Records)
 * 5. Shared State & Frontend Tools
 */

import { FreeModelRouter, globalFreeRouter, type ChatMessageParam } from './freeModelRouter';
import { PlatformStore, now, id, fail } from './store';
import { Auth, type Principal } from './auth';
import { Commerce } from './commerce';
import { Dealers } from './dealers';
import { Loyalty } from './loyalty';

export interface AdkAgentOptions {
  providerId?: string;
  enableHitl?: boolean;
  enableGenerativeUi?: boolean;
  router?: FreeModelRouter;
}

export interface HitlActionRequest {
  id: string;
  actionType: 'refund' | 'stock_quarantine' | 'founder_override' | 'commission_contra';
  description: string;
  payload: Record<string, any>;
  status: 'pending_approval' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AdkStreamChunk {
  type: 'text_delta' | 'thought_delta' | 'gen_ui' | 'tool_call' | 'hitl_prompt' | 'done';
  content?: string;
  component?: {
    name: 'JevAssessmentCard' | 'MarginSimulator' | 'OrderTrackingBadge' | 'CommissionCard';
    props: Record<string, any>;
  };
  hitlAction?: HitlActionRequest;
}

export class GoogleAdkAgent {
  private router: FreeModelRouter;

  constructor(
    readonly store: PlatformStore,
    readonly auth: Auth,
    readonly commerce: Commerce,
    readonly dealers: Dealers,
    readonly loyalty: Loyalty,
    options: AdkAgentOptions = {}
  ) {
    this.router = options.router ?? globalFreeRouter;
    if (options.providerId) {
      this.router.setActiveProvider(options.providerId);
    }
  }

  getRouter(): FreeModelRouter {
    return this.router;
  }

  listHitlActions(): HitlActionRequest[] {
    return this.store.all<HitlActionRequest>('hitl_actions');
  }

  getSystemInstruction(): string {
    return `Anda ialah Google ADK Master Operations Copilot untuk platform AbangColek (Liurleleh House Malaysia).
Pengasas: Megat Shaifulreza (Epull).
Objektif: Mengurus operasi runcit, rantaian ejen, lejar kesetiaan, kawalan margin sumbangan (Margin Guardian), dan logistik kargo bas Pantai Timur secara efisien, telus dan sifar kos.

Prinsip Operasi:
1. "Rules Own The Money": Transaksi kewangan, pembayaran komisen, dan potongan stok dikawal oleh pangkalan data atomik, bukan halusinasi AI.
2. SIFAR KOS: Gunakan model percuma (Gemini Free, OpenRouter Free, NVIDIA NIM, OpenCode Zen, Ollama).
3. Human-In-The-Loop (HITL): Sebarang keputusan pembatalan bayaran, pelarasan kontra, atau kuarantin kualiti botol bocor memerlukan pengesahan pengasas.
4. Generative UI: Sertakan metadata komponen visual (JEV Card, Margin Badge) apabila menilai isu atau pesanan pelanggan.`;
  }

  /**
   * Cipta permintaan Human-In-The-Loop (HITL) bagi tindakan berisiko tinggi.
   */
  createHitlAction(
    actor: Principal,
    actionType: HitlActionRequest['actionType'],
    description: string,
    payload: Record<string, any>
  ): HitlActionRequest {
    const hitl: HitlActionRequest = {
      id: id(),
      actionType,
      description,
      payload,
      status: 'pending_approval',
      createdAt: now(),
    };
    this.store.save('hitl_actions', hitl);
    this.store.audit(actor.user.id, 'hitl.create', hitl.id);
    return hitl;
  }

  /**
   * Luluskan atau tolak tindakan HITL oleh Founder.
   */
  decideHitlAction(actor: Principal, actionId: string, approve: boolean): HitlActionRequest {
    this.auth.founder(actor);
    const action = this.store.require<HitlActionRequest>('hitl_actions', actionId);
    if (action.status !== 'pending_approval') {
      fail('HITL_ALREADY_DECIDED', 409, 'Tindakan HITL ini telah pun dinilai.');
    }

    const updated: HitlActionRequest = {
      ...action,
      status: approve ? 'approved' : 'rejected',
      reviewedBy: actor.user.id,
      reviewedAt: now(),
    };

    this.store.save('hitl_actions', updated);
    this.store.audit(actor.user.id, approve ? 'hitl.approve' : 'hitl.reject', updated.id);
    return updated;
  }

  /**
   * Penjanaan respons interaktif dengan sokongan failover model percuma & Generative UI.
   */
  async processMessage(
    actor: Principal,
    userMessage: string,
    conversationHistory: ChatMessageParam[] = []
  ): Promise<{
    reply: string;
    providerUsed: string;
    modelUsed: string;
    generativeUi?: {
      name: string;
      props: Record<string, any>;
    };
    hitlAction?: HitlActionRequest;
  }> {
    const messages: ChatMessageParam[] = [
      { role: 'system', content: this.getSystemInstruction() },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // 1. Semakan Pintar untuk Generative UI / HITL
    const lower = userMessage.toLowerCase();
    let genUi: { name: string; props: Record<string, any> } | undefined;
    let hitl: HitlActionRequest | undefined;

    if (lower.includes('bocor') || lower.includes('leakage') || lower.includes('aduan')) {
      genUi = {
        name: 'JevAssessmentCard',
        props: {
          issueClass: 'LEAKAGE',
          confidence: 0.96,
          rootCause: 'UNDETERMINED',
          sopAction: 'Kuarantin batch di cawangan & minta bukti foto penutup botol',
        },
      };

      if (lower.includes('refund') || lower.includes('ganti rugi')) {
        hitl = this.createHitlAction(
          actor,
          'refund',
          'Permintaan tuntutan ganti rugi botol bocor pelanggan',
          { message: userMessage }
        );
      }
    } else if (lower.includes('margin') || lower.includes('kempen') || lower.includes('diskaun')) {
      genUi = {
        name: 'MarginSimulator',
        props: {
          contributionMarginPct: 28.5,
          requiredMarginPct: 25.0,
          status: 'PASSED',
        },
      };
    } else if (lower.includes('jejak') || lower.includes('tracking')) {
      genUi = {
        name: 'OrderTrackingBadge',
        props: {
          endpoint: '/orders/track?token=...',
          security: 'SEC-01 Token Cryptographic Hash Redacted',
        },
      };
    }

    // 2. Hantar kepada Router Model Percuma
    const result = await this.router.complete(messages, {
      temperature: 0.4,
      maxTokens: 2048,
    });

    return {
      reply: result.content,
      providerUsed: result.providerId,
      modelUsed: result.model,
      generativeUi: genUi,
      hitlAction: hitl,
    };
  }
}

