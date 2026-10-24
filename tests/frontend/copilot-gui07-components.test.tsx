import React from 'react';
import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CopilotWorkspaceView,
  loadWorkspaceLiveDataCards,
} from '../../src/features/workspaces/CopilotWorkspace';
import { initialAguiRunState } from '../../src/features/copilot/agui/aguiRunState';

const modulePath = '../../src/features/copilot/components/CopilotSurfaceCard';

describe('GUI-07 ABANGCOLEK component adapter', () => {
  test('reuses the shared surface tokens, exposes an accessible content region, and enforces theme and reduced-motion tokens', async () => {
    const implementation = await import(modulePath).catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const markup = renderToStaticMarkup(
      React.createElement(implementation.CopilotSurfaceCard, {
        id: 'copilot-runtime',
        title: 'Chat',
        description: 'Test-only surface',
        theme: 'dark',
        reducedMotion: true,
        children: <p>Scoped content</p>,
      }),
    );
    expect(markup).toContain('aria-labelledby="copilot-runtime-heading"');
    expect(markup).toContain('id="copilot-runtime-heading"');
    expect(markup).toContain('bg-[var(--ui-surface)]');
    expect(markup).toContain('data-theme="dark"');
    expect(markup).toContain('data-reduced-motion="reduce"');
    expect(markup).toContain('motion-reduce:transition-none');
    expect(markup).toContain('transition-none');
    expect(markup).toContain('Scoped content');
  });

  test('GUI-07: mounts copilot components on the same workspace API data path (/orders, /dealer/commissions) with theme & reduced-motion support', async () => {
    const requestedPaths: string[] = [];
    const liveCards = await loadWorkspaceLiveDataCards((async (path: string) => {
      requestedPaths.push(path);
      if (path === '/orders') {
        return [
          {
            id: 'ORD-SHARED-1',
            customerId: 'cust-1',
            lines: [],
            amountSen: 6400,
            fulfilment: 'delivery',
            contactRef: '0123456789',
            outletId: 'hq',
            fulfilmentStatus: 'dispatched',
            trackingTokenExpiresAt: '2026-11-01T00:00:00.000Z',
            revision: 5,
            paymentState: 'verified',
            paidAmountSen: 6400,
            refundAmountSen: 0,
            createdAt: '2026-10-24T10:00:00.000Z',
            updatedAt: '2026-10-24T10:00:00.000Z',
          },
        ];
      }
      if (path === '/dealer/commissions') {
        return {
          dealerOrgId: 'dlr-shared-1',
          totalEarnedSen: 9000,
          pendingSen: 1000,
          eligibleSen: 2000,
          approvedSen: 3000,
          paidSen: 3000,
          reversedContraSen: 0,
          netPayableSen: 6000,
          unsettledDeficitSen: 0,
        };
      }
      return null;
    }) as <T>(path: string) => Promise<T>);

    expect(requestedPaths).toEqual(['/orders', '/dealer/commissions']);

    const html = renderToStaticMarkup(
      <CopilotWorkspaceView
        runtime={{ kind: 'checking' }}
        session={null}
        threadId="thr_gui07"
        messages={[]}
        inputMessage=""
        isSending={false}
        chatError={null}
        run={initialAguiRunState}
        activeIdentity={null}
        onInputChange={() => {}}
        onSubmit={() => {}}
        onRetryRuntime={() => {}}
        liveCards={liveCards}
        theme="dark"
        reducedMotion={true}
      />,
    );

    expect(html).toContain('ORD-SHARED-1');
    expect(html).toContain('RM 64.00');
    expect(html).toContain('dlr-shared-1');
    expect(html).toContain('RM 90.00');
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('data-reduced-motion="reduce"');
  });
});
