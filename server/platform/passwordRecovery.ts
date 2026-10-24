import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { DomainError, PlatformStore } from './store';
import type { Principal } from './auth';
import type {
  PasswordRecoveryRequestStatus,
  PasswordRecoveryEmailDeliveryStatus,
  PasswordRecoveryRequestView,
  PasswordRecoveryIssueCodeView,
  PasswordRecoveryRequestResponse,
  PasswordRecoveryResetResponse,
} from '../../shared/password-recovery-contracts';

const scryptAsync = promisify(scrypt);
const RECOVERY_KIND = 'password_recovery_requests';
const RECOVERY_TTL_MS = 15 * 60_000; // 15 minit
const MAX_ATTEMPTS = 5;

export interface PasswordRecoveryRecord {
  id: string;
  requestId: string;
  userId: string;
  userDisplayName: string;
  email: string;
  maskedEmail: string;
  status: PasswordRecoveryRequestStatus;
  credentialSalt: string;
  credentialHash: string;
  attempts: number;
  emailDeliveryStatus: PasswordRecoveryEmailDeliveryStatus;
  createdAt: string;
  expiresAt: string;
  revision: number;
}

/**
 * PC-02 — Perkhidmatan pemulihan kata laluan.
 *
 * Menyimpan rekod ke dalam store kanonikal bawah kind `password_recovery_requests`.
 * Kredensial sentiasa di-hash dengan salt — tiada plaintext disimpan sama sekali.
 */
export class PasswordRecoveryService {
  readonly store: PlatformStore;

  constructor(store: PlatformStore) {
    this.store = store;
  }

  /**
   * Buat permintaan pemulihan baharu. Diizinkan untuk email yang tidak dikenal
   * juga (prinsip anti-enumeration). Mengembalikan response yang sama sama ada
   * akaun wujud atau tidak.
   */
  requestRecovery(email: string): PasswordRecoveryRequestResponse {
    const normalizedEmail = email.trim().toLowerCase();
    const maskedEmail = this.maskEmail(normalizedEmail);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + RECOVERY_TTL_MS).toISOString();
    const credential = randomBytes(32).toString('hex');
    const credentialSalt = randomBytes(16).toString('hex');
    const credentialHash = this.hashCredential(credential, credentialSalt);

    const userRow = this.store.db
      .query<{ id: string; name: string }, [string]>('SELECT id, name FROM users WHERE email=?')
      .get(normalizedEmail);

    if (userRow) {
      const requestId = randomUUID();
      const record: PasswordRecoveryRecord = {
        id: requestId,
        requestId,
        userId: userRow.id,
        userDisplayName: userRow.name,
        email: normalizedEmail,
        maskedEmail,
        status: 'pending',
        credentialSalt,
        credentialHash,
        attempts: 0,
        emailDeliveryStatus: 'unavailable',
        createdAt: nowIso,
        expiresAt,
        revision: 1,
      };
      this.store.save(RECOVERY_KIND, record);
      this.store.audit(userRow.id, 'password_recovery.requested', requestId, 1);
    }

    return {
      accepted: true,
      message: 'Jika akaun wujud, kod pemulihan telah dihantar ke emel tersebut.',
    };
  }

  /** Validasi credential terhadap satu requestId dan kembalikan rekod jika sah. */
  validateCredential(
    requestId: string,
    credential: string
  ): { record: PasswordRecoveryRequestView; credentialValid: boolean } | null {
    const record = this.store.get<PasswordRecoveryRecord>(RECOVERY_KIND, requestId);
    if (!record) return null;

    if (Date.now() > new Date(record.expiresAt).getTime()) {
      const expired: PasswordRecoveryRecord = {
        ...record,
        status: 'expired',
        revision: (record.revision ?? 1) + 1,
      };
      this.store.save(RECOVERY_KIND, expired);
      return { record: this.toView(expired), credentialValid: false };
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      return { record: this.toView(record), credentialValid: false };
    }

    const credentialValid = this.verifyHash(credential, record.credentialSalt, record.credentialHash);
    if (!credentialValid) {
      const updated: PasswordRecoveryRecord = {
        ...record,
        attempts: record.attempts + 1,
        status: record.attempts + 1 >= MAX_ATTEMPTS ? 'expired' : record.status,
        revision: (record.revision ?? 1) + 1,
      };
      this.store.save(RECOVERY_KIND, updated);
      return { record: this.toView(updated), credentialValid: false };
    }

    const completed: PasswordRecoveryRecord = {
      ...record,
      status: 'completed',
      revision: (record.revision ?? 1) + 1,
    };
    this.store.save(RECOVERY_KIND, completed);
    return { record: this.toView(completed), credentialValid: true };
  }

  /** Senarai permintaan untuk founder (hanya founder yang dibenarkan). */
  listRequests(founderActor: Principal): PasswordRecoveryRequestView[] {
    this.requireFounder(founderActor);
    const all = this.store.all<PasswordRecoveryRecord>(RECOVERY_KIND);
    return all
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => this.toView(r));
  }

  /** Keluarkan kod pemulihan sekali guna oleh founder. */
  issueCode(
    requestId: string,
    founderActor: Principal,
    expectedRevision?: unknown
  ): PasswordRecoveryIssueCodeView {
    this.requireFounder(founderActor);

    const record = this.store.get<PasswordRecoveryRecord>(RECOVERY_KIND, requestId);
    if (!record) {
      throw new DomainError('NOT_FOUND', 404, 'Permintaan pemulihan tidak ditemui.');
    }
    if (expectedRevision !== undefined) {
      this.store.revision(record.revision ?? 1, expectedRevision);
    }
    if (record.status !== 'pending' && record.status !== 'code_issued') {
      throw new DomainError('INVALID_STATE', 409, 'Permintaan tidak dalam status yang boleh mengeluarkan kod.');
    }

    const newCredential = randomBytes(16).toString('hex');
    const newSalt = randomBytes(16).toString('hex');
    const newHash = this.hashCredential(newCredential, newSalt);
    const expiresAt = new Date(Date.now() + RECOVERY_TTL_MS).toISOString();

    const updatedRecord: PasswordRecoveryRecord = {
      ...record,
      status: 'code_issued',
      credentialSalt: newSalt,
      credentialHash: newHash,
      attempts: 0,
      expiresAt,
      revision: (record.revision ?? 1) + 1,
    };

    this.store.save(RECOVERY_KIND, updatedRecord);
    this.store.audit(founderActor.user.id, 'password_recovery.issue_code', record.id, updatedRecord.revision);

    return {
      credential: newCredential,
      expiresAt,
    };
  }

  /** Reset kata laluan menggunakan kod pemulihan yang dikeluarkan. */
  async resetPassword(credential: string, newPassword: string): Promise<PasswordRecoveryResetResponse> {
    if (typeof credential !== 'string' || credential.trim().length === 0) {
      throw new DomainError('INVALID_CREDENTIAL', 400, 'Kod pemulihan tidak sah.');
    }
    if (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) {
      throw new DomainError('PASSWORD_LENGTH', 400, 'Kata laluan mesti antara 12 hingga 128 aksara.');
    }

    const trimmedCredential = credential.trim();
    const allRecords = this.store.all<PasswordRecoveryRecord>(RECOVERY_KIND);
    const activeRecords = allRecords.filter(
      (r) => r.status === 'pending' || r.status === 'code_issued'
    );

    let matchingRecord: PasswordRecoveryRecord | undefined;
    for (const candidate of activeRecords) {
      if (this.verifyHash(trimmedCredential, candidate.credentialSalt, candidate.credentialHash)) {
        matchingRecord = candidate;
        break;
      }
    }

    if (!matchingRecord) {
      for (const candidate of activeRecords) {
        if (Date.now() <= new Date(candidate.expiresAt).getTime() && candidate.attempts < MAX_ATTEMPTS) {
          const nextAttempts = candidate.attempts + 1;
          this.store.save(RECOVERY_KIND, {
            ...candidate,
            attempts: nextAttempts,
            status: nextAttempts >= MAX_ATTEMPTS ? 'expired' : candidate.status,
            revision: (candidate.revision ?? 1) + 1,
          });
        }
      }
      throw new DomainError('INVALID_CREDENTIAL', 400, 'Kod pemulihan tidak sah atau telah tamat.');
    }

    if (Date.now() > new Date(matchingRecord.expiresAt).getTime()) {
      this.store.save(RECOVERY_KIND, {
        ...matchingRecord,
        status: 'expired',
        revision: (matchingRecord.revision ?? 1) + 1,
      });
      throw new DomainError('EXPIRED_CREDENTIAL', 400, 'Kod pemulihan telah tamat.');
    }

    if (matchingRecord.attempts >= MAX_ATTEMPTS) {
      throw new DomainError(
        'MAX_ATTEMPTS_EXCEEDED',
        400,
        'Terlalu banyak percubaan gagal. Permintaan telah tamat.'
      );
    }

    let userId = matchingRecord.userId;
    if (!userId) {
      const userRow = this.store.db
        .query<{ id: string }, [string]>('SELECT id FROM users WHERE email=?')
        .get(matchingRecord.email);
      if (userRow) userId = userRow.id;
    }

    if (!userId) {
      throw new DomainError('INVALID_CREDENTIAL', 400, 'Kod pemulihan tidak sah atau telah tamat.');
    }

    const newSalt = randomBytes(16).toString('hex');
    const digest = (await scryptAsync(newPassword, newSalt, 64)) as Buffer;
    const newPasswordHash = `scrypt:${newSalt}:${digest.toString('hex')}`;
    const targetRecord = matchingRecord;
    const targetUserId = userId;

    this.store.atomic(() => {
      this.store.db.query('UPDATE users SET password_hash=? WHERE id=?').run(newPasswordHash, targetUserId);
      this.store.db.query('UPDATE sessions SET revoked=1 WHERE user_id=?').run(targetUserId);
      const nextRevision = (targetRecord.revision ?? 1) + 1;
      this.store.save(RECOVERY_KIND, {
        ...targetRecord,
        status: 'completed',
        credentialHash: '',
        credentialSalt: '',
        revision: nextRevision,
      });
      this.store.audit(targetUserId, 'password.reset', targetRecord.id, nextRevision);
    });

    return { reset: true };
  }

  private toView(record: PasswordRecoveryRecord): PasswordRecoveryRequestView {
    return {
      id: record.id,
      requestId: record.requestId ?? record.id,
      maskedEmail: record.maskedEmail,
      userDisplayName: record.userDisplayName || 'Pengguna',
      status: record.status,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      emailDeliveryStatus: record.emailDeliveryStatus,
      revision: record.revision ?? 1,
    };
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const [local, domain] = parts;
    if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  private hashCredential(credential: string, salt: string): string {
    return createHash('sha256').update(`${credential}:${salt}`).digest('hex');
  }

  private verifyHash(credential: string, salt: string, expectedHex: string): boolean {
    if (!salt || !expectedHex) return false;
    const providedHex = this.hashCredential(credential, salt);
    const left = Buffer.from(providedHex, 'hex');
    const right = Buffer.from(expectedHex, 'hex');
    if (left.length !== right.length || left.length === 0) return false;
    return timingSafeEqual(left, right);
  }

  private requireFounder(actor: Principal) {
    const hasFounderRole = actor.memberships.some(
      (m) => m.role === 'founder' && m.status === 'active'
    );
    if (!hasFounderRole) {
      throw new DomainError('FORBIDDEN', 403, 'Akses tidak dibenarkan.');
    }
  }
}
