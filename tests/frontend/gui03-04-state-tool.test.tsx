import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'bun:test';
import { ToolStatusView } from '../../src/features/copilot/tool-rendering/ToolStatusView';
import { ScopedStateView } from '../../src/features/copilot/state-rendering/ScopedStateView';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

describe('GUI-03 tool status projection', () => {
  test('renders each known execution status with stable, user-safe wording', () => {
    const cases = [
      ['queued', 'Waiting to start'],
      ['running', 'In progress'],
      ['succeeded', 'Completed'],
      ['failed', 'Could not be completed'],
      ['unknown', 'Status is unavailable'],
      ['unknown_outcome', 'Outcome could not be confirmed'],
    ] as const;

    for (const [state, message] of cases) {
      const html = render(
        <ToolStatusView
          executionId="exec-42"
          toolName="get_order_summary"
          state={state}
        />,
      );

      expect(html).toContain(message);
      expect(html).toContain('exec-42');
      expect(html).toContain('get_order_summary');
    }
  });

  test('does not label partial or failed execution as succeeded or expose raw errors', () => {
    for (const state of ['partial', 'failed', 'unknown_outcome'] as const) {
      const html = render(
        <ToolStatusView
          executionId="exec-43"
          toolName="update_order"
          state={state}
          errorMessage="secret provider response"
        />,
      );

      expect(html).not.toContain('Completed');
      expect(html).not.toContain('succeeded');
      expect(html).not.toContain('secret provider response');
    }
  });

  test('renders malformed or missing execution details as unavailable without HTML injection', () => {
    const html = render(
      <ToolStatusView
        executionId={'<img src=x onerror=alert(1)>'}
        toolName={'<script>alert(1)</script>'}
        state={'not-a-status'}
      />,
    );

    expect(html).toContain('Status is unavailable');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');

    const missing = render(<ToolStatusView />);
    expect(missing).toContain('Execution details are unavailable');
  });

  test('is a render-only status view with no action controls', () => {
    const html = render(
      <ToolStatusView
        executionId="exec-44"
        toolName="get_order_summary"
        state="running"
      />,
    );

    expect(html).not.toContain('<button');
    expect(html).not.toContain('<form');
  });
});

describe('GUI-04 scoped client-state projection', () => {
  const activeScope = {
    workspaceId: 'workspace-a',
    userId: 'user-a',
    threadId: 'thread-a',
  };

  test('projects selected order, filters, draft, and workflow progress for the matching scope', () => {
    const html = render(
      <ScopedStateView
        scope={activeScope}
        snapshot={{
          scope: activeScope,
          selectedOrderId: 'order-17',
          filters: { status: 'packing', urgent: true },
          draft: { note: 'Call before delivery', quantity: 2 },
          workflowProgress: { label: 'Order review', currentStep: 2, totalSteps: 4 },
        }}
      />,
    );

    expect(html).toContain('order-17');
    expect(html).toContain('packing');
    expect(html).toContain('urgent');
    expect(html).toContain('Call before delivery');
    expect(html).toContain('2 of 4');
  });

  test('clears previous state when workspace, user, or thread scope changes', () => {
    const oldSnapshot = {
      scope: activeScope,
      selectedOrderId: 'private-order-a',
      filters: { status: 'old-filter' },
      draft: { note: 'private draft from old thread' },
      workflowProgress: { label: 'Old workflow', currentStep: 1, totalSteps: 3 },
    };
    const switchedScopes = [
      { ...activeScope, workspaceId: 'workspace-b' },
      { ...activeScope, userId: 'user-b' },
      { ...activeScope, threadId: 'thread-b' },
    ];

    for (const scope of switchedScopes) {
      const html = render(<ScopedStateView scope={scope} snapshot={oldSnapshot} />);

      expect(html).toContain('State is unavailable for this scope');
      expect(html).not.toContain('private-order-a');
      expect(html).not.toContain('old-filter');
      expect(html).not.toContain('private draft from old thread');
      expect(html).not.toContain('Old workflow');
    }
  });

  test('omits authority fields and safely renders untrusted display text', () => {
    const html = render(
      <ScopedStateView
        scope={activeScope}
        snapshot={{
          scope: activeScope,
          selectedOrderId: '<img src=x onerror=alert(1)>',
          filters: { status: 'ready', role: 'founder', paid: true, price: 999 },
          draft: { note: '<script>alert(1)</script>', role: 'admin', paid: true, price: 1 },
          workflowProgress: { label: 'Review', currentStep: 1, totalSteps: 2 },
          role: 'founder',
          paid: true,
          price: 999,
        }}
      />,
    );

    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('founder');
    expect(html).not.toContain('admin');
    expect(html).not.toContain('999');
    expect(html).not.toContain('paid');
    expect(html).not.toContain('price');
  });

  test('does not present client snapshot permissions as trusted workspace authority', () => {
    const html = render(
      <ScopedStateView
        scope={activeScope}
        snapshot={{
          scope: activeScope,
          filters: {
            status: 'packing',
            priceRange: '100-200',
            isAdmin: true,
            isFounder: true,
            isDeveloper: true,
            isSuperUser: true,
            isAuthorized: true,
            canApproveRefund: true,
            permissions: 'refund:approve',
            accessLevel: 'founder',
            isAllowed: true,
            isPermitted: true,
            canManageOrders: true,
            refundApproved: true,
            refundApprover: 'user-a',
          },
          draft: {
            note: 'Review order',
            approvalGranted: true,
          },
        }}
      />,
    );

    expect(html).toContain('packing');
    expect(html).toContain('priceRange');
    expect(html).toContain('100-200');
    expect(html).toContain('Review order');
    expect(html).not.toContain('isAdmin');
    expect(html).not.toContain('isFounder');
    expect(html).not.toContain('isDeveloper');
    expect(html).not.toContain('isSuperUser');
    expect(html).not.toContain('isAuthorized');
    expect(html).not.toContain('canApproveRefund');
    expect(html).not.toContain('refund:approve');
    expect(html).not.toContain('accessLevel');
    expect(html).not.toContain('isAllowed');
    expect(html).not.toContain('isPermitted');
    expect(html).not.toContain('founder');
    expect(html).not.toContain('approvalGranted');
    expect(html).not.toContain('refundApproved');
    expect(html).not.toContain('refundApprover');
    expect(html).not.toContain('canManageOrders');
  });

  test('renders an explicit empty state for missing or invalid scoped data', () => {
    expect(render(<ScopedStateView scope={activeScope} />)).toContain(
      'No scoped state is available',
    );
    expect(
      render(<ScopedStateView scope={activeScope} snapshot={{ scope: activeScope }} />),
    ).toContain('No client state to display');
  });
});
