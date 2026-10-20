export type SocialPlatform = 'instagram' | 'facebook' | 'threads' | 'tiktok' | 'other';
export type IdentityStatus = 'OFFICIAL_FOUNDER' | 'OFFICIAL_BRAND' | 'RELATED_ENTITY' | 'HISTORICAL' | 'PERSONAL' | 'UNVERIFIED';
export type ContentFunnel = 'awareness' | 'trust' | 'conversion' | 'retention';
export type ContentPillar = 'product_proof' | 'customer_reaction' | 'humor' | 'founder' | 'event' | 'operations' | 'cross_brand' | 'other';
export type RightsStatus = 'unknown' | 'pending' | 'approved' | 'expired' | 'rejected';
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type OutcomeKind = 'enquiry' | 'order' | 'dealer_lead' | 'event_lead' | 'complaint' | 'praise';

export interface SocialIdentityRecord {
  id: string; platform: SocialPlatform; handle: string; url: string; displayName: string;
  ownerEntity: string; relatedEntities: string[]; status: IdentityStatus; confidence: 'unknown' | 'low' | 'medium' | 'high';
  followers?: number; publicViews?: number; linkDestinations: string[]; rightsNotes?: string;
  lastVerifiedAt: string; revision: number; createdAt: string;
}

export interface FounderContentRecord {
  id: string; identityId: string; sourceUrl: string; mediaType: 'post' | 'reel' | 'video' | 'reply' | 'story' | 'other';
  caption?: string; hook?: string; entityId?: string; productIds: string[]; eventId?: string;
  pillar: ContentPillar; funnel: ContentFunnel; cta?: string; rightsStatus: RightsStatus; approvalStatus: ApprovalStatus;
  publishedAt?: string; repurposeStatus: 'none' | 'candidate' | 'approved' | 'exported';
  metrics: { views: number; likes: number; comments: number; shares: number; saves: number; capturedAt: string };
  revision: number; createdAt: string;
}

export interface FounderEventRecord {
  id: string; title: string; location: string; startsAt: string; endsAt: string; status: 'planned' | 'active' | 'completed' | 'cancelled';
  contentIds: string[]; orderIds: string[]; leadCount: number; attendance?: number; notes?: string; revision: number; createdAt: string;
}

export interface ContentOutcomeRecord {
  id: string; contentId: string; kind: OutcomeKind; orderId?: string; eventId?: string; quantity: number; note?: string; recordedAt: string;
}

export interface FounderAnalyticsSummary {
  generatedAt: string; contentCount: number; approvedContentCount: number; totalViews: number; totalEngagements: number;
  byFunnel: Record<ContentFunnel, { contentCount: number; views: number; engagements: number; outcomes: number }>;
  byPillar: Record<ContentPillar, { contentCount: number; views: number; outcomes: number }>;
  linkedOrders: number; linkedEvents: number; unknownRightsCount: number;
}

/* ------------------------------------------------------------------------- *
 * CPK-03 / ADV-28 — Learning pipeline (evidence -> insight -> candidate ->
 * evaluation -> human publish -> version-pinned delivery -> rollback).
 *
 * Every record below is a durable, auditable artefact. Nothing in this file
 * describes a cloud service that is not configured: the live/intelligence
 * halves are represented by `IntelligenceAvailability` with an explicit
 * blocking reason.
 * ------------------------------------------------------------------------- */

/** Where a record physically lives. Never overclaimed. */
export type IntelligencePersistence = 'in_memory' | 'file' | 'platform_store' | 'local_storage';

/** Whether a subsystem talks to a local process or a remote service. */
export type IntelligenceLocality = 'local' | 'remote';

/**
 * The availability of a capability that depends on an account, credential,
 * eligibility, privacy consent or a paid plan. A capability is either
 * `available` (and then it must have been observed) or `unavailable` with the
 * exact blocking reason.
 */
export interface IntelligenceAvailability {
  available: boolean;
  locality: IntelligenceLocality;
  /** Machine code of the blocking reason, e.g. `INTELLIGENCE_ACCOUNT_REQUIRED`. */
  reasonCode: string;
  /** Human readable explanation, in the operator's language. */
  reason: string;
  persistence: IntelligencePersistence;
}

/** A canonical source record that motivated a learning artefact. */
export interface LearningSourceRef {
  /** Canonical record id (e.g. an order id or a JEV assessment id). */
  recordId: string;
  /** The record kind inside the platform store, e.g. `orders`. */
  recordKind: string;
  /** The revision of the source record that was read. */
  revision: number;
}

/** Stage 1 — evidence captured from a completed, redacted workflow. */
export interface LearningEvidenceRecord {
  id: string;
  tenantId: string;
  /** Who contributed the evidence. */
  contributedBy: string;
  /** Grouping key; insights are derived per pattern key. */
  patternKey: string;
  /** Short, redacted summary. Never raw customer content. */
  summary: string;
  /** The canonical records this evidence was derived from. */
  sources: LearningSourceRef[];
  /** How many observations back this piece of evidence. */
  observations: number;
  status: 'recorded' | 'rejected';
  createdAt: string;
  revision: number;
}

/** Stage 2 — an insight derived from at least two pieces of evidence. */
export interface LearningInsightRecord {
  id: string;
  tenantId: string;
  patternKey: string;
  title: string;
  /** The behaviour proposed by the insight. */
  pattern: string;
  evidenceIds: string[];
  supportingCount: number;
  /** Deterministic confidence in [0,1] derived from the supporting count. */
  confidence: number;
  status: 'open' | 'promoted' | 'discarded';
  createdAt: string;
  revision: number;
}

/**
 * A single deterministic rule of a skill candidate. `emit` is what the skill
 * produces when the rule matches, so the candidate can really be executed by
 * the evaluation instead of only described.
 */
export interface SkillBehaviourRule {
  id: string;
  /** All `contains` tokens must be present (case-insensitive) for a match. */
  contains?: string[];
  /** A regular expression that must match for a rule to apply. */
  matches?: string;
  /** The tokens the skill emits when the rule applies. */
  emit: string[];
}

/** One held-out evaluation case. */
export interface SkillEvaluationCase {
  id: string;
  /** The input the skill is executed against. */
  input: string;
  /** Tokens that must all be present in the produced response. */
  expectContainsAll: string[];
  /** At least one of these tokens must be present in the produced response. */
  expectContainsAny: string[];
  /** Tokens that must NOT be present in the produced response. */
  expectNotContains: string[];
}

/** Stage 3 — a proposed, versioned, reviewable skill candidate. */
export interface SkillCandidateRecord {
  id: string;
  tenantId: string;
  /**
   * The lineage this candidate belongs to. A new candidate created with the
   * same lineage continues the lineage and takes the next published version.
   */
  lineageId: string;
  title: string;
  /** Human readable behaviour description; this is what the reviewer reads. */
  body: string;
  kind: string;
  /** Candidate version inside its lineage. */
  version: number;
  insightIds: string[];
  evidenceIds: string[];
  /** The evidence that motivated the candidate, with source revisions. */
  sourceRefs: LearningSourceRef[];
  /** The executable behaviour of the candidate. */
  behaviour: SkillBehaviourRule[];
  /** Runtime / API versions this candidate is compatible with. */
  compatibility: SkillCompatibility;
  status:
    | 'draft'
    | 'evaluation_passed'
    | 'evaluation_failed'
    | 'publish_requested'
    | 'published'
    | 'rolled_back'
    | 'rejected';
  /** The deterministic reviewer result (ADV-28 rule set). */
  review?: SkillReviewResult;
  evaluationId?: string;
  publishedSkillId?: string;
  createdBy: string;
  createdAt: string;
  revision: number;
}

/** Version pin of a skill: which runtime/API versions it may be delivered to. */
export interface SkillCompatibility {
  runtimeApiVersions: string[];
  platformApiVersions: string[];
}

/** The deterministic reviewer result (ADV-28 `review_skill_candidate`). */
export interface SkillReviewResult {
  reviewer: string;
  decision: 'promote' | 'revise' | 'reject';
  checks: Array<{ check: string; passed: boolean; detail: string }>;
  failedCheckCount: number;
  reviewedAt: string;
  /** The tool that produced the result, for audit. */
  source: 'adv-28-review_skill_candidate';
}

/** Stage 4 — the result of really running the candidate against held-out cases. */
export interface SkillEvaluationRecord {
  id: string;
  candidateId: string;
  candidateVersion: number;
  cases: SkillEvaluationCase[];
  results: Array<{ caseId: string; passed: boolean; produced: string; detail: string }>;
  passed: boolean;
  passRate: number;
  rubric: string;
  evaluatedBy: string;
  evaluatedAt: string;
}

/** Stage 5 — a published, version-pinned, human-approved skill version. */
export interface PublishedSkillRecord {
  id: string;
  tenantId: string;
  candidateId: string;
  /** The lineage the version belongs to. */
  lineageId: string;
  /** Monotonic version inside the candidate lineage. */
  version: number;
  title: string;
  body: string;
  kind: string;
  behaviour: SkillBehaviourRule[];
  evidenceIds: string[];
  evaluationId: string;
  review: SkillReviewResult;
  compatibility: SkillCompatibility;
  /** The human reviewer who published this version. */
  publishedBy: string;
  publishedAt: string;
  /** The human-in-the-loop approval that authorised the publish. */
  approvalId: string;
  status: 'active' | 'rolled_back' | 'superseded';
  supersededBy?: string;
  rolledBackAt?: string;
  rolledBackBy?: string;
  /** The version this one was rolled back to, when applicable. */
  rolledBackTo?: string;
}

/** Stage 6 — a version-pinned delivery of a published skill. */
export interface SkillDeliveryRecord {
  id: string;
  skillId: string;
  candidateId: string;
  version: number;
  runtimeApiVersion: string;
  platformApiVersion: string;
  deliveredAt: string;
  deliveredTo: string;
}

/** A recorded rollback event. */
export interface SkillRollbackRecord {
  id: string;
  fromSkillId: string;
  toSkillId: string | null;
  candidateId: string;
  /** The lineage the rollback belongs to. */
  lineageId: string;
  reason: string;
  rolledBackBy: string;
  rolledBackAt: string;
}

/* ------------------------------------------------------------------------- *
 * CPK-02 — AG-UI thread persistence (local half).
 * ------------------------------------------------------------------------- */

/** One persisted AG-UI event inside a thread. */
export interface AguiThreadEvent {
  /** Canonical event id, monotonic inside the thread. */
  id: string;
  threadId: string;
  /** Monotonic sequence number, gapless. */
  sequence: number;
  /** The AG-UI event type, e.g. `RUN_STARTED`. */
  type: string;
  /** The AG-UI payload as emitted by the protocol. */
  event: Record<string, unknown>;
  /** True when the event carries a state-changing side effect (a receipt). */
  stateChanging: boolean;
  /** The receipt id when `stateChanging` is true. */
  receiptId?: string;
  createdAt: string;
}

/** A persisted AG-UI thread. */
export interface AguiThreadRecord {
  id: string;
  tenantId: string;
  ownerId: string;
  /** The last event id written to the thread. */
  lastEventId: string | null;
  /** Total number of events persisted for the thread. */
  eventCount: number;
  /** Ids of the state-changing receipts produced by the thread. */
  receiptIds: string[];
  createdAt: string;
  updatedAt: string;
  revision: number;
}

/** The result of a resume request. */
export interface AguiResumeResult {
  threadId: string;
  /** Events the client did not have yet, in order, without gaps. */
  events: AguiThreadEvent[];
  /** The last event id of the thread after the replay. */
  lastEventId: string | null;
  /** The number of state-changing receipts in the thread. */
  receiptCount: number;
  /** True when the client was already up to date. */
  caughtUp: boolean;
}

/* ------------------------------------------------------------------------- *
 * EXT-02 — User memories (local gated path).
 * ------------------------------------------------------------------------- */

/** Where a memory came from. A memory without provenance is never created. */
export interface MemoryProvenance {
  source: 'explicit_user_statement' | 'copilot_run' | 'workspace_setting' | 'import';
  /** The run/thread the memory came from, when applicable. */
  runId?: string;
  threadId?: string;
  /** The exact text fragment the memory was derived from (already redacted). */
  excerpt?: string;
  recordedAt: string;
}

/** The permission a user granted for a memory. */
export type MemoryPermission = 'session' | 'persistent';

/** A user preference memory. Never sensitive, never financial authority. */
export interface UserMemoryRecord {
  id: string;
  userId: string;
  tenantId: string;
  /** The preference key, e.g. `ui.language`. */
  key: string;
  /** The preference value. */
  value: string;
  provenance: MemoryProvenance;
  permission: MemoryPermission;
  /** ISO instant after which the memory may not be used. */
  expiresAt: string;
  createdAt: string;
  deletedAt?: string;
}

/* ------------------------------------------------------------------------- *
 * EXT-04 — Channel adapters (surface only; live delivery externally gated).
 * ------------------------------------------------------------------------- */

/** A message travelling through a channel adapter. */
export interface ChannelMessage {
  id: string;
  channel: string;
  /** The channel-native thread/conversation id. */
  conversationId: string;
  /** The platform thread this message maps to. */
  threadId: string;
  authorId: string;
  text: string;
  /** Whether the message was produced by a human or by the agent. */
  direction: 'inbound' | 'outbound';
  sentAt: string;
}

/** The result of an adapter operation. */
export type ChannelResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; reason: string };

/* ------------------------------------------------------------------------- *
 * EXT-07 — Attachment references.
 * ------------------------------------------------------------------------- */

/** A reference to an uploaded evidence file that an agent request may carry. */
export interface AttachmentReference {
  evidenceId: string;
  entityId: string;
  name: string;
  mimeType: string;
  size: number;
  /** SHA-256 of the file bytes, so the reference is verifiable. */
  sha256: string;
  visibility: 'private' | 'case';
  /** Whether the current actor may reference the file. */
  permitted: boolean;
  /** Whether the file has been revoked (a revoked file may not be referenced). */
  revoked: boolean;
  /** Why the reference is refused, when it is refused. */
  refusalCode?: string;
  /**
   * Whether the attachment can be interpreted by a qualified vision model
   * for this run. An upload alone is never proof of vision: this is `true`
   * only when a live-verified vision model is actually configured and
   * reachable, and the inference itself still has to run against the real
   * bytes. `reasonCode` is always machine-readable — `VISION_MODEL_CONFIGURED`
   * when available, the exact blocking reason (e.g.
   * `QUALIFIED_VISION_MODEL_REQUIRED`) when not.
   */
  vision: { available: boolean; reasonCode: string; reason: string };
}
