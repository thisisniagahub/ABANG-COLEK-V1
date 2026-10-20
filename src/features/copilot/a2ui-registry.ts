/**
 * AbangColek Sovereign GrowthOS — A2UI Fixed Schema Component Registry (Fasa 04)
 * Anti-Arbitrary Dynamic Injection • Fixed Schema Catalog • Allowed Components Only
 */

import {
  A2UI_ALLOWLISTED_COMPONENTS,
  type A2UIComponentName,
  validateA2UIComponent,
} from '../../../shared/copilot-contracts';

export { A2UI_ALLOWLISTED_COMPONENTS, type A2UIComponentName, validateA2UIComponent };

export interface A2UIRenderPayload {
  componentName: string;
  props: Record<string, unknown>;
  schemaVersion: number;
}

export interface A2UIValidationResult {
  valid: boolean;
  componentName?: A2UIComponentName;
  reason?: string;
}

/**
 * Validates that an incoming A2UI payload matches an approved static component schema.
 * Rejects any arbitrary or secondary-model injected schema definitions.
 */
export function validateA2UIPayload(payload: unknown): A2UIValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, reason: 'PAYLOAD_MUST_BE_OBJECT' };
  }

  const p = payload as Record<string, unknown>;
  if (typeof p.componentName !== 'string') {
    return { valid: false, reason: 'MISSING_COMPONENT_NAME' };
  }

  if (!validateA2UIComponent(p.componentName)) {
    return {
      valid: false,
      reason: `UNAUTHORIZED_DYNAMIC_COMPONENT: Komponen '${p.componentName}' tidak dibenarkan dalam katalog A2UI tetap.`,
    };
  }

  if (typeof p.props !== 'object' || p.props === null) {
    return { valid: false, reason: 'PROPS_MUST_BE_OBJECT' };
  }

  return {
    valid: true,
    componentName: p.componentName,
  };
}
