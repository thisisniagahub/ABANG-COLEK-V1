import { describe, it, expect, beforeEach } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { LegacyPilotsService, VERIFIED_BUS_ROUTES } from '../../server/platform/legacyPilots';

describe('D05: Legacy Pilots Service (Google Workspace, Bus Freight, Founder Assistant)', () => {
  let store: PlatformStore;
  let pilots: LegacyPilotsService;
  const actorId = 'founder-user-1';

  beforeEach(() => {
    store = new PlatformStore(':memory:');
    pilots = new LegacyPilotsService(store);
  });

  describe('Google Workspace Consent & Actions', () => {
    it('requires active consent before executing operations', () => {
      expect(() => {
        pilots.executeWorkspaceOperation(actorId, 'draft_doc', 'doc-101');
      }).toThrow();
    });

    it('records consent but refuses completion without a real provider', () => {
      const grant = pilots.grantWorkspaceConsent(actorId, ['docs.draft', 'calendar.sync']);
      expect(grant.status).toBe('active');
      expect(grant.scopes).toContain('docs.draft');

      expect(() => pilots.executeWorkspaceOperation(actorId, 'draft_doc', 'doc-101')).toThrow('Integrasi Google Workspace belum tersedia.');
      expect(store.all('workspace_receipts')).toEqual([]);

      // Attempting an unscoped operation throws CONSENT_REQUIRED
      expect(() => {
        pilots.executeWorkspaceOperation(actorId, 'export_sheet', 'sheet-101');
      }).toThrow();
    });

    it('revokes consent and blocks further operations', () => {
      const grant = pilots.grantWorkspaceConsent(actorId, ['docs.draft']);
      const revoked = pilots.revokeWorkspaceConsent(actorId, grant.id);
      expect(revoked.status).toBe('revoked');

      expect(() => {
        pilots.executeWorkspaceOperation(actorId, 'draft_doc', 'doc-102');
      }).toThrow();
    });
  });

  describe('Bus Freight Logistics Pilot', () => {
    it('provides verified routes across East Coast and Southern hubs', () => {
      expect(VERIFIED_BUS_ROUTES.length).toBeGreaterThanOrEqual(3);
      const routeIds = VERIFIED_BUS_ROUTES.map(r => r.routeId);
      expect(routeIds).toContain('LARKIN-MBKT');
      expect(routeIds).toContain('SHAHALAM-MBKT');
    });

    it('rejects unverified routes and constraint violations', () => {
      expect(() => {
        pilots.createBusFreightShipment(actorId, {
          routeId: 'KL-PENANG-INVALID',
          packageDescription: 'Sambal balang',
          cartonCount: 5,
          totalWeightKg: 20,
        });
      }).toThrow();

      // Overweight (> 250 kg)
      expect(() => {
        pilots.createBusFreightShipment(actorId, {
          routeId: 'LARKIN-MBKT',
          packageDescription: 'Banyak balang',
          cartonCount: 10,
          totalWeightKg: 300,
        });
      }).toThrow();
    });

    it('books shipment with consignment number and transitions delivery status', () => {
      const shipment = pilots.createBusFreightShipment(actorId, {
        routeId: 'LARKIN-MBKT',
        packageDescription: '15 karton Sambal Colek Padu',
        cartonCount: 15,
        totalWeightKg: 75,
      });

      expect(shipment.status).toBe('booked');
      expect(shipment.consignmentNo).toMatch(/^AC-BUS-\d{8}-[A-Z0-9]{4}$/);
      expect(shipment.originHub).toContain('Larkin');
      expect(shipment.destinationHub).toContain('MBKT');

      const departed = pilots.updateBusFreightStatus(actorId, shipment.id, 'departed');
      expect(departed.status).toBe('departed');

      const received = pilots.updateBusFreightStatus(actorId, shipment.id, 'received');
      expect(received.status).toBe('received');
    });
  });

  describe('Founder Assistant Pilot', () => {
    it('refuses direct financial escalation queries', () => {
      expect(() => {
        pilots.proposeFounderAction(actorId, 'Tolong buat payout RM5000 ke akaun supplier');
      }).toThrow();

      expect(() => {
        pilots.proposeFounderAction(actorId, 'Transfer refund balik duit pelanggan');
      }).toThrow();
    });

    it('generates grounded action proposals with platform context', () => {
      const proposal = pilots.proposeFounderAction(actorId, 'Semak paras stok sambal sekarang');
      expect(proposal.status).toBe('proposed');
      expect(proposal.proposedAction.command).toBe('review_stock');
      expect(proposal.policyChecks.noFinancialEscalation).toBe(true);
      expect(proposal.policyChecks.founderApprovalRequired).toBe(true);
      expect(proposal.contextSummary).toContain('Konteks platform:');
    });

    it('enforces founder approval before execution', () => {
      const proposal = pilots.proposeFounderAction(actorId, 'Semak kes aduan pelanggan terbaru');

      // Cannot execute unapproved proposal
      expect(() => {
        pilots.executeFounderProposal(actorId, proposal.id);
      }).toThrow();

      // Founder approves
      const approved = pilots.reviewFounderProposal(actorId, proposal.id, 'approved');
      expect(approved.status).toBe('approved');

      // Now execution succeeds
      const executed = pilots.executeFounderProposal(actorId, proposal.id);
      expect(executed.status).toBe('executed');
    });
  });
});
