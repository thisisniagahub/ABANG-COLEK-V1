/**
 * ABANGCOLEK Sovereign GrowthOS — Versioned Surface Catalog Contracts (BL-16)
 *
 * A "surface" is one declaratively described, renderable unit of the copilot
 * workspace (an A2UI card, a nested AG-UI tree, ...). The catalog is the
 * server-owned, VERSIONED list of surfaces that may be rendered. The renderer
 * never invents a surface: it asks the catalog.
 *
 * Rules enforced by these contracts (never negotiated at runtime):
 *  - the catalog carries an explicit `catalogVersion` and `schemaVersion`;
 *  - a surface tree has a HARD depth limit and a HARD node budget;
 *  - a cyclic tree is REFUSED with a machine-readable reason code — the
 *    traversal never loops and never expands an unbounded graph;
 *  - every refusal is typed (`SurfaceRefusalReason`) so the caller can branch
 *    on the cause instead of parsing a message.
 *
 * This file is pure contract + pure validation. It imports nothing from
 * `server/` or `src/` so it can be consumed by the server, the client and the
 * tests without creating a layer cycle.
 */

/** Schema version of the catalog document itself. */
export const SURFACE_CATALOG_SCHEMA_VERSION = 'surface.catalog.v1';

/** Schema version of the renderable payload the catalog describes. */
export const SURFACE_PAYLOAD_SCHEMA_VERSION = 'a2ui.v1';

/** Hard limits applied to every surface tree. */
export interface SurfaceLimits {
  /** Maximum number of levels below the root (root = depth 0). */
  maxDepth: number;
  /** Maximum number of nodes in one surface tree. */
  maxNodes: number;
}

/** One declaratively described surface. */
export interface SurfaceDefinition {
  /** Stable identifier used by payloads to reference the surface. */
  surfaceId: string;
  /** Renderer component the surface maps to. */
  component: string;
  /** Payload schema version this surface accepts. */
  schemaVersion: string;
  /** Maximum depth allowed BELOW this surface (0 = leaf surface). */
  maxDepth: number;
  /** Maximum node count for the whole subtree of this surface. */
  maxNodes: number;
  /** Human readable purpose of the surface. */
  description: string;
}

/** The versioned, declarative surface catalog. */
export interface SurfaceCatalog {
  /** Version of the catalog content. Bumped whenever a surface changes. */
  catalogVersion: string;
  /** Schema version of the catalog document. */
  schemaVersion: typeof SURFACE_CATALOG_SCHEMA_VERSION;
  /** Global limits, applied on top of the per-surface limits. */
  limits: SurfaceLimits;
  /** The declared surfaces, keyed by `surfaceId`. */
  surfaces: readonly SurfaceDefinition[];
}

/**
 * Machine-readable reason codes for every refusal of the surface path.
 *
 * They are stable strings: the UI, the tests and the audit log all branch on
 * the code, never on a human message.
 */
export type SurfaceRefusalReason =
  | 'SURFACE_CATALOG_UNAVAILABLE'
  | 'SURFACE_CATALOG_INVALID'
  | 'SURFACE_PAYLOAD_INVALID'
  | 'SURFACE_SCHEMA_VERSION_MISMATCH'
  | 'SURFACE_UNKNOWN_SURFACE_ID'
  | 'SURFACE_COMPONENT_NOT_ALLOWLISTED'
  | 'SURFACE_DEPTH_EXCEEDED'
  | 'SURFACE_CYCLE_DETECTED'
  | 'SURFACE_NODE_LIMIT_EXCEEDED';

/** Result of loading/validating a catalog document. */
export type SurfaceCatalogLoadOutcome =
  | { ok: true; catalog: SurfaceCatalog }
  | { ok: false; reason: SurfaceRefusalReason; message: string; detail?: Record<string, unknown> };

/** A node of a surface tree as delivered by the producer (server or AG-UI). */
export interface SurfaceTreeNode {
  /** Node identity. Used for cycle detection (an id may appear once per path). */
  id: string;
  /** The surface this node renders. */
  surfaceId: string;
  /** Props handed to the renderer. */
  props: Record<string, unknown>;
  /** Optional children. */
  children?: SurfaceTreeNode[];
}

/** A validated node ready for the renderer. */
export interface SurfaceRenderNode {
  id: string;
  surfaceId: string;
  component: string;
  props: Record<string, unknown>;
  children: SurfaceRenderNode[];
}

/** The renderer instruction produced by the surface middleware. */
export interface SurfaceRenderPlan {
  /** Version of the catalog the plan was resolved against. */
  catalogVersion: string;
  /** Schema version of the payload the plan was resolved against. */
  schemaVersion: string;
  /** Renderer component of the root surface. */
  component: string;
  /** The validated root node. */
  root: SurfaceRenderNode;
  /** Deepest level reached (root = 0). */
  depth: number;
  /** Number of nodes in the plan. */
  nodeCount: number;
}

/** Typed outcome of the AG-UI -> renderer middleware. */
export type SurfaceRenderOutcome =
  | { ok: true; plan: SurfaceRenderPlan }
  | {
      ok: false;
      reason: SurfaceRefusalReason;
      message: string;
      detail?: Record<string, unknown>;
    };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/**
 * Validate a raw catalog document.
 *
 * A catalog that does not validate is REFUSED (never partially applied): a
 * half-loaded catalog would let the renderer draw surfaces the server does not
 * know about.
 */
export function validateSurfaceCatalog(raw: unknown): SurfaceCatalogLoadOutcome {
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      reason: 'SURFACE_CATALOG_INVALID',
      message: 'Katalog permukaan mesti objek biasa.',
    };
  }
  const catalogVersion = raw.catalogVersion;
  if (typeof catalogVersion !== 'string' || !catalogVersion.trim()) {
    return {
      ok: false,
      reason: 'SURFACE_CATALOG_INVALID',
      message: 'Katalog permukaan memerlukan catalogVersion.',
    };
  }
  if (raw.schemaVersion !== SURFACE_CATALOG_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: 'SURFACE_CATALOG_INVALID',
      message: `Versi skema katalog tidak disokong: ${String(raw.schemaVersion)}.`,
      detail: { expected: SURFACE_CATALOG_SCHEMA_VERSION },
    };
  }
  const limits = raw.limits;
  if (
    !isPlainObject(limits) ||
    !isPositiveInteger(limits.maxDepth) ||
    !isPositiveInteger(limits.maxNodes)
  ) {
    return {
      ok: false,
      reason: 'SURFACE_CATALOG_INVALID',
      message: 'Katalog permukaan memerlukan had depth dan nod yang sah.',
    };
  }
  const surfaces = raw.surfaces;
  if (!Array.isArray(surfaces) || surfaces.length === 0) {
    return {
      ok: false,
      reason: 'SURFACE_CATALOG_INVALID',
      message: 'Katalog permukaan memerlukan sekurang-kurangnya satu permukaan.',
    };
  }
  const seen = new Set<string>();
  const definitions: SurfaceDefinition[] = [];
  for (const entry of surfaces) {
    if (!isPlainObject(entry)) {
      return {
        ok: false,
        reason: 'SURFACE_CATALOG_INVALID',
        message: 'Setiap permukaan katalog mesti objek biasa.',
      };
    }
    const surfaceId = entry.surfaceId;
    const component = entry.component;
    const schemaVersion = entry.schemaVersion;
    if (
      typeof surfaceId !== 'string' ||
      !surfaceId.trim() ||
      typeof component !== 'string' ||
      !component.trim() ||
      typeof schemaVersion !== 'string' ||
      !schemaVersion.trim() ||
      !isPositiveInteger(entry.maxDepth) ||
      !isPositiveInteger(entry.maxNodes) ||
      typeof entry.description !== 'string'
    ) {
      return {
        ok: false,
        reason: 'SURFACE_CATALOG_INVALID',
        message: `Permukaan '${String(surfaceId)}' tidak lengkap.`,
        detail: { surfaceId: String(surfaceId) },
      };
    }
    if (seen.has(surfaceId)) {
      return {
        ok: false,
        reason: 'SURFACE_CATALOG_INVALID',
        message: `Permukaan '${surfaceId}' didaftar dua kali.`,
        detail: { surfaceId },
      };
    }
    seen.add(surfaceId);
    definitions.push({
      surfaceId,
      component,
      schemaVersion,
      maxDepth: entry.maxDepth,
      maxNodes: entry.maxNodes,
      description: entry.description,
    });
  }
  return {
    ok: true,
    catalog: {
      catalogVersion,
      schemaVersion: SURFACE_CATALOG_SCHEMA_VERSION,
      limits: { maxDepth: limits.maxDepth, maxNodes: limits.maxNodes },
      surfaces: definitions,
    },
  };
}

/** Find one surface definition by id. */
export function findSurfaceDefinition(
  catalog: SurfaceCatalog,
  surfaceId: string,
): SurfaceDefinition | undefined {
  return catalog.surfaces.find((surface) => surface.surfaceId === surfaceId);
}
