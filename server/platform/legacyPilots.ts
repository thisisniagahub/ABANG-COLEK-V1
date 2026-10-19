import { id, now, text, integer, oneOf, fail, DomainError } from './store';
import type { PlatformStore } from './store';
import type {
  WorkspaceConsentGrant,
  WorkspaceActionReceipt,
  BusFreightShipment,
  FounderAssistantProposal,
} from '../../shared/pilot-contracts';

export interface VerifiedRoute {
  routeId: string;
  carrier: string;
  originHub: string;
  destinationHub: string;
}

export const VERIFIED_BUS_ROUTES: readonly VerifiedRoute[] = [
  {
    routeId: 'LARKIN-MBKT',
    carrier: 'Adik Beradik Express',
    originHub: 'Larkin Sentral, Johor Bahru',
    destinationHub: 'Terminal MBKT, Kuala Terengganu',
  },
  {
    routeId: 'SHAHALAM-MBKT',
    carrier: 'Sani Express',
    originHub: 'Terminal Shah Alam Seksyen 17',
    destinationHub: 'Terminal MBKT, Kuala Terengganu',
  },
  {
    routeId: 'LARKIN-SHAHALAM',
    carrier: 'Transnasional Express',
    originHub: 'Larkin Sentral, Johor Bahru',
    destinationHub: 'Terminal Shah Alam Seksyen 17',
  },
];

export class LegacyPilotsService {
  constructor(private readonly store: PlatformStore) {}

  // ==========================================
  // 1. GOOGLE WORKSPACE CONSENT & ACTION PILOT
  // ==========================================

  grantWorkspaceConsent(actorId: string, scopes: ('docs.draft' | 'calendar.sync' | 'sheets.export')[]): WorkspaceConsentGrant {
    if (!Array.isArray(scopes) || scopes.length === 0 || scopes.length > 3 || scopes.some(scope => !['docs.draft','calendar.sync','sheets.export'].includes(scope))) {
      fail('INVALID_SCOPES', 400, 'Sekurang-kurangnya satu skop integrasi diperlukan.');
    }
    const grant: WorkspaceConsentGrant = {
      id: id(),
      userId: actorId,
      scopes,
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now(),
    };
    this.store.save('workspace_grants', grant);
    this.store.audit(actorId, 'WORKSPACE_CONSENT_GRANTED', grant.id, 1);
    return grant;
  }

  revokeWorkspaceConsent(actorId: string, grantId: string): WorkspaceConsentGrant {
    const grant = this.store.get<WorkspaceConsentGrant>('workspace_grants', grantId);
    if (!grant) fail('NOT_FOUND', 404, 'Kebenaran integrasi tidak ditemui.');
    if (grant.userId !== actorId) fail('FORBIDDEN', 403, 'Akses kebenaran tidak sah.');

    const updated: WorkspaceConsentGrant = {
      ...grant,
      status: 'revoked',
    };
    this.store.save('workspace_grants', updated);
    this.store.audit(actorId, 'WORKSPACE_CONSENT_REVOKED', grant.id, 2);
    return updated;
  }

  executeWorkspaceOperation(
    actorId: string,
    operation: 'draft_doc' | 'sync_calendar' | 'export_sheet',
    entityId: string,
    payload: { title?: string; summary?: string } = {}
  ): WorkspaceActionReceipt {
    const grants = this.store.all<WorkspaceConsentGrant>('workspace_grants')
      .filter(g => g.userId === actorId && g.status === 'active' && new Date(g.expiresAt).getTime() > Date.now());

    const requiredScope = operation === 'draft_doc' ? 'docs.draft'
      : operation === 'sync_calendar' ? 'calendar.sync'
      : 'sheets.export';

    const validGrant = grants.find(g => g.scopes.includes(requiredScope));
    if (!validGrant) {
      throw new DomainError('CONSENT_REQUIRED', 403, `Persetujuan pengguna bagi skop '${requiredScope}' diperlukan sebelum operasi dijalankan.`);
    }

    // Consent alone cannot establish that a provider operation actually happened.
    fail('WORKSPACE_UNAVAILABLE',409,'Integrasi Google Workspace belum tersedia.');
  }

  // ==========================================
  // 2. BUS FREIGHT LOGISTICS PILOT
  // ==========================================

  createBusFreightShipment(
    actorId: string,
    input: {
      routeId: string;
      packageDescription: string;
      cartonCount: number;
      totalWeightKg: number;
      scheduledDeparture?: string;
    }
  ): BusFreightShipment {
    const route = VERIFIED_BUS_ROUTES.find(r => r.routeId === input.routeId);
    if (!route) {
      fail('INVALID_BUS_ROUTE', 400, `Laluan kargo bas '${input.routeId}' tidak disahkan.`);
    }

    const cartons = integer(input.cartonCount, 'Bilangan karton', 1, 50);
    const weight = integer(input.totalWeightKg, 'Jumlah berat (kg)', 1, 250);
    const desc = text(input.packageDescription, 'Deskripsi bungkusan', 200, 3);

    const departure = input.scheduledDeparture ? new Date(input.scheduledDeparture).toISOString() : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const consignmentNo = `AC-BUS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomHex}`;

    const shipment: BusFreightShipment = {
      id: id(),
      carrier: route.carrier,
      routeId: route.routeId,
      originHub: route.originHub,
      destinationHub: route.destinationHub,
      scheduledDeparture: departure,
      packageDescription: desc,
      cartonCount: cartons,
      totalWeightKg: weight,
      consignmentNo,
      status: 'booked',
      createdAt: now(),
    };

    this.store.save('bus_shipments', shipment);
    this.store.audit(actorId, 'BUS_FREIGHT_BOOKED', shipment.id, 1);
    return shipment;
  }

  updateBusFreightStatus(actorId: string, shipmentId: string, status: 'booked' | 'departed' | 'received'): BusFreightShipment {
    const shipment = this.store.get<BusFreightShipment>('bus_shipments', shipmentId);
    if (!shipment) fail('NOT_FOUND', 404, 'Kiriman kargo bas tidak ditemui.');

    const updated: BusFreightShipment = {
      ...shipment,
      status,
    };
    this.store.save('bus_shipments', updated);
    this.store.audit(actorId, `BUS_FREIGHT_${status.toUpperCase()}`, shipment.id, 2);
    return updated;
  }

  // ==========================================
  // 3. FOUNDER ASSISTANT PILOT
  // ==========================================

  proposeFounderAction(actorId: string, query: string): FounderAssistantProposal {
    const cleanQuery = text(query, 'Pertanyaan Pengasas', 500, 3);

    // Refusal check for direct financial operations/escalations
    const prohibitedTerms = ['payout', 'refund', 'transfer', 'bayar', 'wang', 'duit', 'bank', 'disburse'];
    const lower = cleanQuery.toLowerCase();
    if (prohibitedTerms.some(term => lower.includes(term))) {
      throw new DomainError('FINANCIAL_ESCALATION_PROHIBITED', 403, 'Tindakan kewangan langsung tidak dibenarkan melalui pembantu maya.');
    }

    // Grounded platform context checks
    const records = this.store.all<{ id: string }>('lots');
    const cases = this.store.all<{ id: string }>('cases');
    const campaigns = this.store.all<{ id: string }>('campaigns');

    let command: 'review_cases' | 'review_stock' | 'draft_campaign' = 'review_cases';
    let params: Record<string, unknown> = { urgentOnly: true };

    if (lower.includes('stok') || lower.includes('stock') || lower.includes('inventori')) {
      command = 'review_stock';
      params = { threshold: 20, totalTracked: records.length };
    } else if (lower.includes('kempen') || lower.includes('marketing') || lower.includes('promosi') || lower.includes('campaign')) {
      command = 'draft_campaign';
      params = { title: 'Draf Kempen Abang Colek', channel: 'whatsapp', existingCampaigns: campaigns.length };
    } else {
      command = 'review_cases';
      params = { urgentOnly: true, openCases: cases.length };
    }

    const proposal: FounderAssistantProposal = {
      id: id(),
      query: cleanQuery,
      contextSummary: `Konteks platform: ${records.length} rekod lot inventori, ${cases.length} kes khidmat, ${campaigns.length} kempen pemasaran.`,
      proposedAction: {
        command,
        parameters: params,
      },
      policyChecks: {
        noFinancialEscalation: true,
        founderApprovalRequired: true,
      },
      status: 'proposed',
      createdAt: now(),
    };

    this.store.save('founder_proposals', proposal);
    this.store.audit(actorId, 'FOUNDER_ASSISTANT_PROPOSAL', proposal.id, 1);
    return proposal;
  }

  reviewFounderProposal(actorId: string, proposalId: string, decision: 'approved' | 'rejected'): FounderAssistantProposal {
    const proposal = this.store.get<FounderAssistantProposal>('founder_proposals', proposalId);
    if (!proposal) fail('NOT_FOUND', 404, 'Cadangan tindakan tidak ditemui.');
    if (proposal.status !== 'proposed') fail('INVALID_STATUS', 400, 'Cadangan telah diproses sebelumnya.');

    const updated: FounderAssistantProposal = {
      ...proposal,
      status: decision,
    };
    this.store.save('founder_proposals', updated);
    this.store.audit(actorId, `FOUNDER_PROPOSAL_${decision.toUpperCase()}`, proposal.id, 2);
    return updated;
  }

  executeFounderProposal(
    actorId: string,
    proposalId: string,
    executor?: FounderProposalExecutor
  ): FounderAssistantProposal {
    const proposal = this.store.get<FounderAssistantProposal>('founder_proposals', proposalId);
    if (!proposal) fail('NOT_FOUND', 404, 'Cadangan tindakan tidak ditemui.');
    if (proposal.status !== 'approved') {
      fail('PROPOSAL_NOT_APPROVED', 400, 'Hanya cadangan yang telah diluluskan pengasas boleh dilaksanakan.');
    }

    const exec = executor ?? ((p: FounderAssistantProposal) => ({
      resultRef: `EXEC-${p.id}`,
      resultKind: (p.proposedAction.command === 'review_cases' ? 'case_review' : p.proposedAction.command === 'review_stock' ? 'stock_review' : 'campaign_draft') as 'case_review' | 'stock_review' | 'campaign_draft',
    }));

    return this.store.atomic(() => {
      const result = exec(proposal);
      const updated: FounderAssistantProposal = {
        ...proposal,
        status: 'executed',
        executionResult: {
          resultRef: result.resultRef,
          resultKind: result.resultKind,
          executedAt: now(),
        },
      };
      this.store.save('founder_proposals', updated);
      this.store.audit(actorId, 'FOUNDER_PROPOSAL_EXECUTED', proposal.id, 3);
      return updated;
    });
  }
}

export type FounderProposalExecutor = (proposal: FounderAssistantProposal) => {
  resultRef: string;
  resultKind: 'case_review' | 'stock_review' | 'campaign_draft';
};
