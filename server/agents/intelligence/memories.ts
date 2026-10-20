/**
 * AbangColek Sovereign GrowthOS — EXT-02 User Memories (local gated path)
 *
 * A preference store that always records where a memory came from, what
 * permission it was granted under, how long it is retained and how it is
 * deleted.
 *
 * Guard rails:
 *  - Ingestion is OFF by default: the store refuses to record anything until
 *    the user has given explicit consent (`setConsent`).
 *  - A memory may never be created from a sensitive field (role, price, money,
 *    token, credentials, identity documents, contact details).
 *  - Every memory is scoped to one user and can be deleted per user.
 *  - Expired memories are never returned.
 *
 * Persistence mode: `platform_store`. Locality: `local`.
 * The hosted CopilotKit Intelligence "User Memories" feature remains
 * externally gated — see `availability.ts`.
 */

import { randomUUID } from 'node:crypto';
import type { PlatformStore } from '../../platform/store';
import { failIntelligence } from './errors';
import { RECORD_KINDS } from './records';
import { resolveTenantId } from './tenancy';
import type {
  MemoryPermission,
  MemoryProvenance,
  UserMemoryRecord,
} from '../../../shared/founder-intelligence-contracts';
import type { Principal } from '../../platform/auth';

export interface MemoryStoreOptions {
  store: PlatformStore;
  clock?: () => string;
  /** Default retention in days. */
  retentionDays?: number;
}

export interface RecordMemoryInput {
  key: string;
  value: string;
  provenance: MemoryProvenance;
  permission?: MemoryPermission;
  /** Retention in days; falls back to the store default. */
  retentionDays?: number;
}

/**
 * Field patterns that may never become a memory. A memory is a *preference*
 * (language, display choice), never an authority, a price or a secret.
 */
export const SENSITIVE_MEMORY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'ROLE_OR_AUTHORITY', pattern: /(role|admin|administrator|founder|owner|authoris|authoriz|permission|access|kebrar)\w*/i },
  { label: 'FINANCIAL', pattern: /(price|pricing|harga|money|wang|sen|rmr|amount|balance|balans|credit|debit|commission|komisen|invoice|invois|payment|bayaran|discount|diskaun|margin|salary|gaji|tax|cukai|account|akaun|bank)\w*/i },
  { label: 'SECRET', pattern: /(password|passwd|secret|token|api[_-]?key|credential|private[_-]?key|session|cookie|csrf)\w*/i },
  { label: 'IDENTITY', pattern: /(ic[_-]?number|ic[_-]?no|identity|national|passport|ktp|ssm[_-]?no|phone|telefon|email|emel|address|alamat|contact)\w*/i },
  { label: 'RECORD_REFERENCE', pattern: /(order[_-]?id|transaction[_-]?id|receipt[_-]?id|invoice[_-]?id|customer[_-]?id|dealer[_-]?id|ledger[_-]?id)\w*/i },
];

/** True when the key or the value looks sensitive. */
export function isSensitiveMemoryField(key: string, value: string): boolean {
  return SENSITIVE_MEMORY_PATTERNS.some(
    (rule) => rule.pattern.test(key) || rule.pattern.test(value),
  );
}

export class UserMemoryStore {
  private consentEnabled = false;

  constructor(private readonly options: MemoryStoreOptions) {}

  private now(): string {
    return this.options.clock ? this.options.clock() : new Date().toISOString();
  }

  /** Ingestion is off until the user consents explicitly. */
  setConsent(enabled: boolean, grantedBy: string): void {
    this.consentEnabled = enabled;
    this.options.store.audit(grantedBy, 'memory.consent', enabled ? 'granted' : 'revoked', 1);
  }

  hasConsent(): boolean {
    return this.consentEnabled;
  }

  record(actor: Principal, input: RecordMemoryInput): UserMemoryRecord {
    if (!this.consentEnabled) {
      failIntelligence(
        'MEMORY_CONSENT_REQUIRED',
        'Peng ingestingan memori dimatikan secara lalai; pengguna mesti beri persetujuan dahulu.',
      );
    }
    if (!input.key || !input.value) {
      failIntelligence('MEMORY_FIELD_REQUIRED', 'Memori memerlukan kunci dan nilai.');
    }
    if (!input.provenance || !input.provenance.source) {
      failIntelligence('MEMORY_PROVENANCE_REQUIRED', 'Setiap memori mesti merekodkan dari mana ia datang.');
    }
    if (isSensitiveMemoryField(input.key, input.value)) {
      failIntelligence(
        'MEMORY_SENSITIVE_FIELD_REFUSED',
        'Medan sensitif tidak boleh disimpan sebagai memori pengguna.',
      );
    }
    const retentionDays = Math.max(1, Math.trunc(input.retentionDays ?? this.options.retentionDays ?? 30));
    const createdAt = this.now();
    const record: UserMemoryRecord = {
      id: randomUUID(),
      userId: actor.user.id,
      tenantId: resolveTenantId(actor),
      key: input.key,
      value: input.value,
      provenance: { ...input.provenance },
      permission: input.permission ?? 'persistent',
      expiresAt: new Date(Date.parse(createdAt) + retentionDays * 86_400_000).toISOString(),
      createdAt,
    };
    this.options.store.save(RECORD_KINDS.userMemory, record);
    this.options.store.audit(actor.user.id, 'memory.record', record.id, 1);
    return record;
  }

  /** The live (non-expired, non-deleted) memories of a user. */
  list(actor: Principal): UserMemoryRecord[] {
    const at = this.now();
    return this.options.store
      .all<UserMemoryRecord>(RECORD_KINDS.userMemory)
      .filter(
        (record) =>
          record.userId === actor.user.id &&
          !record.deletedAt &&
          Date.parse(record.expiresAt) > Date.parse(at),
      );
  }

  get(id: string): UserMemoryRecord | null {
    return this.options.store.get<UserMemoryRecord>(RECORD_KINDS.userMemory, id);
  }

  /** Deletes one memory owned by the user. */
  delete(actor: Principal, memoryId: string): UserMemoryRecord {
    const record = this.get(memoryId);
    if (!record) failIntelligence('MEMORY_NOT_FOUND', 'Memori tidak ditemui.');
    if (record.userId !== actor.user.id) {
      failIntelligence('MEMORY_NOT_OWNED', 'Memori ini milik pengguna lain.');
    }
    const deleted = { ...record, deletedAt: this.now() };
    this.options.store.save(RECORD_KINDS.userMemory, deleted);
    this.options.store.audit(actor.user.id, 'memory.delete', deleted.id, 1);
    return deleted;
  }

  /** Deletes every memory of a user. Returns how many were deleted. */
  deleteAll(actor: Principal): number {
    const owned = this.options.store
      .all<UserMemoryRecord>(RECORD_KINDS.userMemory)
      .filter((record) => record.userId === actor.user.id && !record.deletedAt);
    const at = this.now();
    for (const record of owned) {
      this.options.store.save(RECORD_KINDS.userMemory, { ...record, deletedAt: at });
    }
    this.options.store.audit(actor.user.id, 'memory.delete_all', actor.user.id, owned.length);
    return owned.length;
  }
}
