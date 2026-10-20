/**
 * CPK-09 — truthfulness guarantees that must survive the shared-identity change.
 *
 * The workspace now sends the controller's `threadId` / `runId`. Those ids are
 * CLIENT CORRELATION LABELS: the server stays the authority for the real
 * identity, and the UI must never present a label as proof. This file proves:
 *  - the identity shown in the UI is labelled as a client label, never as an
 *    authoritative or verified identity;
 *  - the runtime stays unavailable while it is not genuinely configured;
 *  - an approval without a canonical receipt is still an unknown outcome;
 *  - the A2UI fixed-schema allowlist is intact;
 *  - the renderer stays inert and never emits unsafe HTML.
 */

import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CopilotRunController } from '../../src/features/intelligence/copilotRunController';
import {
  RUN_LABEL_DISCLOSURE,
  describeRunCorrelation,
} from '../../src/features/copilot/runIdentity';
import {
  A2UI_ALLOWLISTED_COMPONENTS,
  validateA2UIComponent,
} from '../../src/features/copilot/a2ui-registry';
import { A2UIFixedRenderer } from '../../src/features/copilot/declarative/A2UIFixedRenderer';
import { ApprovalReviewCard } from '../../src/features/copilot/interactive/ApprovalReviewCard';
import CopilotWorkspace from '../../src/features/workspaces/CopilotWorkspace';

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

describe('CPK-09 — the client identity is never presented as authoritative', () => {
  test('the workspace labels the shared identity as a client correlation label', () => {
    const controller = new CopilotRunController();
    controller.beginRun({ surface: 'pet', inputTrust: 'untrusted' });

    const html = renderToStaticMarkup(<CopilotWorkspace controller={controller} />);

    expect(html).toContain('Client correlation labels');
    expect(html).toContain(RUN_LABEL_DISCLOSURE);
    expect(html).toContain('bukan bukti identiti');
  });

  test('the workspace never claims the client label is a verified or authoritative identity', () => {
    const controller = new CopilotRunController();
    controller.beginRun({ surface: 'copilot' });

    const html = renderToStaticMarkup(<CopilotWorkspace controller={controller} />);

    for (const forbidden of [
      'verified identity',
      'authoritative run',
      'authoritative thread',
      'identity confirmed',
      'identity verified',
      'trusted thread',
    ]) {
      expect(html.toLowerCase()).not.toContain(forbidden);
    }
    // The server stays the stated authority for the real identity.
    expect(html).toContain('pelayan');
  });

  test('the correlation descriptor reports the client authority marker', () => {
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

describe('CPK-09 — the runtime stays unwired until it is genuinely configured', () => {
  test('an unconfigured runtime is reported as unavailable and chat stays disabled', () => {
    const html = renderToStaticMarkup(<CopilotWorkspace />);

    expect(html).toContain('CopilotKit /v2 runtime belum tersedia');
    expect(html).toContain('CopilotKit /v2 runtime is not available');
    expect(html).toContain('disabled=""');
    expect(html).toContain('No prompt has been sent');
  });

  test('no provider is presented as connected while the runtime is unverified', () => {
    const html = renderToStaticMarkup(<CopilotWorkspace />);

    expect(html).not.toContain('Sifar Kos Protocol');
    expect(html).not.toContain('NVIDIA NIM');
    expect(html).not.toContain('Gemini Flash');
    expect(html).not.toContain('gemini_free');
  });
});

describe('CPK-09 — approval is still never presented as a completed execution', () => {
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
    expect(html).not.toContain('PELAKSANAAN DISAHKAN');
    expect(html).toContain('Kelulusan bukan pelaksanaan');
  });
});

describe('CPK-09 — the fixed A2UI schema and the inert renderer are intact', () => {
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
    expect(validateA2UIComponent('RawHtml')).toBe(false);
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
