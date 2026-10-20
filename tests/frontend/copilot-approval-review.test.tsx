import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ApprovalReviewCard,
  parseApprovalProposal,
} from '../../src/features/copilot/interactive/MarginSimulatorForm';

const hitlAction = {
  id: 'hitl-1',
  actionType: 'refund',
  entity: { type: 'order', id: 'ord-2026-1019-01' },
  amountSen: 2500,
  revision: 1,
  reason: 'Aduan kualiti tutup botol bocor',
  expiry: '2026-10-21T00:00:00.000Z',
  status: 'pending_approval',
  description: 'Permintaan tuntutan ganti rugi',
  payload: { message: 'Aduan pelanggan' },
  createdAt: '2026-10-20T00:00:00.000Z',
};

test('the real HITL action shape is accepted as an approval proposal', () => {
  const parsed = parseApprovalProposal(hitlAction);
  expect(parsed).toMatchObject({
    ok: true,
    value: {
      proposalId: 'hitl-1',
      status: 'pending_approval',
      entity: { type: 'order', id: 'ord-2026-1019-01' },
      amountSen: 2500,
      expiresAt: '2026-10-21T00:00:00.000Z',
    },
  });
});

test('a pending HITL action is shown as awaiting a decision, never as executed', () => {
  const html = renderToStaticMarkup(
    React.createElement(ApprovalReviewCard, { proposal: hitlAction }),
  );

  expect(html).toContain('MENUNGGU PENGESAHAN');
  expect(html).toContain('hitl-1');
  expect(html).toContain('RM 25.00');
  expect(html).not.toContain('Selesai');
  expect(html).not.toContain('PELAKSANAAN DISAHKAN');
});

test('an approved action without a receipt stays waiting for the execution receipt', () => {
  const approved = {
    ...hitlAction,
    status: 'approved',
    reviewedBy: 'founder-1',
    reviewedAt: '2026-10-20T01:00:00.000Z',
    executionReceipt: undefined,
    executionBlockedReason: 'EXECUTOR_UNAVAILABLE',
  };

  const html = renderToStaticMarkup(
    React.createElement(ApprovalReviewCard, { proposal: approved }),
  );

  expect(html).toContain('DILULUSKAN — menunggu resit pelaksanaan');
  expect(html).not.toContain('PELAKSANAAN DISAHKAN');
  expect(html).not.toContain('Selesai');
});

test('a succeeded action is only confirmed when a canonical receipt exists', () => {
  const succeeded = {
    ...hitlAction,
    status: 'succeeded',
    executionReceipt: {
      receiptId: 'rcpt-1',
      actionId: 'hitl-1',
      executedBy: 'founder-1',
      executedAt: '2026-10-20T02:00:00.000Z',
      targetEntity: { type: 'order', id: 'ord-2026-1019-01' },
      preRevision: 1,
      postRevision: 2,
      status: 'succeeded',
      auditLogId: 'audit-1',
    },
  };

  expect(parseApprovalProposal(succeeded)).toMatchObject({
    ok: true,
    value: { status: 'succeeded', receipt: { receiptId: 'rcpt-1' } },
  });

  const html = renderToStaticMarkup(
    React.createElement(ApprovalReviewCard, { proposal: succeeded }),
  );
  expect(html).toContain('PELAKSANAAN DISAHKAN — resit kanonikal diterima');
  expect(html).toContain('rcpt-1');
});

test('a succeeded action without a receipt is an unknown outcome, not a success', () => {
  const succeededWithoutReceipt = { ...hitlAction, status: 'succeeded' };

  expect(parseApprovalProposal(succeededWithoutReceipt)).toEqual({ ok: false });

  const html = renderToStaticMarkup(
    React.createElement(ApprovalReviewCard, { proposal: succeededWithoutReceipt }),
  );
  expect(html).toContain('OUTCOME TIDAK DIKETAHUI — resit belum diterima');
  expect(html).not.toContain('PELAKSANAAN DISAHKAN');
});

test('malformed approval payloads are rejected and rendered as unknown', () => {
  expect(parseApprovalProposal({
    ...hitlAction,
    entity: { type: 'superuser', id: 'ord-1' },
  })).toEqual({ ok: false });

  expect(parseApprovalProposal({
    ...hitlAction,
    payload: 'not-an-object',
  })).toEqual({ ok: false });

  expect(parseApprovalProposal(null)).toEqual({ ok: false });

  const html = renderToStaticMarkup(
    React.createElement(ApprovalReviewCard, { proposal: { status: 'complete' } }),
  );
  expect(html).toContain('OUTCOME TIDAK DIKETAHUI — resit belum diterima');
  expect(html).not.toContain('DILULUSKAN');
});
