/**
 * AbangColek Sovereign GrowthOS — CPK-02 AG-UI thread persistence (local half)
 *
 * The thread store reads and writes the platform store and re-verifies the
 * session through the platform's `Auth`, so it is platform persistence and its
 * implementation lives in `server/platform/aguiThreads.ts`. The platform
 * layer is the base layer of the server: modules may depend on it, but it
 * must never depend on a module.
 *
 * This module stays as the historical import path; every exported name keeps
 * the same class identity and the same behaviour.
 */

export * from '../../platform/aguiThreads';
