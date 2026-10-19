export interface WorkspaceConsentGrant {
  id: string;
  userId: string;
  scopes: ('docs.draft' | 'calendar.sync' | 'sheets.export')[];
  status: 'active' | 'revoked';
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceActionReceipt {
  id: string;
  grantId: string;
  service: 'google_workspace';
  operation: 'draft_doc' | 'sync_calendar' | 'export_sheet';
  entityId: string;
  externalRef: string;
  actionUrl: string;
  status: 'completed' | 'failed' | 'revoked';
  executedAt: string;
}

export interface BusFreightShipment {
  id: string;
  carrier: string;
  routeId: string;
  originHub: string;
  destinationHub: string;
  scheduledDeparture: string;
  packageDescription: string;
  cartonCount: number;
  totalWeightKg: number;
  consignmentNo: string;
  status: 'booked' | 'departed' | 'received';
  createdAt: string;
}

export interface FounderAssistantProposal {
  id: string;
  query: string;
  contextSummary: string;
  proposedAction: {
    command: 'review_cases' | 'review_stock' | 'draft_campaign';
    parameters: Record<string, unknown>;
  };
  policyChecks: {
    noFinancialEscalation: boolean;
    founderApprovalRequired: boolean;
  };
  status: 'proposed' | 'approved' | 'rejected' | 'executed';
  executionResult?: {
    resultRef: string;
    resultKind: 'case_review' | 'stock_review' | 'campaign_draft';
    executedAt: string;
  };
  createdAt: string;
}
