import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { LegacyPilotsService, type FounderProposalExecutor } from '../../server/platform/legacyPilots';
import { createPlatformApp } from '../../server/platform/app';
import { unlinkSync } from 'node:fs';

function cleanup(path: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    try { unlinkSync(path + suffix); } catch {}
  }
}

describe('Founder Assistant Proposals & Canonical Execution', () => {
  test('proposes grounded actions, blocks financial escalation, and requires executor for atomic completion', () => {
    const store = new PlatformStore(':memory:');
    const service = new LegacyPilotsService(store);

    // 1. Refusal check for financial operations
    for (const term of ['nak refund duit', 'tolong buat payout', 'buat transfer sekarang']) {
      expect(() => service.proposeFounderAction('founder-1', term)).toThrow();
    }

    // 2. Propose stock review (grounded in 'lots')
    store.save('lots', { id: 'lot-1', productId: 'p1', quantity: 50, status: 'available', locationId: 'hq', ownerId: 'business', revision: 1 });
    const stockProposal = service.proposeFounderAction('founder-1', 'Boleh tolong semak baki stok semasa?');
    expect(stockProposal.proposedAction.command).toBe('review_stock');
    expect(stockProposal.contextSummary).toContain('1 rekod lot inventori');
    expect(stockProposal.status).toBe('proposed');

    // 3. Propose campaign draft
    const campaignProposal = service.proposeFounderAction('founder-1', 'Cadangkan draf kempen promosi sambal colek');
    expect(campaignProposal.proposedAction.command).toBe('draft_campaign');

    // 4. Cannot execute without founder approval
    expect(() => service.executeFounderProposal('founder-1', stockProposal.id)).toThrow();

    // 5. Review & Approve
    const approved = service.reviewFounderProposal('founder-1', stockProposal.id, 'approved');
    expect(approved.status).toBe('approved');

    // 6. Atomic execution with executor
    const executor: FounderProposalExecutor = (p) => {
      expect(p.id).toBe(stockProposal.id);
      return { resultRef: 'lots:tracked:1', resultKind: 'stock_review' };
    };

    const executed = service.executeFounderProposal('founder-1', stockProposal.id, executor);
    expect(executed.status).toBe('executed');
    expect(executed.executionResult).toBeDefined();
    expect(executed.executionResult?.resultRef).toBe('lots:tracked:1');
    expect(executed.executionResult?.resultKind).toBe('stock_review');
    expect(executed.executionResult?.executedAt).toBeDefined();

    // Check audit
    const audits = store.db.query<{ operation: string; entity_id: string }, []>('SELECT operation, entity_id FROM audit').all();
    expect(audits.some(a => a.operation === 'FOUNDER_PROPOSAL_EXECUTED' && a.entity_id === stockProposal.id)).toBe(true);

    store.close();
  });

  test('executes founder proposal through HTTP platform API route with canonical executor', async () => {
    const db = `var/lib/qa/founder-proposal-${Date.now()}.sqlite`;
    cleanup(db);
    const app = createPlatformApp({ databasePath: db, bootstrapToken: 'fp-token', origin: 'http://localhost:3000' });

    // Bootstrap founder
    const boot = await app.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({ email: 'fp-founder@test.local', password: 'password123456', name: 'Founder FP', token: 'fp-token' }),
    }));
    expect(boot.status).toBe(200);
    const cookie = boot.headers.get('set-cookie')!;
    const csrf = (await boot.clone().json() as any).data.csrfToken;

    const post = (path: string, body: unknown) =>
      app.fetch(new Request(`http://localhost:3000/api/platform${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', Cookie: cookie, 'x-csrf-token': csrf },
        body: JSON.stringify(body),
      }));

    // Propose
    const propRes = await post('/pilots/founder-assistant/propose', { query: 'Tolong buat draf kempen untuk sambal colek' });
    expect(propRes.status).toBe(200);
    const propData = (await propRes.json() as any).data;
    expect(propData.proposedAction.command).toBe('draft_campaign');

    // Approve
    const reviewRes = await post('/pilots/founder-assistant/review', { proposalId: propData.id, decision: 'approved' });
    expect(reviewRes.status).toBe(200);

    // Execute via HTTP route
    const execRes = await post('/pilots/founder-assistant/execute', { proposalId: propData.id });
    expect(execRes.status).toBe(200);
    const execData = (await execRes.json() as any).data;
    expect(execData.status).toBe('executed');
    expect(execData.executionResult?.resultKind).toBe('campaign_draft');
    expect(execData.executionResult?.resultRef).toBeDefined();

    app.close();
    cleanup(db);
  });
});

