import { Auth } from '../auth';
import type { Principal } from '../auth';
import { fail, fields, id, now, object, text, PlatformStore } from '../store';
import {
  RISK_APPEAL_TRANSITIONS,
  type RiskAppeal,
  type RiskAppealEvent,
  type RiskAppealState,
} from '../../../shared/risk-contracts';
import { RISK_DECISION_KIND, type RiskDecisionRecord } from './engine';

export const RISK_APPEAL_KIND = 'risk_appeals';

export type RiskAppealAction = 'start' | 'approve' | 'reject';

const ACTION_TARGET: Readonly<Record<RiskAppealAction, RiskAppealState>> = {
  start: 'under_review',
  approve: 'approved',
  reject: 'rejected',
};

/**
 * REF-01 — Laluan appeal.
 *
 * Appeal ialah REKOD server-owned: ia mempunyai sebab, pelaku, dan state
 * machine (`submitted → under_review → approved|rejected`, serta `withdrawn`
 * daripada `submitted`). Setiap peralihan direkodkan sebagai event dan
 * diaudit, jadi appeal boleh dijejak sepenuhnya — ia bukan baris log.
 */
export class RiskAppeals {
  constructor(
    readonly store: PlatformStore,
    readonly auth: Auth,
  ) {}

  private decision(decisionId: string): RiskDecisionRecord {
    return (
      this.store.get<RiskDecisionRecord>(RISK_DECISION_KIND, decisionId) ??
      fail('NOT_FOUND', 404, 'Keputusan risk tidak ditemui.')
    );
  }

  private transition(
    appeal: RiskAppeal,
    target: RiskAppealState,
    actor: Principal,
    note?: string,
  ): RiskAppeal {
    const allowed = RISK_APPEAL_TRANSITIONS[appeal.state];
    if (!allowed.includes(target)) {
      fail(
        'INVALID_APPEAL_TRANSITION',
        409,
        `Appeal tidak boleh bertukar daripada ${appeal.state} kepada ${target}.`,
      );
    }
    const event: RiskAppealEvent = {
      from: appeal.state,
      to: target,
      at: now(),
      actorId: actor.user.id,
      ...(note === undefined ? {} : { note }),
    };
    const updated: RiskAppeal = {
      ...appeal,
      state: target,
      updatedAt: event.at,
      revision: appeal.revision + 1,
      events: [...appeal.events, event],
    };
    this.store.save(RISK_APPEAL_KIND, updated);
    this.store.audit(actor.user.id, `risk.appeal.${target}`, updated.id, updated.revision);
    return updated;
  }

  /** Menappeal keputusan risk. Pelaku mesti subjek keputusan (atau pengasas). */
  submit(actor: Principal, raw: unknown): RiskAppeal {
    const input = object(raw);
    fields(input, ['decisionId', 'reason']);
    const decisionId = text(input.decisionId, 'ID keputusan', 120);
    const reason = text(input.reason, 'Sebab appeal', 2000, 10);
    const decision = this.decision(decisionId);
    if (decision.subjectId !== actor.user.id) this.auth.founder(actor);
    const open = this.store
      .all<RiskAppeal>(RISK_APPEAL_KIND)
      .find(
        (appeal) =>
          appeal.decisionId === decisionId &&
          RISK_APPEAL_TRANSITIONS[appeal.state].length > 0,
      );
    if (open) fail('APPEAL_ALREADY_OPEN', 409, 'Appeal yang masih terbuka wujud untuk keputusan ini.');
    const timestamp = now();
    const appeal: RiskAppeal = {
      id: id(),
      decisionId,
      subjectId: decision.subjectId,
      reason,
      state: 'submitted',
      submittedBy: actor.user.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      revision: 1,
      events: [{ from: null, to: 'submitted', at: timestamp, actorId: actor.user.id }],
    };
    this.store.save(RISK_APPEAL_KIND, appeal);
    this.store.audit(actor.user.id, 'risk.appeal.submit', appeal.id, appeal.revision);
    return appeal;
  }

  /** Senarai appeal yang boleh dilihat oleh actor. */
  list(actor: Principal): RiskAppeal[] {
    const all = this.store.all<RiskAppeal>(RISK_APPEAL_KIND);
    if (this.auth.has(actor, 'founder')) return all;
    return all.filter(
      (appeal) =>
        appeal.subjectId === actor.user.id || appeal.submittedBy === actor.user.id,
    );
  }

  get(actor: Principal, appealId: string): RiskAppeal {
    const appeal =
      this.store.get<RiskAppeal>(RISK_APPEAL_KIND, appealId) ??
      fail('NOT_FOUND', 404, 'Appeal tidak ditemui.');
    if (
      appeal.subjectId !== actor.user.id &&
      appeal.submittedBy !== actor.user.id &&
      !this.auth.has(actor, 'founder')
    ) {
      fail('FORBIDDEN', 403, 'Appeal ini di luar akses anda.');
    }
    return appeal;
  }

  /** Semakan appeal oleh pengasas. */
  review(actor: Principal, appealId: string, raw: unknown): RiskAppeal {
    this.auth.founder(actor);
    const input = object(raw);
    fields(input, ['action', 'note']);
    const action = input.action;
    if (action !== 'start' && action !== 'approve' && action !== 'reject') {
      fail('INVALID_INPUT', 400, 'Tindakan appeal tidak sah.');
    }
    const note = input.note === undefined ? undefined : text(input.note, 'Nota', 1000);
    const appeal = this.get(actor, appealId);
    return this.transition(appeal, ACTION_TARGET[action], actor, note);
  }

  /** Menarik balik appeal oleh subjek (atau pengasas). */
  withdraw(actor: Principal, appealId: string): RiskAppeal {
    const appeal = this.get(actor, appealId);
    if (appeal.subjectId !== actor.user.id && appeal.submittedBy !== actor.user.id) {
      this.auth.founder(actor);
    }
    return this.transition(appeal, 'withdrawn', actor);
  }
}
