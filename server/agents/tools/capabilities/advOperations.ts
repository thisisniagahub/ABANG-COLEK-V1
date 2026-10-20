/**
 * ABANGCOLEK — ADV-20 / ADV-23 / ADV-24 Server-owned controls
 *
 *   ADV-20  export quota (server-owned, per actor per local business day) and
 *           re-authorisation of an export at DOWNLOAD time — the authority to
 *           download is re-verified against live state, never inherited from
 *           the moment of creation.
 *   ADV-23  outbound-send consent. The server never invents consent: a send is
 *           only allowed when a canonical consent record exists and is valid.
 *   ADV-24  capability grants. A step may only be offered when the actor holds
 *           the grant, not merely when a capability id matches.
 */

import { createHash } from 'node:crypto';
import type { PlatformStore } from '../../../platform/store';
import { localDay } from '../records';
import type { ScopedActor } from '../scope';
import {
  EXPORT_QUOTA_PER_ACTOR_PER_DAY,
  type CapabilityGrantRecord,
  type ExportArtifactRecord,
  type ExportDownloadAuthorization,
  type ExportQuotaDecision,
  type GrantDecision,
  type OutboundChannel,
  type OutboundConsentDecision,
  type OutboundConsentRecord,
} from '../../../../shared/adv-contracts';

/** Asia/Kuala_Lumpur is a fixed UTC+08:00 offset (no daylight saving). */
const KUALA_LUMPUR_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Start of the local business day that contains `at`, in ISO. */
export function localDayStart(at: string): number {
  return Date.parse(`${localDay(at)}T00:00:00.000Z`) - KUALA_LUMPUR_OFFSET_MS;
}

/** ISO instant the current local business day ends (quota window reset). */
export function localDayReset(at: string): string {
  return new Date(localDayStart(at) + 86_400_000 + KUALA_LUMPUR_OFFSET_MS).toISOString();
}

/**
 * ADV-20 — how many exports the actor already created in the current local
 * business day. Server-owned: the browser can neither raise nor reset it.
 */
export function countExportsForActor(store: PlatformStore, actorId: string, at: string): number {
  const day = localDay(at);
  return store
    .all<ExportArtifactRecord>('report_artifacts')
    .filter(
      (artifact) => artifact.ownerId === actorId && localDay(artifact.createdAt) === day,
    ).length;
}

/** ADV-20 — server-owned export quota decision. */
export function checkExportQuota(
  store: PlatformStore,
  actorId: string,
  at: string,
): ExportQuotaDecision {
  const used = countExportsForActor(store, actorId, at);
  const limit = EXPORT_QUOTA_PER_ACTOR_PER_DAY;
  return {
    allowed: used < limit,
    code: used < limit ? null : 'EXPORT_QUOTA_EXCEEDED',
    used,
    limit,
    resetsAt: localDayReset(at),
  };
}

/**
 * ADV-20 — re-authorisation at download time.
 *
 * The actor's live authority, the artifact ownership, the download grant window
 * and the content integrity are all re-checked here. An artifact created while
 * the actor was a founder does not grant a download after the authority is
 * gone, and never after the grant window closed.
 */
export function authorizeExportDownload(options: {
  store: PlatformStore;
  actor: ScopedActor;
  artifact: ExportArtifactRecord | null;
  kind: string | undefined;
  at: string;
}): ExportDownloadAuthorization {
  const { actor, artifact, kind, at } = options;
  if (!artifact) {
    return {
      allowed: false,
      code: 'EXPORT_ARTIFACT_NOT_FOUND',
      detail: 'Artifak laporan tidak ditemui dalam storan platform.',
    };
  }
  // Live authority is re-verified at download time (session-derived only).
  if (!actor.isFounder) {
    return {
      allowed: false,
      code: 'EXPORT_DOWNLOAD_NOT_ALLOWED',
      detail: 'Muat turun laporan memerlukan peranan founder yang masih aktif.',
    };
  }
  if (artifact.ownerId !== actor.principal.user.id) {
    return {
      allowed: false,
      code: 'EXPORT_ARTIFACT_FORBIDDEN',
      detail: 'Artifak laporan ini milik aktor lain.',
    };
  }
  if (kind !== undefined && kind !== artifact.kind) {
    return {
      allowed: false,
      code: 'EXPORT_ARTIFACT_KIND_MISMATCH',
      detail: `Jenis laporan diminta (${kind}) berbeza daripada artifak (${artifact.kind}).`,
    };
  }
  if (!artifact.downloadExpiresAt || artifact.downloadExpiresAt <= at) {
    return {
      allowed: false,
      code: 'EXPORT_GRANT_EXPIRED',
      detail: `Kebenaran muat turun tamat tempoh pada ${artifact.downloadExpiresAt ?? '(tiada grant)'}.`,
    };
  }
  const hash = createHash('sha256').update(artifact.content).digest('hex');
  if (hash !== artifact.contentHash) {
    return {
      allowed: false,
      code: 'EXPORT_ARTIFACT_CONTENT_MISMATCH',
      detail: 'Hash kandungan artifak tidak sepadan dengan hash yang direkodkan.',
    };
  }
  return { allowed: true, code: null, detail: 'Kebenaran muat turun disahkan.' };
}

/**
 * ADV-23 — resolves the canonical outbound consent of a customer.
 *
 * The consent record is the only source of truth. When it is missing the
 * decision is `unrecorded` and any send is refused.
 */
export function resolveOutboundConsent(
  store: PlatformStore,
  customerId: string,
  channel: OutboundChannel,
  at: string,
): OutboundConsentDecision {
  const records = store
    .all<OutboundConsentRecord>('outbound_consents')
    .filter((entry) => entry.customerId === customerId && entry.channel === channel)
    .sort((left, right) => right.grantedAt.localeCompare(left.grantedAt));
  const record = records[0];
  if (!record) {
    return {
      granted: false,
      status: 'unrecorded',
      code: 'OUTBOUND_CONSENT_UNRECORDED',
      channel,
      consentId: null,
      detail: `Tiada rekod kebenaran hantar keluar untuk pelanggan ${customerId}.`,
    };
  }
  if (record.status === 'revoked') {
    return {
      granted: false,
      status: 'revoked',
      code: 'OUTBOUND_CONSENT_REVOKED',
      channel,
      consentId: record.id,
      detail: `Kebenaran hantar keluar telah dicabut (${record.id}).`,
    };
  }
  if (record.expiresAt && record.expiresAt <= at) {
    return {
      granted: false,
      status: 'expired',
      code: 'OUTBOUND_CONSENT_EXPIRED',
      channel,
      consentId: record.id,
      detail: `Kebenaran hantar keluar telah luput tempoh (${record.expiresAt}).`,
    };
  }
  return {
    granted: true,
    status: 'granted',
    code: 'OUTBOUND_CONSENT_GRANTED',
    channel,
    consentId: record.id,
    detail: `Kebenaran hantar keluar sah (${record.id}).`,
  };
}

export interface GrantScopeContext {
  entityId?: string | null;
  outletId?: string | null;
}

/**
 * ADV-24 — resolves whether the actor really holds the grant for a capability.
 *
 * The founder is the root authority of the business and therefore holds every
 * grant implicitly. Every other actor needs an explicit, live, in-scope
 * `capability_grants` record.
 */
export function resolveCapabilityGrant(
  store: PlatformStore,
  actor: ScopedActor,
  capabilityId: string,
  scope: GrantScopeContext,
  at: string,
): GrantDecision {
  if (actor.isFounder) {
    return {
      held: true,
      code: 'GRANT_FOUNDER_ROOT_AUTHORITY',
      capabilityId,
      grantId: null,
      scope: '*',
      detail: 'Founder memegang kebenaran akar untuk semua keupayaan.',
    };
  }
  const grants = store
    .all<CapabilityGrantRecord>('capability_grants')
    .filter(
      (grant) => grant.userId === actor.principal.user.id && grant.capabilityId === capabilityId,
    )
    .sort((left, right) => right.grantedAt.localeCompare(left.grantedAt));
  const grant = grants[0];
  if (!grant) {
    return {
      held: false,
      code: 'GRANT_NOT_HELD',
      capabilityId,
      grantId: null,
      scope: null,
      detail: `Pemeran tidak memegang kebenaran untuk ${capabilityId}.`,
    };
  }
  if (grant.status === 'revoked') {
    return {
      held: false,
      code: 'GRANT_REVOKED',
      capabilityId,
      grantId: grant.id,
      scope: grant.scope,
      detail: `Kebenaran ${capabilityId} telah dicabut.`,
    };
  }
  if (grant.expiresAt && grant.expiresAt <= at) {
    return {
      held: false,
      code: 'GRANT_EXPIRED',
      capabilityId,
      grantId: grant.id,
      scope: grant.scope,
      detail: `Kebenaran ${capabilityId} telah luput tempoh.`,
    };
  }
  if (!grantCoversScope(grant.scope, scope)) {
    return {
      held: false,
      code: 'GRANT_SCOPE_MISMATCH',
      capabilityId,
      grantId: grant.id,
      scope: grant.scope,
      detail: `Skop kebenaran ${grant.scope} tidak meliputi entiti ini.`,
    };
  }
  return {
    held: true,
    code: 'GRANT_HELD',
    capabilityId,
    grantId: grant.id,
    scope: grant.scope,
    detail: `Kebenaran ${capabilityId} dipegang (${grant.id}).`,
  };
}

/** Does the grant scope cover the entity the step would act on? */
function grantCoversScope(grantScope: string, scope: GrantScopeContext): boolean {
  if (grantScope === '*') return true;
  const separator = grantScope.indexOf(':');
  if (separator < 0) return false;
  const kind = grantScope.slice(0, separator);
  const value = grantScope.slice(separator + 1);
  if (kind === 'outlet') return Boolean(scope.outletId) && scope.outletId === value;
  if (kind === 'entity' || kind === 'case' || kind === 'order') {
    return Boolean(scope.entityId) && scope.entityId === value;
  }
  return false;
}
