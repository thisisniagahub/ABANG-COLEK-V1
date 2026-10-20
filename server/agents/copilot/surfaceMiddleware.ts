/**
 * ABANGCOLEK Sovereign GrowthOS — AG-UI → Renderer Surface Middleware (BL-16)
 *
 * This middleware is the ONLY path from an A2UI / AG-UI surface payload to the
 * renderer. It never trusts the payload:
 *
 *  - the surface must exist in the versioned, server-owned catalog;
 *  - the component must be on the A2UI allow-list;
 *  - the tree depth is bounded by the catalog AND by the surface itself;
 *  - the number of nodes is bounded (budget);
 *  - a CYCLIC tree is refused with `SURFACE_CYCLE_DETECTED`. The traversal is
 *    iterative and never revisits a node that is already on the current path,
 *    so a cycle can never turn into an infinite loop.
 *
 * Every refusal carries a machine-readable `reason` so the caller never has
 * to parse a message to decide what to do.
 *
 * The catalog is INJECTED (dependency injection) on purpose: this module must
 * not import `server/platform/**` (that would create a module-interface cycle
 * with the platform layer). The startup-loaded catalog lives in
 * `server/platform/surfaceCatalog.ts` and is passed in by the composition
 * root.
 */

import { A2UI_ALLOWLISTED_COMPONENTS } from '../../../shared/copilot-contracts';
import {
  findSurfaceDefinition,
  type SurfaceCatalog,
  type SurfaceRefusalReason,
  type SurfaceRenderNode,
  type SurfaceRenderOutcome,
  type SurfaceRenderPlan,
} from '../../../shared/surface-contracts';

const ALLOWLISTED = new Set<string>(A2UI_ALLOWLISTED_COMPONENTS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function refuse(
  reason: SurfaceRefusalReason,
  message: string,
  detail?: Record<string, unknown>,
): SurfaceRenderOutcome {
  return detail === undefined
    ? { ok: false, reason, message }
    : { ok: false, reason, message, detail };
}

/** A frame of the iterative traversal. */
interface Frame {
  node: unknown;
  /** Ids of the ancestors on the current path (cycle detection by identity). */
  pathIds: readonly string[];
  /** Ancestor objects on the current path (cycle detection by reference). */
  pathObjects: readonly object[];
  depth: number;
  /** Key of the already rendered parent node (null for the root). */
  parentKey: string | null;
}

function readNodeId(node: Record<string, unknown>, fallback: string): string | null {
  const raw = node.id;
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.trim();
}

/**
 * Render a surface tree into a renderer plan.
 *
 * The traversal is iterative with an explicit stack: the depth of the stack is
 * bounded by the catalog limit, and the number of visited nodes is bounded by
 * the node budget. Both limits are checked BEFORE the node is expanded, so a
 * hostile payload can neither exhaust the stack nor the memory.
 */
export function renderSurfacePayload(
  payload: unknown,
  catalog: SurfaceCatalog | null,
): SurfaceRenderOutcome {
  if (!catalog) {
    return refuse(
      'SURFACE_CATALOG_UNAVAILABLE',
      'Katalog permukaan tidak dimuatkan; tiada permukaan boleh dirender.',
    );
  }
  if (!isPlainObject(payload)) {
    return refuse('SURFACE_PAYLOAD_INVALID', 'Payload permukaan mesti objek biasa.');
  }
  const schemaVersion = payload.schemaVersion;
  if (typeof schemaVersion !== 'string' || !schemaVersion.trim()) {
    return refuse('SURFACE_PAYLOAD_INVALID', 'Payload permukaan memerlukan schemaVersion.');
  }

  const stack: Frame[] = [
    { node: payload, pathIds: [], pathObjects: [], depth: 0, parentKey: null },
  ];
  const rendered = new Map<string, SurfaceRenderNode>();
  let nodeCount = 0;
  let maxDepthReached = 0;
  let rootKey: string | null = null;

  while (stack.length > 0) {
    const frame = stack.pop() as Frame;
    const node = frame.node;
    if (!isPlainObject(node)) {
      return refuse('SURFACE_PAYLOAD_INVALID', 'Setiap nod permukaan mesti objek biasa.');
    }

    // 1. Node budget — checked before anything is expanded.
    nodeCount += 1;
    if (nodeCount > catalog.limits.maxNodes) {
      return refuse(
        'SURFACE_NODE_LIMIT_EXCEEDED',
        `Payload permukaan melebihi had ${catalog.limits.maxNodes} nod.`,
        { maxNodes: catalog.limits.maxNodes },
      );
    }

    const surfaceId = node.surfaceId;
    if (typeof surfaceId !== 'string' || !surfaceId.trim()) {
      return refuse('SURFACE_PAYLOAD_INVALID', 'Setiap nod permukaan memerlukan surfaceId.');
    }
    const nodeId = readNodeId(node, surfaceId);
    if (!nodeId) {
      return refuse(
        'SURFACE_PAYLOAD_INVALID',
        `Nod permukaan '${surfaceId}' mempunyai id tidak sah.`,
      );
    }

    // 2. Cycle detection — an id (or an object) that already appears on the
    //    current path means the tree loops. Refuse BEFORE any depth check so a
    //    cyclic tree is always reported as a cycle, never as a depth problem.
    if (frame.pathIds.includes(nodeId)) {
      return refuse(
        'SURFACE_CYCLE_DETECTED',
        `Payload permukaan berkitar: nod '${nodeId}' berulang dalam laluan yang sama.`,
        { nodeId, path: [...frame.pathIds, nodeId] },
      );
    }
    if (frame.pathObjects.includes(node)) {
      return refuse(
        'SURFACE_CYCLE_DETECTED',
        `Payload permukaan berkitar: nod '${nodeId}' menunjuk kepada objek yang sama dalam laluannya.`,
        { nodeId },
      );
    }

    // 3. Catalog lookup.
    const definition = findSurfaceDefinition(catalog, surfaceId);
    if (!definition) {
      return refuse(
        'SURFACE_UNKNOWN_SURFACE_ID',
        `Permukaan '${surfaceId}' tiada dalam katalog versi ${catalog.catalogVersion}.`,
        { surfaceId, catalogVersion: catalog.catalogVersion },
      );
    }

    // 4. Renderer allow-list.
    if (!ALLOWLISTED.has(definition.component)) {
      return refuse(
        'SURFACE_COMPONENT_NOT_ALLOWLISTED',
        `Komponen '${definition.component}' tidak dibenarkan untuk dirender.`,
        { surfaceId, component: definition.component },
      );
    }

    // 5. Schema version of the payload must match the surface declaration.
    if (definition.schemaVersion !== schemaVersion) {
      return refuse(
        'SURFACE_SCHEMA_VERSION_MISMATCH',
        `Versi skema payload '${schemaVersion}' tidak sepadan dengan permukaan '${surfaceId}' (${definition.schemaVersion}).`,
        {
          surfaceId,
          payloadSchemaVersion: schemaVersion,
          surfaceSchemaVersion: definition.schemaVersion,
        },
      );
    }

    // 6. Depth limit (catalog limit AND per-surface limit).
    const allowedDepth = Math.min(catalog.limits.maxDepth, definition.maxDepth);
    if (frame.depth > allowedDepth) {
      return refuse(
        'SURFACE_DEPTH_EXCEEDED',
        `Payload permukaan melebihi had kedalaman ${allowedDepth} untuk permukaan '${surfaceId}'.`,
        { surfaceId, depth: frame.depth, allowedDepth },
      );
    }
    if (frame.depth > maxDepthReached) maxDepthReached = frame.depth;

    // 7. Node budget of the surface itself.
    if (nodeCount > definition.maxNodes) {
      return refuse(
        'SURFACE_NODE_LIMIT_EXCEEDED',
        `Payload permukaan melebihi had ${definition.maxNodes} nod untuk permukaan '${surfaceId}'.`,
        { surfaceId, maxNodes: definition.maxNodes },
      );
    }

    const props = node.props === undefined ? {} : node.props;
    if (!isPlainObject(props)) {
      return refuse('SURFACE_PAYLOAD_INVALID', `Props nod '${nodeId}' mesti objek biasa.`);
    }

    const key = `n${nodeCount}`;
    const renderedNode: SurfaceRenderNode = {
      id: nodeId,
      surfaceId,
      component: definition.component,
      props,
      children: [],
    };
    rendered.set(key, renderedNode);
    if (frame.parentKey === null) {
      rootKey = key;
    } else {
      rendered.get(frame.parentKey)?.children.push(renderedNode);
    }

    // 8. Expand children (bounded).
    const children = node.children;
    if (children !== undefined && children !== null) {
      if (!Array.isArray(children)) {
        return refuse('SURFACE_PAYLOAD_INVALID', `Anak nod '${nodeId}' mesti senarai.`);
      }
      if (nodeCount + children.length > catalog.limits.maxNodes) {
        return refuse(
          'SURFACE_NODE_LIMIT_EXCEEDED',
          `Payload permukaan melebihi had ${catalog.limits.maxNodes} nod.`,
          { maxNodes: catalog.limits.maxNodes },
        );
      }
      for (const child of children) {
        stack.push({
          node: child,
          pathIds: [...frame.pathIds, nodeId],
          pathObjects: [...frame.pathObjects, node],
          depth: frame.depth + 1,
          parentKey: key,
        });
      }
    }
  }

  if (!rootKey) {
    return refuse('SURFACE_PAYLOAD_INVALID', 'Payload permukaan tidak mengandungi nod.');
  }
  const rootNode = rendered.get(rootKey);
  if (!rootNode) {
    return refuse('SURFACE_PAYLOAD_INVALID', 'Payload permukaan tidak mengandungi nod.');
  }

  const plan: SurfaceRenderPlan = {
    catalogVersion: catalog.catalogVersion,
    schemaVersion,
    component: rootNode.component,
    root: rootNode,
    depth: maxDepthReached,
    nodeCount,
  };
  return { ok: true, plan };
}

/**
 * Extract a surface payload from an AG-UI event and render it.
 *
 * Supported carriers:
 *  - `TOOL_CALL_RESULT` — the tool result holds `{ surface: {...} }` or the
 *    surface payload itself;
 *  - `STATE_SNAPSHOT` / `STATE_DELTA` — the state holds `{ surface: {...} }`.
 */
export function renderAguiSurfaceEvent(
  event: unknown,
  catalog: SurfaceCatalog | null,
): SurfaceRenderOutcome {
  if (!isPlainObject(event)) {
    return refuse('SURFACE_PAYLOAD_INVALID', 'Event AG-UI mesti objek biasa.');
  }
  const type = event.type;
  if (typeof type !== 'string' || !type.trim()) {
    return refuse('SURFACE_PAYLOAD_INVALID', 'Event AG-UI memerlukan type.');
  }
  let carrier: unknown;
  if (type === 'TOOL_CALL_RESULT') {
    carrier = event.result ?? event.content ?? event.output;
  } else if (type === 'STATE_SNAPSHOT' || type === 'STATE_DELTA') {
    carrier = isPlainObject(event.snapshot) ? event.snapshot.surface : undefined;
  } else {
    return refuse(
      'SURFACE_PAYLOAD_INVALID',
      `Event AG-UI '${type}' tidak membawa payload permukaan.`,
      { eventType: type },
    );
  }
  if (isPlainObject(carrier) && 'surface' in carrier) {
    carrier = carrier.surface;
  }
  if (!isPlainObject(carrier)) {
    return refuse(
      'SURFACE_PAYLOAD_INVALID',
      `Event AG-UI '${type}' tidak membawa payload permukaan yang sah.`,
      { eventType: type },
    );
  }
  return renderSurfacePayload(carrier, catalog);
}
