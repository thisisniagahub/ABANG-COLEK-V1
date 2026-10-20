import { describe, expect, test } from 'bun:test';
import {
  validateA2UIPayload,
  A2UI_ALLOWLISTED_COMPONENTS,
} from '../../src/features/copilot/a2ui-registry';

describe('GUI-06 A2UI Fixed Schema & Component Validation (Fasa 04)', () => {
  describe('Katalog Komponen A2UI Tetap (Fixed Catalog Allowlist)', () => {
    test('Mengandungi komponen kanonikal operasi ABANGCOLEK', () => {
      expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('MarginSimulator');
      expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('RefundImpactPanel');
      expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('OrderTrackingBadge');
      expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('OperationsBriefCard');
      expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('JevAssessmentCard');
    });

    test('Memvalidasi payload komponen yang sah dengan format A2UI', () => {
      const payload = {
        componentName: 'MarginSimulator',
        schemaVersion: 1,
        props: {
          netSalesSen: 10000,
          contributionSen: 2800,
          marginBps: 2800,
          status: 'passed',
        },
      };

      const result = validateA2UIPayload(payload);
      expect(result.valid).toBe(true);
      expect(result.componentName).toBe('MarginSimulator');
    });

    test('Menolak cubaan suntikan komponen dinamik sebarangan (Anti-Arbitrary Dynamic Injection)', () => {
      const maliciousPayload = {
        componentName: 'ArbitraryCustomHTMLInjectionCard',
        schemaVersion: 1,
        props: {
          script: 'alert("hack")',
        },
      };

      const result = validateA2UIPayload(maliciousPayload);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('UNAUTHORIZED_DYNAMIC_COMPONENT');
    });

    test('Menolak payload yang tidak sah (bukan objek atau tiada props)', () => {
      expect(validateA2UIPayload(null).valid).toBe(false);
      expect(validateA2UIPayload('invalid string').valid).toBe(false);
      expect(validateA2UIPayload({ componentName: 'MarginSimulator' }).valid).toBe(false);
    });
  });
});
