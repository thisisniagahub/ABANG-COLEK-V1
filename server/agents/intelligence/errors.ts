/**
 * AbangColek Sovereign GrowthOS — Intelligence layer errors
 *
 * The coded error type itself lives in `shared/intelligence-errors.ts` so the
 * platform layer (which must never import a server module) can throw the very
 * same class. This module stays as the historical import path for every
 * intelligence consumer.
 */

export { IntelligenceError, failIntelligence } from '../../../shared/intelligence-errors';
