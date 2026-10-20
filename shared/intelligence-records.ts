/**
 * AbangColek Sovereign GrowthOS — Canonical record kinds
 *
 * The canonical record kinds used by the learning pipeline, the AG-UI thread
 * store and the memory store. `skill_candidates` is deliberately the same kind
 * the ADV-28 reviewer (`review_skill_candidate`) already reads, so the pipeline
 * and the deterministic reviewer share one record space.
 *
 * Why this lives in `shared/`: the record space is a contract between the
 * platform (which owns the store) and the intelligence modules (which write
 * into it). `server/agents/intelligence/**` and `server/platform/**` may both
 * depend on it, and it depends on nothing.
 */

export const RECORD_KINDS = {
  learningEvidence: 'learning_evidence',
  learningInsight: 'learning_insights',
  skillCandidate: 'skill_candidates',
  skillEvaluation: 'skill_evaluations',
  publishedSkill: 'published_skills',
  skillDelivery: 'skill_deliveries',
  skillRollback: 'skill_rollbacks',
  aguiThread: 'agui_threads',
  aguiEvent: 'agui_events',
  userMemory: 'user_memories',
} as const;

export type RecordKind = (typeof RECORD_KINDS)[keyof typeof RECORD_KINDS];
