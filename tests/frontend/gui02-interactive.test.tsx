import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CopilotWorkspaceView } from '../../src/features/workspaces/CopilotWorkspace';
import { initialAguiRunState } from '../../src/features/copilot/agui/aguiRunState';

const interactiveUi = await import(
  '../../src/features/copilot/interactive/MarginSimulatorForm'
).catch(() => null);

test('simulation input rejects negative, fractional cents and invalid discounts', () => {
  expect(typeof interactiveUi?.validateSimulationInput).toBe('function');
  if (!interactiveUi) return;

  expect(
    interactiveUi.validateSimulationInput({
      inputSen: '125.5',
      discountPct: '10',
    }),
  ).toEqual({ ok: false, field: 'inputSen' });
  expect(
    interactiveUi.validateSimulationInput({
      inputSen: '-1',
      discountPct: '10',
    }),
  ).toEqual({ ok: false, field: 'inputSen' });
  expect(
    interactiveUi.validateSimulationInput({
      inputSen: '1250',
      discountPct: '101',
    }),
  ).toEqual({ ok: false, field: 'discountPct' });
});

test('simulation input returns validated integer sen and bounded percentage', () => {
  expect(typeof interactiveUi?.validateSimulationInput).toBe('function');
  if (!interactiveUi) return;

  expect(
    interactiveUi.validateSimulationInput({
      inputSen: '1250',
      discountPct: '10.5',
    }),
  ).toEqual({ ok: true, inputSen: 1250, discountPct: 10.5 });
});

test('duplicate submits share one in-flight callback and allow a later retry', async () => {
  expect(typeof interactiveUi?.createDuplicateClickGuard).toBe('function');
  if (!interactiveUi) return;

  let calls = 0;
  let finish!: () => void;
  const guarded = interactiveUi.createDuplicateClickGuard(async () => {
    calls += 1;
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
  });

  const first = guarded();
  const duplicate = guarded();
  expect(calls).toBe(0);
  await Promise.resolve();
  expect(calls).toBe(1);
  finish();
  await Promise.all([first, duplicate]);

  const retry = guarded();
  await Promise.resolve();
  expect(calls).toBe(2);
  finish();
  await retry;
});

test('approval view shows server status and never treats approval as completion', () => {
  expect(typeof interactiveUi?.ApprovalReviewCard).toBe('function');
  if (!interactiveUi) return;

  const html = renderToStaticMarkup(
    React.createElement(interactiveUi.ApprovalReviewCard, {
      proposal: {
        proposalId: 'proposal-7',
        entity: { type: 'order', id: 'order-4' },
        amountSen: 1250,
        revision: 'rev-8',
        reason: 'Semakan pengguna',
        expiresAt: '2026-10-20T00:00:00Z',
        status: 'approved',
        payload: { note: '<img src=x onerror=alert(1)>' },
      },
    }),
  );

  expect(html).toContain('DILULUSKAN — menunggu resit pelaksanaan');
  expect(html).toContain('proposal-7');
  expect(html).toContain('order-4');
  expect(html).toContain('RM 12.50');
  expect(html).toContain('rev-8');
  expect(html).toContain('2026-10-20T00:00:00Z');
  expect(html).toContain('&lt;img');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('Tindakan berjaya');
});

test('succeeded approval without canonical receipt remains unknown', () => {
  expect(typeof interactiveUi?.ApprovalReviewCard).toBe('function');
  if (!interactiveUi) return;

  const html = renderToStaticMarkup(
    React.createElement(interactiveUi.ApprovalReviewCard, {
      proposal: {
        proposalId: 'proposal-8',
        entity: { type: 'refund', id: 'refund-5' },
        amountSen: 500,
        revision: 'rev-9',
        reason: 'Semakan',
        expiresAt: '2026-10-20T00:00:00Z',
        status: 'succeeded',
        payload: {},
      },
    }),
  );

  expect(html).toContain('OUTCOME TIDAK DIKETAHUI — resit belum diterima');
  expect(html).not.toContain('Selesai');
});

test('approval contract rejects unrecognized statuses and malformed payloads', () => {
  expect(typeof interactiveUi?.parseApprovalProposal).toBe('function');
  if (!interactiveUi) return;

  const validProposal = {
    proposalId: 'proposal-9',
    entity: { type: 'refund', id: 'refund-5' },
    revision: 'rev-9',
    reason: 'Semakan',
    expiresAt: '2026-10-20T00:00:00Z',
    status: 'proposed',
    payload: { amountSen: 500 },
  };

  expect(
    interactiveUi.parseApprovalProposal({
      ...validProposal,
      status: 'complete',
    }),
  ).toEqual({ ok: false });
  expect(
    interactiveUi.parseApprovalProposal({
      ...validProposal,
      payload: '<script>alert(1)</script>',
    }),
  ).toEqual({ ok: false });
  expect(interactiveUi.parseApprovalProposal(validProposal)).toMatchObject({
    ok: true,
    value: { proposalId: 'proposal-9', status: 'proposed' },
  });
});

test('a succeeded approval requires a non-empty canonical receipt', () => {
  expect(typeof interactiveUi?.parseApprovalProposal).toBe('function');
  if (!interactiveUi) return;

  const proposal = {
    proposalId: 'proposal-10',
    entity: { type: 'refund', id: 'refund-6' },
    revision: 'rev-10',
    reason: 'Semakan',
    expiresAt: '2026-10-20T00:00:00Z',
    status: 'succeeded',
    payload: {},
  };

  expect(interactiveUi.parseApprovalProposal(proposal)).toEqual({ ok: false });
  expect(
    interactiveUi.parseApprovalProposal({
      ...proposal,
      receipt: { receiptId: 'receipt-10', status: 'succeeded' },
    }),
  ).toMatchObject({
    ok: true,
    value: { status: 'succeeded', receipt: { receiptId: 'receipt-10' } },
  });
});

test('GUI-02: mounts MarginSimulatorForm in CopilotWorkspaceView and exercises decision -> server revalidation -> canonical receipt flow', async () => {
  expect(typeof interactiveUi?.executeDecisionRevalidationLoop).toBe('function');
  if (!interactiveUi) return;

  const loopResult = await interactiveUi.executeDecisionRevalidationLoop({
    draft: { inputSen: '10000', discountPct: '10' },
    revalidateMargin: async (draft) => ({
      receiptId: 'rcpt-margin-77',
      status: 'PASSED',
      contributionSen: draft.inputSen - Math.round((draft.inputSen * draft.discountPct) / 100) - 6000,
      contributionMarginPct: 30,
      requiredContributionSen: 2000,
      requiredMarginPct: 20,
      evaluatedAt: '2026-10-24T12:00:00.000Z',
      revision: 14,
    }),
    submitApprovalDecision: async (receipt) => ({
      proposalId: 'prop-margin-77',
      entity: { type: 'order', id: 'ORD-77' },
      amountSen: receipt.contributionSen,
      revision: String(receipt.revision),
      reason: 'Simulasi margin disahkan pelayan',
      expiresAt: '2026-10-25T12:00:00.000Z',
      status: 'succeeded',
      payload: { receiptId: receipt.receiptId },
      receipt: {
        receiptId: receipt.receiptId,
        status: 'succeeded',
        executedAt: receipt.evaluatedAt,
      },
    }),
  });

  expect(loopResult.ok).toBe(true);
  if (!loopResult.ok) return;

  const workspaceHtml = renderToStaticMarkup(
    <CopilotWorkspaceView
      runtime={{
        kind: 'descriptor',
        value: {
          version: '2.0.0',
          runtime: 'copilotkit-v2-agui',
          schema: 'a2ui.v1',
          activeProvider: 'gemini_free',
          candidateModels: [],
          allowlistedComponents: ['MarginSimulator'],
          paidFallbackAllowed: false,
          aguiProtocolImplemented: true,
          copilotkitRuntimeImplemented: true,
          copilotkitRuntimeVersion: '1.79.1',
          aguiRunRoute: '/api/copilotkit',
          platformRunRoute: '/api/platform/copilot/chat',
          providerReachability: 'verified_on_run',
        },
      }}
      session={null}
      threadId="thr_gui02"
      messages={[]}
      inputMessage=""
      isSending={false}
      chatError={null}
      run={{ ...initialAguiRunState, hitl: loopResult.approvalProposal }}
      activeIdentity={null}
      onInputChange={() => {}}
      onSubmit={() => {}}
      onRetryRuntime={() => {}}
      showMarginSimulator={true}
      marginReceipt={loopResult.simulationReceipt}
    />,
  );

  expect(workspaceHtml).toContain('Draf simulasi margin');
  expect(workspaceHtml).toContain('rcpt-margin-77');
  expect(workspaceHtml).toContain('prop-margin-77');
  expect(workspaceHtml).toContain('PELAKSANAAN DISAHKAN — resit kanonikal diterima');
});
