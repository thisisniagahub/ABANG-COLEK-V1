/**
 * ABANGCOLEK Sovereign GrowthOS — Versioned Declarative Surface Catalog (BL-16)
 *
 * The catalog is DATA, not code paths: it declares which surfaces may be
 * rendered, which renderer component each surface maps to, and the hard
 * limits that apply to each surface tree.
 *
 * It is LOADED AT STARTUP: the module validates the declaration once, caches
 * the validated catalog, and every later read returns the same immutable
 * instance. A catalog that does not validate is never partially applied — the
 * loader refuses it and the middleware then answers
 * `SURFACE_CATALOG_UNAVAILABLE` (fail closed, no invented surfaces).
 *
 * The catalog is versioned: `catalogVersion` identifies the content and
 * `schemaVersion` identifies the document shape. Consumers may compare the
 * version they were served against the version they hold.
 */

import {
  SURFACE_CATALOG_SCHEMA_VERSION,
  SURFACE_PAYLOAD_SCHEMA_VERSION,
  validateSurfaceCatalog,
  type SurfaceCatalog,
  type SurfaceCatalogLoadOutcome,
  type SurfaceDefinition,
  type SurfaceLimits,
} from '../../shared/surface-contracts';

/** Global limits of the catalog: depth and node budget of any surface tree. */
export const SURFACE_CATALOG_LIMITS: SurfaceLimits = {
  maxDepth: 8,
  maxNodes: 256,
};

/**
 * The declarative surface declaration.
 *
 * Leaf cards cannot nest (maxDepth 0, maxNodes 1); the workspace container may
 * nest the cards up to four levels deep.
 */
export const SURFACE_DECLARATIONS: readonly SurfaceDefinition[] = [
  {
    surfaceId: 'copilot.workspace',
    component: 'OperationsBriefCard',
    schemaVersion: SURFACE_PAYLOAD_SCHEMA_VERSION,
    maxDepth: 4,
    maxNodes: 64,
    description: 'Permukaan kandungan ruang kerja copilot; boleh memuat kad kanak-kanak.',
  },
  {
    surfaceId: 'operations.brief',
    component: 'OperationsBriefCard',
    schemaVersion: SURFACE_PAYLOAD_SCHEMA_VERSION,
    maxDepth: 1,
    maxNodes: 1,
    description: 'Taklimat operasi baca sahaja.',
  },
  {
    surfaceId: 'refund.impact',
    component: 'RefundImpactPanel',
    schemaVersion: SURFACE_PAYLOAD_SCHEMA_VERSION,
    maxDepth: 1,
    maxNodes: 1,
    description: 'Impak refund pada pesanan (anggaran kesan kewangan).',
  },
  {
    surfaceId: 'jev.assessment',
    component: 'JevAssessmentCard',
    schemaVersion: SURFACE_PAYLOAD_SCHEMA_VERSION,
    maxDepth: 1,
    maxNodes: 1,
    description: 'Penilaian JEV untuk isu kualiti yang disemak.',
  },
  {
    surfaceId: 'margin.simulator',
    component: 'MarginSimulator',
    schemaVersion: SURFACE_PAYLOAD_SCHEMA_VERSION,
    maxDepth: 1,
    maxNodes: 1,
    description: 'Simulasi margin yang dikira oleh penilai kanonikal.',
  },
  {
    surfaceId: 'margin.summary',
    component: 'MarginSummaryCard',
    schemaVersion: SURFACE_PAYLOAD_SCHEMA_VERSION,
    maxDepth: 1,
    maxNodes: 1,
    description: 'Ringkasan margin (termasuk kegagalan simulasi bertip).',
  },
  {
    surfaceId: 'order.tracking.badge',
    component: 'OrderTrackingBadge',
    schemaVersion: SURFACE_PAYLOAD_SCHEMA_VERSION,
    maxDepth: 1,
    maxNodes: 1,
    description: 'Lencana status penjejakan pesanan.',
  },
  {
    surfaceId: 'order.tracking.card',
    component: 'OrderTrackingCard',
    schemaVersion: SURFACE_PAYLOAD_SCHEMA_VERSION,
    maxDepth: 1,
    maxNodes: 1,
    description: 'Kad status penjejakan pesanan.',
  },
  {
    surfaceId: 'commission.summary',
    component: 'CommissionCard',
    schemaVersion: SURFACE_PAYLOAD_SCHEMA_VERSION,
    maxDepth: 1,
    maxNodes: 1,
    description: 'Ringkasan komisen ejen.',
  },
];

/** The raw catalog document, exactly as it is declared. */
export const SURFACE_CATALOG_DOCUMENT = {
  catalogVersion: 'surface.catalog.2026-10-21.1',
  schemaVersion: SURFACE_CATALOG_SCHEMA_VERSION,
  limits: SURFACE_CATALOG_LIMITS,
  surfaces: SURFACE_DECLARATIONS,
} as const;

let startupOutcome: SurfaceCatalogLoadOutcome | null = null;

/**
 * Load and validate the catalog. The validated instance is cached, so the
 * catalog is read once at startup and every later call is a constant-time
 * lookup of the SAME immutable value.
 */
export function loadSurfaceCatalog(
  document: unknown = SURFACE_CATALOG_DOCUMENT,
): SurfaceCatalogLoadOutcome {
  const outcome = validateSurfaceCatalog(document);
  startupOutcome = outcome;
  return outcome;
}

/**
 * The startup-loaded catalog.
 *
 * Returns `null` when the catalog could not be loaded — callers must then
 * refuse the surface with `SURFACE_CATALOG_UNAVAILABLE` instead of guessing a
 * component.
 */
export function getSurfaceCatalog(): SurfaceCatalog | null {
  if (!startupOutcome) loadSurfaceCatalog();
  return startupOutcome && startupOutcome.ok ? startupOutcome.catalog : null;
}

/** The startup load outcome, for diagnostics and evidence. */
export function getSurfaceCatalogOutcome(): SurfaceCatalogLoadOutcome {
  if (!startupOutcome) loadSurfaceCatalog();
  return startupOutcome as SurfaceCatalogLoadOutcome;
}

// STARTUP LOAD: the catalog is validated when the module is first evaluated.
// A broken declaration is therefore visible at startup, not on the first
// user-visible request.
loadSurfaceCatalog();
