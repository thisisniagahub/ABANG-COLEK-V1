/**
 * The truthfulness guarantees of the Copilot workspace must survive the
 * descriptor change.
 *
 * Changing WHICH descriptor the workspace reads must not change HOW strict it
 * is. This file re-proves each guarantee:
 *  - no provider is presented as connected unless the descriptor says so, and
 *    the descriptor itself only reports a provider as CONFIGURED;
 *  - an approval without a canonical receipt stays an unknown outcome;
 *  - the A2UI fixed-schema allowlist is intact;
 *  - the renderer stays inert and never emits unsafe HTML;
 *  - the shared run identity still flows as client correlation labels.
 */

import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  A2UI_ALLOWLISTED_COMPONENTS,
  validateA2UIComponent,
} from '../../shared/copilot-contracts';
import { A2UIFixedRenderer } from '../../src/features/copilot/declarative/A2UIFixedRenderer';
import { ApprovalReviewCard } from '../../src/features/copilot/interactive/ApprovalReviewCard';
import { initialAguiRunState } from '../../src/features/copilot/agui/aguiRunState';
import {
  RUN_LABEL_DISCLOSURE,
  describeRunCorrelation,
} from '../../src/features/copilot/runIdentity';
import { CopilotRunController } from '../../src/features/intelligence/copilotRunController';
import {
  CopilotWorkspaceView,
  resolveRuntimeDescriptor,
  type RuntimeCheckState,
} from '../../src/features/workspaces/CopilotWorkspace';
import { OFFICIAL_RUNTIME_DESCRIPTOR } from './copilot-runtime-descriptor-fixtures';

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

function renderWorkspace(runtime: RuntimeCheckState, activeIdentity = null): string {
  return renderToStaticMarkup(
    <CopilotWorkspaceView
      runtime={runtime}
      session={null}
      threadId="thread-1"
      messages={[]}
      inputMessage="Semak stok ORD-001"
      isSending={false}
      chatError={null}
      run={initialAguiRunState}
      activeIdentity={activeIdentity}
      onInputChange={() => undefined}
      onSubmit={() => undefined}
      onRetryRuntime={() => undefined}
    />,
  );
}

describe('the provider is never presented as connected', () => {
  test('the confirmed runtime states the reachability caveat the server declared', () => {
    const html = renderWorkspace(resolveRuntimeDescriptor(OFFICIAL_RUNTIME_DESCRIPTOR));

    expect(html).toContain('Provider yang dikonfigurasi oleh pelayan: gemini_free');
    expect(html).toContain(
      'Status sebenar provider hanya disahkan selepas satu run (verified-per-run-only)',
    );
    expect(html).not.toContain('Penyedia model aktif');
    expect(html).not.toContain('provider connected');
    expect(html).not.toContain('provider is connected');
  });

  test('an unconfirmed runtime shows no provider at all', () => {
    const html = renderWorkspace({ kind: 'checking' });

    expect(html).not.toContain('gemini_free');
    expect(html).not.toContain('NVIDIA');
    expect(html).not.toContain('Sifar Kos Protocol');
  });
});

describe('an approval is never presented as a completed execution', () => {
  test('a succeeded approval without a canonical receipt stays an unknown outcome', () => {
    const html = renderToStaticMarkup(
      React.createElement(ApprovalReviewCard, {
        proposal: { ...hitlAction, status: 'succeeded' },
      }),
    );

    expect(html).toContain('OUTCOME TIDAK DIKETAHUI — resit belum diterima');
    expect(html).not.toContain('PELAKSANAAN DISAHKAN');
    expect(html).not.toContain('Selesai');
  });

  test('a pending approval is still awaiting a decision', () => {
    const html = renderToStaticMarkup(
      React.createElement(ApprovalReviewCard, { proposal: hitlAction }),
    );

    expect(html).toContain('MENUNGGU PENGESAHAN');
    expect(html).toContain('Kelulusan bukan pelaksanaan');
    expect(html).not.toContain('PELAKSANAAN DISAHKAN');
  });
});

describe('the A2UI fixed-schema allowlist and the inert renderer are intact', () => {
  test('the allowlist still holds exactly the approved components', () => {
    expect([...A2UI_ALLOWLISTED_COMPONENTS]).toEqual([
      'OperationsBriefCard',
      'RefundImpactPanel',
      'JevAssessmentCard',
      'MarginSimulator',
      'MarginSummaryCard',
      'OrderTrackingBadge',
      'OrderTrackingCard',
      'CommissionCard',
    ]);
    expect(validateA2UIComponent('OperationsBriefCard')).toBe(true);
    expect(validateA2UIComponent('script')).toBe(false);
  });

  test('the official descriptor may only list allowlisted components', () => {
    expect(OFFICIAL_RUNTIME_DESCRIPTOR.allowlistedComponents)
      .toEqual([...A2UI_ALLOWLISTED_COMPONENTS]);
  });

  test('a component outside the allowlist is refused by the renderer', () => {
    const html = renderToStaticMarkup(
      React.createElement(A2UIFixedRenderer, {
        payload: {
          schemaVersion: 'a2ui.v1',
          component: 'RawHtml',
          props: { html: '<script>alert(1)</script>' },
          provenance: {
            source: 'local_authoritative',
            timestamp: '2026-10-20T00:00:00.000Z',
          },
        },
      }),
    );

    expect(html).toContain('This A2UI component is not allowlisted.');
    expect(html).not.toContain('<script>');
  });

  test('the renderer never emits unsafe HTML from a payload prop', () => {
    const html = renderToStaticMarkup(
      React.createElement(A2UIFixedRenderer, {
        payload: {
          schemaVersion: 'a2ui.v1',
          component: 'OrderTrackingBadge',
          props: {
            orderId: '<script>alert("x")</script>',
            stage: 'packing',
            trackingTokenRedactedHash: 'redacted-hash',
            expiryDaysRemaining: 3,
          },
          provenance: {
            source: 'local_authoritative',
            timestamp: '2026-10-20T00:00:00.000Z',
            revision: 1,
          },
        },
      }),
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('the shared run identity still flows as client correlation labels', () => {
  test('the workspace labels the shared identity as a client correlation label', () => {
    const controller = new CopilotRunController();
    const identity = controller.beginRun({ surface: 'pet', inputTrust: 'untrusted' });

    const html = renderWorkspace(
      resolveRuntimeDescriptor(OFFICIAL_RUNTIME_DESCRIPTOR),
      identity,
    );

    expect(html).toContain('Client correlation labels');
    expect(html).toContain(RUN_LABEL_DISCLOSURE);
    expect(html).toContain('bukan bukti identiti');
  });

  test('the correlation descriptor still reports the client authority marker', () => {
    const controller = new CopilotRunController();
    const identity = controller.beginRun({ surface: 'copilot' });

    const label = describeRunCorrelation(identity);

    expect(label?.authority).toBe('client_correlation_label');
    expect(label?.threadId).toBe(identity.threadId);
    expect(label?.runId).toBe(identity.runId);
    expect(label?.disclosure).toBe(RUN_LABEL_DISCLOSURE);
    expect(describeRunCorrelation(null)).toBeNull();
  });
});
