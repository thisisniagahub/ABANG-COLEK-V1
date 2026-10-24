import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JevAssessmentCard } from '../../src/features/copilot/cards/JevAssessmentCard';
import { OrderSummaryCard } from '../../src/features/copilot/cards/OrderSummaryCard';
import { MarginSummaryCard } from '../../src/features/copilot/cards/MarginSummaryCard';
import { CommissionSummaryCard } from '../../src/features/copilot/cards/CommissionSummaryCard';
import { CopilotWorkspaceView } from '../../src/features/workspaces/CopilotWorkspace';
import { initialAguiRunState } from '../../src/features/copilot/agui/aguiRunState';

describe('GUI-01 display-only cards', () => {
  test('renders the handoff JEV assessment as safe, read-only text', () => {
    const markup = renderToStaticMarkup(
      createElement(JevAssessmentCard, {
        issueClass: 'LEAKAGE',
        rootCause: 'UNDETERMINED',
        sopAction: '<img src=x onerror="alert(1)">',
        evaluationState: 'reviewed',
        evidencePhotoRequired: true,
        source: 'jev.local_rules',
        revision: 3,
      }),
    );

    expect(markup).toContain('Kebocoran');
    expect(markup).toContain('Belum disahkan');
    expect(markup).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(markup).toContain('jev.local_rules');
    expect(markup).toContain('Revisi: </dt><dd class="inline">3</dd>');
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('confidence');
    expect(markup).not.toContain('<button');
  });

  test('shows every canonical margin threshold without deriving or inventing values', () => {
    const markup = renderToStaticMarkup(
      createElement(MarginSummaryCard, {
        contributionSen: 2800,
        contributionMarginPct: 28,
        requiredContributionSen: 2000,
        requiredMarginPct: 20,
        status: 'PASSED',
        source: 'growth.margin',
        revision: 7,
      }),
    );

    expect(markup).toContain('RM 28.00');
    expect(markup).toContain('28%');
    expect(markup).toContain('RM 20.00');
    expect(markup).toContain('20%');
    expect(markup).toContain('Lulus');
    expect(markup).toContain('growth.margin');
    expect(markup).toContain('Revisi: </dt><dd class="inline">7</dd>');
    expect(markup).not.toContain('<button');
  });

  test('keeps cash-margin and percentage-margin failures distinct', () => {
    const cashFailure = renderToStaticMarkup(
      createElement(MarginSummaryCard, {
        contributionSen: 800,
        contributionMarginPct: 12,
        requiredContributionSen: 2000,
        requiredMarginPct: 20,
        status: 'INSUFFICIENT_CASH_MARGIN',
      }),
    );
    const percentageFailure = renderToStaticMarkup(
      createElement(MarginSummaryCard, {
        contributionSen: 2800,
        contributionMarginPct: 12,
        requiredContributionSen: 2000,
        requiredMarginPct: 20,
        status: 'INSUFFICIENT_PERCENT_MARGIN',
      }),
    );

    expect(cashFailure).toContain('Margin tunai tidak mencukupi');
    expect(percentageFailure).toContain('Margin peratusan tidak mencukupi');
    expect(cashFailure).not.toContain('Margin peratusan tidak mencukupi');
    expect(percentageFailure).not.toContain('Margin tunai tidak mencukupi');
  });

  test('does not render a canonical pass when supplied values miss a threshold', () => {
    const markup = renderToStaticMarkup(
      createElement(MarginSummaryCard, {
        contributionSen: 0,
        contributionMarginPct: 0,
        requiredContributionSen: 2000,
        requiredMarginPct: 25,
        status: 'PASSED',
      }),
    );

    expect(markup).toContain('Data margin tidak mencukupi');
    expect(markup).not.toContain('Lulus');
    expect(markup).not.toContain('RM 0.00');
  });

  test('preserves cash-margin failure precedence when both thresholds are missed', () => {
    const markup = renderToStaticMarkup(
      createElement(MarginSummaryCard, {
        contributionSen: 800,
        contributionMarginPct: 12,
        requiredContributionSen: 2000,
        requiredMarginPct: 20,
        status: 'INSUFFICIENT_PERCENT_MARGIN',
      }),
    );

    expect(markup).toContain('Data margin tidak mencukupi');
    expect(markup).not.toContain('Margin peratusan tidak mencukupi');
    expect(markup).not.toContain('Lulus');
  });

  test('renders an order projection status without exposing fields outside the projection', () => {
    const order = Object.assign(
      {
        id: 'order-42',
        amountSen: 12550,
        fulfilmentStatus: 'dispatched' as const,
        paymentState: 'verified' as const,
        revision: 9,
      },
      { customerId: 'private-customer', contactRef: 'private-contact' },
    );
    const markup = renderToStaticMarkup(
      createElement(OrderSummaryCard, {
        order,
        source: 'commerce.order',
      }),
    );

    expect(markup).toContain('order-42');
    expect(markup).toContain('RM 125.50');
    expect(markup).toContain('Dihantar');
    expect(markup).toContain('Disahkan');
    expect(markup).toContain('commerce.order');
    expect(markup).toContain('Revisi: </dt><dd class="inline">9</dd>');
    expect(markup).not.toContain('private-customer');
    expect(markup).not.toContain('private-contact');
    expect(markup).not.toContain('<button');
  });

  test('renders canonical commission totals with their source and revision', () => {
    const markup = renderToStaticMarkup(
      createElement(CommissionSummaryCard, {
        summary: {
          dealerOrgId: 'dealer-5',
          totalEarnedSen: 12000,
          pendingSen: 1000,
          eligibleSen: 2000,
          approvedSen: 3000,
          paidSen: 4000,
          reversedContraSen: 500,
          netPayableSen: 8500,
          unsettledDeficitSen: 0,
        },
        source: 'dealers.commission',
        revision: 'policy-4',
      }),
    );

    expect(markup).toContain('dealer-5');
    expect(markup).toContain('RM 120.00');
    expect(markup).toContain('RM 10.00');
    expect(markup).toContain('RM 85.00');
    expect(markup).toContain('RM 0.00');
    expect(markup).toContain('dealers.commission');
    expect(markup).toContain('policy-4');
    expect(markup).not.toContain('<button');
  });

  test('makes loading, empty, error, denied, insufficient-data, stale, and unknown outcome explicit', () => {
    const states = [
      ['loading', 'Sedang dimuatkan'],
      ['empty', 'Tiada data'],
      ['error', 'Ralat'],
      ['denied', 'Akses tidak dibenarkan'],
      ['insufficient-data', 'mencukupi'],
      ['stale', 'Data mungkin lapuk'],
      ['unknown-outcome', 'Keputusan belum diketahui'],
    ] as const;
    const renderers = [
      (projectionState: typeof states[number][0]) => renderToStaticMarkup(createElement(JevAssessmentCard, { projectionState })),
      (projectionState: typeof states[number][0]) => renderToStaticMarkup(createElement(OrderSummaryCard, { projectionState })),
      (projectionState: typeof states[number][0]) => renderToStaticMarkup(createElement(MarginSummaryCard, { projectionState })),
      (projectionState: typeof states[number][0]) => renderToStaticMarkup(createElement(CommissionSummaryCard, { projectionState })),
    ];

    for (const [projectionState, label] of states) {
      for (const render of renderers) {
        expect(render(projectionState)).toContain(label);
      }
    }
  });

  test('treats missing ready data as insufficient instead of inventing values', () => {
    const renderers = [
      () => renderToStaticMarkup(createElement(JevAssessmentCard, {})),
      () => renderToStaticMarkup(createElement(OrderSummaryCard, {})),
      () => renderToStaticMarkup(createElement(MarginSummaryCard, {})),
      () => renderToStaticMarkup(createElement(CommissionSummaryCard, {})),
    ];

    for (const render of renderers) {
      const markup = render();
      expect(markup).toContain('mencukupi');
      expect(markup).not.toContain('RM 0.00');
    }
  });

  test('reports stale JEV projections explicitly and retains supplied provenance', () => {
    const markup = renderToStaticMarkup(
      createElement(JevAssessmentCard, {
        projectionState: 'stale',
        source: 'jev.local_rules',
        revision: 'assessment-8',
      }),
    );

    expect(markup).toContain('Data mungkin lapuk');
    expect(markup).toContain('jev.local_rules');
    expect(markup).toContain('assessment-8');
  });

  test('does not expose a dealer identifier when its projection is denied', () => {
    const markup = renderToStaticMarkup(
      createElement(CommissionSummaryCard, {
        summary: {
          dealerOrgId: 'private-dealer',
          totalEarnedSen: 12000,
          pendingSen: 1000,
          eligibleSen: 2000,
          approvedSen: 3000,
          paidSen: 4000,
          reversedContraSen: 500,
          netPayableSen: 8500,
          unsettledDeficitSen: 0,
        },
        projectionState: 'denied',
      }),
    );

    expect(markup).toContain('Akses tidak dibenarkan');
    expect(markup).not.toContain('private-dealer');
    expect(markup).not.toContain('RM 120.00');
  });

  test('renders only the tracking projection, omitting the token hash and unprojected fields', async () => {
    const modulePath = '../../src/features/copilot/cards/OrderTrackingCard';
    const implementation = await import(modulePath).catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const order = Object.assign({
      id: 'order-88',
      fulfilmentStatus: 'dispatched',
      trackingTokenExpiresAt: '2026-10-30T12:00:00.000Z',
      revision: 11,
    }, {
      customerId: 'private-customer',
      trackingTokenHash: 'private-token-hash',
    });
    const markup = renderToStaticMarkup(
      createElement(implementation.OrderTrackingCard, {
        order,
        source: 'commerce.tracking',
      }),
    );
    expect(markup).toContain('order-88');
    expect(markup).toContain('2026-10-30T12:00:00.000Z');
    expect(markup).toContain('commerce.tracking');
    expect(markup).not.toContain('private-customer');
    expect(markup).not.toContain('private-token-hash');
    expect(markup).not.toContain('<button');
  });

  test('renders loyalty ledger entries without user identity or a client-derived balance', async () => {
    const modulePath = '../../src/features/copilot/cards/LoyaltyLedgerCard';
    const implementation = await import(modulePath).catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const markup = renderToStaticMarkup(
      createElement(implementation.LoyaltyLedgerCard, {
        entries: [{
          id: 'entry-1',
          userId: 'private-user',
          pointsDelta: 40,
          monetaryEquivalentSen: 40,
          eventType: 'earned',
          sourceOrderId: 'order-88',
          expiryAt: '2026-12-01T00:00:00.000Z',
          description: 'Points from completed order',
          createdAt: '2026-10-19T12:00:00.000Z',
        }],
        source: 'loyalty.ledger',
        revision: 5,
      }),
    );
    expect(markup).toContain('+40');
    expect(markup).toContain('Points from completed order');
    expect(markup).toContain('loyalty.ledger');
    expect(markup).toContain('Revisi: </dt><dd class="inline">5</dd>');
    expect(markup).not.toContain('private-user');
    expect(markup).not.toContain('RM 0.40');
    expect(markup).not.toContain('balance');
  });

  test('GUI-01: mounts all display-only cards in CopilotWorkspaceView on the live workspace data path', () => {
    const html = renderToStaticMarkup(
      createElement(CopilotWorkspaceView, {
        runtime: { kind: 'checking' },
        session: null,
        threadId: 'thr_gui01',
        messages: [],
        inputMessage: '',
        isSending: false,
        chatError: null,
        run: initialAguiRunState,
        activeIdentity: null,
        onInputChange: () => {},
        onSubmit: () => {},
        onRetryRuntime: () => {},
        liveCards: {
          latestOrder: {
            id: 'ORD-LIVE-01',
            customerId: 'cust-live',
            lines: [],
            amountSen: 4500,
            fulfilment: 'pickup',
            contactRef: '0123456',
            outletId: 'hq',
            fulfilmentStatus: 'dispatched',
            trackingTokenExpiresAt: '2026-11-15T00:00:00.000Z',
            revision: 3,
            paymentState: 'verified',
            paidAmountSen: 4500,
            refundAmountSen: 0,
            createdAt: '2026-10-24T10:00:00.000Z',
            updatedAt: '2026-10-24T10:00:00.000Z',
          },
          commissionSummary: {
            dealerOrgId: 'dlr-live-01',
            totalEarnedSen: 5000,
            pendingSen: 500,
            eligibleSen: 1500,
            approvedSen: 1500,
            paidSen: 1500,
            reversedContraSen: 0,
            netPayableSen: 3000,
            unsettledDeficitSen: 0,
          },
          latestJev: {
            issueClass: 'LEAKAGE',
            rootCause: 'PACKAGING_CRIMP_FAILURE',
            sopAction: 'Kuarantin kelompok botol segera',
            evaluationState: 'reviewed',
            evidencePhotoRequired: true,
            revision: 8,
          },
          latestMargin: {
            contributionSen: 2600,
            contributionMarginPct: 26,
            requiredContributionSen: 2000,
            requiredMarginPct: 20,
            status: 'PASSED',
            revision: 4,
          },
        },
      }),
    );

    expect(html).toContain('ORD-LIVE-01');
    expect(html).toContain('2026-11-15T00:00:00.000Z');
    expect(html).toContain('dlr-live-01');
    expect(html).toContain('Kuarantin kelompok botol segera');
    expect(html).toContain('RM 26.00');
  });
});
