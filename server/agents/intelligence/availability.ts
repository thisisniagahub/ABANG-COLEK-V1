/**
 * AbangColek Sovereign GrowthOS — Honest availability of the intelligence layer
 *
 * The probe itself is pure and lives in `shared/intelligence-availability.ts`
 * because several server entry points answer it identically and it must not
 * drag a server module into the platform layer. This module stays as the
 * historical import path.
 */

export * from '../../../shared/intelligence-availability';
