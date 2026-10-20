import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JevAssessmentCard } from '../../src/features/copilot/cards/JevAssessmentCard';
import { JevPrimitivesCard } from '../../src/features/copilot/cards/JevPrimitivesCard';
import {
  MarginSummaryCard,
  parseMarginInputFailure,
} from '../../src/features/copilot/cards/MarginSummaryCard';
import { A2UIFixedRenderer } from '../../src/features/copilot/declarative/A2UIFixedRenderer';
import {
  JEV_NOT_COMPUTED_TEXT,
  JEV_UNKNOWN_TEXT,
  projectJevAnswers,
  projectJevConfidence,
  projectJevNoul,
  projectJevProbability,
  projectJevProbabilities,
  projectJevScore,
  type JevNoulProjection,
} from '../../src/features/copilot/cards/jevValueSemantics';

const provenance = {
  source: 'jev_local_rules' as const,
  timestamp: '2026-10-20T12:00:00.000Z',
  revision: 5,
};

function envelope(component: string, props: Record<string, unknown>) {
  return {
    schemaVersion: 'a2ui.v1' as const,
    component,
    props,
    provenance,
  };
}

function renderA2UI(component: string, props: Record<string, unknown>): string {
  return renderToStaticMarkup(
    createElement(A2UIFixedRenderer, { payload: envelope(component, props) }),
  );
}

const fullAssessment = {
  issueClass: 'LEAKAGE' as const,
  rootCause: 'UNDETERMINED' as const,
  sopAction: 'Semak bukti lot',
  evaluationState: 'reviewed' as const,
  evidencePhotoRequired: true,
};

describe('JEV null-semantics: "tidak dikira" / "tidak diketahui" (BL-24/BL-27)', () => {
  test('JevAssessmentCard shows a null confidence as "Tidak dikira", never as 0%', () => {
    const markup = renderToStaticMarkup(
      createElement(JevAssessmentCard, { ...fullAssessment, confidenceScore: null }),
    );

    expect(markup).toContain(JEV_NOT_COMPUTED_TEXT);
    expect(markup).toContain('Tidak dikira');
    // 0% would be a fabricated zero-confidence claim.
    expect(markup).not.toContain('0%');
    // Control: a real calibrated confidence IS rendered as a percentage,
    // proving the projection path is live and not a hardcoded string.
    const computed = renderToStaticMarkup(
      createElement(JevAssessmentCard, { ...fullAssessment, confidenceScore: 0.42 }),
    );
    expect(computed).toContain('42%');
    expect(computed).not.toContain(JEV_NOT_COMPUTED_TEXT);
  });

  test('JevPrimitivesCard shows an unknown noul as "Tidak diketahui", never as "Tidak"', () => {
    // Raw wire shape: the card re-projects `isAffirmative` / `probability`
    // itself, so the null semantics are driven through the card, not a stub.
    const unknownNoul = {
      probability: null,
      isAffirmative: null,
    } as unknown as JevNoulProjection;

    const markup = renderToStaticMarkup(
      createElement(JevPrimitivesCard, { nouls: { 'soalan-noul': unknownNoul } }),
    );

    expect(markup).toContain(JEV_UNKNOWN_TEXT);
    expect(markup).toContain('Tidak diketahui');
    // '>Tidak<' is the exact negative form. A bare `not.toContain('Tidak')`
    // can never pass here because 'Tidak diketahui' itself contains 'Tidak'.
    expect(markup).not.toContain('>Tidak<');
  });

  test('JevPrimitivesCard negative control: an explicit false noul renders "Tidak"', () => {
    const negativeNoul = {
      probability: null,
      isAffirmative: false,
    } as unknown as JevNoulProjection;

    const markup = renderToStaticMarkup(
      createElement(JevPrimitivesCard, { nouls: { 'soalan-noul': negativeNoul } }),
    );

    // Control for the assertion above: ">Tidak<" IS reachable when the
    // server really said "no". If this ever stops holding, the unknown-noul
    // assertion above is no longer evidence of anything.
    expect(markup).toContain('>Tidak<');
    expect(markup).not.toContain('Tidak diketahui');
  });

  test('JevPrimitivesCard reports dimension confidence and probability as not computed', () => {
    const markup = renderToStaticMarkup(
      createElement(JevPrimitivesCard, {
        dimensions: {
          'kemerosotan-kemasan': { value: 'Moderat', confidence: null, probabilities: null },
        },
      }),
    );

    expect(markup).toContain('Keyakinan: Tidak dikira');
    expect(markup).toContain('Kebarangkalian: Tidak dikira');
    expect(markup).toContain('Moderat');
    expect(markup).not.toContain('0%');
  });
});

describe('MarginSummaryCard typed input failures (BL-24b)', () => {
  test('renders a "not provided" failure with its reason code and keys, and no margin', () => {
    const markup = renderToStaticMarkup(
      createElement(MarginSummaryCard, {
        failure: {
          ok: false,
          reason: 'MARGIN_INPUTS_NOT_PROVIDED',
          invalidKeys: ['netSalesExTaxSen'],
        },
      }),
    );

    expect(markup).toContain('Input margin tidak disediakan');
    expect(markup).toContain('MARGIN_INPUTS_NOT_PROVIDED');
    expect(markup).toContain('netSalesExTaxSen');
    // No margin may be claimed when the server could not compute one.
    expect(markup).not.toContain('Lulus');
    expect(markup).not.toContain('RM 0.00');
    expect(markup).not.toContain('0%');
  });

  test('renders an "invalid" failure with its reason code and keys, and no margin', () => {
    const markup = renderToStaticMarkup(
      createElement(MarginSummaryCard, {
        failure: {
          ok: false,
          reason: 'MARGIN_INPUTS_INVALID',
          invalidKeys: ['cogsSen', 'packagingSen'],
        },
      }),
    );

    expect(markup).toContain('Input margin tidak sah');
    expect(markup).toContain('MARGIN_INPUTS_INVALID');
    expect(markup).toContain('cogsSen');
    expect(markup).toContain('packagingSen');
    expect(markup).not.toContain('Lulus');
    expect(markup).not.toContain('RM 0.00');
    expect(markup).not.toContain('0%');
  });

  test('parseMarginInputFailure maps the flat legacy reason shape onto the typed failure', () => {
    expect(parseMarginInputFailure({
      reasonCode: 'MARGIN_INPUTS_INVALID',
      missingInputKeys: ['cogsSen'],
    })).toEqual({
      ok: false,
      reason: 'MARGIN_INPUTS_INVALID',
      invalidKeys: ['cogsSen'],
    });
  });

  test('parseMarginInputFailure returns null when there is no typed failure', () => {
    expect(parseMarginInputFailure({})).toBeNull();
    expect(parseMarginInputFailure(null)).toBeNull();
    expect(parseMarginInputFailure('MARGIN_INPUTS_INVALID')).toBeNull();
    // An unknown reason code is not a margin failure — it must not be
    // coerced into one.
    expect(parseMarginInputFailure({ reasonCode: 'SOMETHING_ELSE' })).toBeNull();
  });
});

describe('A2UIFixedRenderer: unsupported props are ignored, not fatal', () => {
  test('a JEV payload carrying the legacy incidentType prop still renders its issue class', () => {
    const markup = renderA2UI('JevAssessmentCard', {
      issueClass: 'LEAKAGE',
      rootCause: 'UNDETERMINED',
      sopAction: 'Semak bukti lot',
      evaluationState: 'reviewed',
      evidencePhotoRequired: true,
      confidenceScore: null,
      // Legacy prop from an older server contract: it must be ignored, and it
      // must NOT collapse the card into "insufficient data".
      incidentType: 'LEGACY_INCIDENT_FIELD',
    });

    expect(markup).toContain('Kebocoran');
    expect(markup).toContain(JEV_NOT_COMPUTED_TEXT);
    expect(markup).not.toContain('Data tidak mencukupi');
    expect(markup).not.toContain('LEGACY_INCIDENT_FIELD');
  });

  test('a MarginSummaryCard payload with a typed failure renders the reason and key', () => {
    const markup = renderA2UI('MarginSummaryCard', {
      reasonCode: 'MARGIN_INPUTS_INVALID',
      missingInputKeys: ['cogsSen'],
    });

    expect(markup).toContain('MARGIN_INPUTS_INVALID');
    expect(markup).toContain('cogsSen');
    expect(markup).toContain('Input margin tidak sah');
    expect(markup).not.toContain('0%');
  });

  test('a MarginSummaryCard payload without numbers renders no margin and does not throw', () => {
    let markup = '';
    expect(() => { markup = renderA2UI('MarginSummaryCard', {}); }).not.toThrow();

    expect(markup).toContain('Data margin tidak mencukupi');
    expect(markup).not.toContain('RM ');
    expect(markup).not.toContain('%');
    expect(markup).not.toContain('Lulus');
  });

  test('an OrderTrackingCard payload without an order renders "not found" and no order id', () => {
    const markup = renderA2UI('OrderTrackingCard', { reasonCode: 'ORDER_ID_NOT_FOUND' });

    expect(markup).toContain('Pesanan tidak dijumpai');
    expect(markup).toContain('ORDER_ID_NOT_FOUND');
    // No fabricated order id and no fabricated amount.
    expect(markup).not.toMatch(/ORD-\d+/);
    expect(markup).not.toContain('RM ');
  });

  test('an OrderTrackingCard payload with a server-supplied order id still shows it', () => {
    const markup = renderA2UI('OrderTrackingCard', {
      orderId: 'ORD-9001',
      reasonCode: 'ORDER_ID_NOT_FOUND',
    });

    // Control for the assertion above: a server-supplied reference IS shown,
    // so "no order id" above is the absence of input, not a hardcoded string.
    expect(markup).toContain('ORD-9001');
  });

  test('an OperationsBriefCard payload with extra props still renders the brief', () => {
    const markup = renderA2UI('OperationsBriefCard', {
      title: 'Taklimat Operasi Harian',
      briefDate: '2026-10-20',
      metrics: [{ label: 'Pesanan hari ini', value: '12' }],
      // Unsupported extras: dropped, but they must not invalidate the brief.
      readOnly: true,
      provenanceDetail: 'LEGACY_PROVENANCE_DETAIL',
    });

    expect(markup).toContain('Taklimat Operasi Harian');
    expect(markup).toContain('Pesanan hari ini');
    expect(markup).toContain('12');
    expect(markup).not.toContain('Data taklimat tidak mencukupi');
    expect(markup).not.toContain('LEGACY_PROVENANCE_DETAIL');
  });

  test('a RefundImpactPanel payload shows the resolution reason but not the UNRESOLVED sentinel', () => {
    const markup = renderA2UI('RefundImpactPanel', {
      issueClass: 'LEAKAGE',
      rootCause: 'UNDETERMINED',
      hitlRequired: true,
      estimatedImpactSen: 2500,
      sopAction: 'Semak bukti',
      orderId: 'UNRESOLVED',
      orderResolutionReason: 'ORDER_ID_NOT_FOUND',
    });

    expect(markup).toContain('ORDER_ID_NOT_FOUND');
    // The sentinel is a server marker, never an order id.
    expect(markup).not.toContain('UNRESOLVED');
    // No impact amount may be displayed by this renderer.
    expect(markup).not.toContain('RM 25.00');
    expect(markup).not.toContain('2500');
  });
});

describe('JEV value projections: unit-level null semantics', () => {
  test('projectJevAnswers keeps a local-rules null confidence and null noul honest', () => {
    const projections = projectJevAnswers({
      'kemerosotan-kemasan': {
        type: 'choice',
        value: 'Moderat',
        confidence: null,
        probabilities: null,
      },
      'adakah-bocor': {
        type: 'noul',
        value: null,
      },
    });

    const dimension = projections.dimensions['kemerosotan-kemasan'];
    expect(dimension).toBeDefined();
    expect(dimension!.value).toBe('Moderat');
    expect(dimension!.confidence).toBeNull();
    expect(dimension!.probabilities).toBeNull();
    expect(projectJevConfidence(dimension!.confidence).text).toBe(JEV_NOT_COMPUTED_TEXT);

    const noul = projections.nouls['adakah-bocor'];
    expect(noul).toBeDefined();
    expect(noul!.state).toBe('unknown');
    expect(noul!.text).toBe(JEV_UNKNOWN_TEXT);
  });

  test('projectJevConfidence rejects non-probability values but keeps a genuine zero', () => {
    for (const invalid of [Number.NaN, 1.5, -0.2, null, undefined, '0.5']) {
      const projection = projectJevConfidence(invalid);
      expect(projection.state).toBe('not-computed');
      expect(projection.text).toBe(JEV_NOT_COMPUTED_TEXT);
      expect(projection.value).toBeNull();
    }

    const zero = projectJevConfidence(0);
    expect(zero.state).toBe('computed');
    expect(zero.value).toBe(0);
    expect(zero.text).toBe('0%');
  });

  test('projectJevNoul reports an unknown noul instead of a false "Tidak"', () => {
    const unknown = projectJevNoul(null, null);
    expect(unknown.state).toBe('unknown');
    expect(unknown.isAffirmative).toBeNull();
    expect(unknown.text).toBe(JEV_UNKNOWN_TEXT);
    expect(unknown.probability.state).toBe('not-computed');
    expect(unknown.probability.text).toBe(JEV_NOT_COMPUTED_TEXT);

    const negative = projectJevNoul(false, 0.25);
    expect(negative.state).toBe('negative');
    expect(negative.text).toBe('Tidak');
    expect(negative.probability.text).toBe('25%');
  });

  test('projectJevProbability, projectJevScore and projectJevProbabilities stay honest on null', () => {
    expect(projectJevProbability(null).state).toBe('not-computed');
    expect(projectJevProbability(null).text).toBe(JEV_NOT_COMPUTED_TEXT);
    expect(projectJevProbability(0).text).toBe('0%');

    expect(projectJevScore(null).state).toBe('not-computed');
    expect(projectJevScore(null).text).toBe(JEV_NOT_COMPUTED_TEXT);
    expect(projectJevScore(0).text).toBe('0');

    const empty = projectJevProbabilities(null);
    expect(empty.state).toBe('not-computed');
    expect(empty.entries).toEqual([]);
    expect(empty.text).toBe(JEV_NOT_COMPUTED_TEXT);

    const computed = projectJevProbabilities({ tinggi: 0.7, rendah: 0.3 });
    expect(computed.state).toBe('computed');
    expect(computed.entries.map((entry) => entry.text)).toEqual(['70%', '30%']);
  });
});
