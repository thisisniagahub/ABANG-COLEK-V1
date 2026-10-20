/**
 * AbangColek Sovereign GrowthOS — EXT-01 Local Inspector
 *
 * The inspector is a platform-local development instrument: it observes the
 * platform process that constructs it, so its implementation lives in
 * `server/platform/inspection/inspector.ts`. The platform layer is the base
 * layer of the server — modules may depend on it, but it must never depend on
 * a module — so keeping the implementation here is what keeps that direction
 * rule true.
 *
 * This module stays as the historical import path; every exported name keeps
 * the same class identity and the same behaviour.
 */

export * from '../../platform/inspection/inspector';
