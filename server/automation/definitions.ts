import type { AutomationDefinition, AutomationMode, AutomationRun, AutomationStatus } from '../../shared/automation-contracts';
import { Auth, type Principal } from '../platform/auth';
import { fields, fail, id, list, now, object, PlatformStore, text, oneOf } from '../platform/store';

export class AutomationDefinitions {
  constructor(readonly store: PlatformStore, readonly auth: Auth) {}
  all(actor: Principal): AutomationDefinition[] {
    this.auth.founder(actor);
    return this.store.all<AutomationDefinition>('automation_definitions')
      .filter(item => item.ownerId === actor.user.id || this.auth.has(actor, 'founder'))
      // Preserve saved intent while reporting the effective, currently supported state.
      .map(item => item.status === 'enabled' ? { ...item, status: 'paused', readinessReason: 'AUTOMATION_EXECUTOR_UNAVAILABLE' } : item);
  }
  runs(actor: Principal) { this.auth.founder(actor); const owned = new Set(this.all(actor).map(item => item.id)); return this.store.all<AutomationRun>('automation_runs').filter(run => owned.has(run.automationId)); }
  save(actor: Principal, raw: unknown, automationId?: string) {
    this.auth.founder(actor); const input = object(raw);
    fields(input, automationId ? ['expectedRevision','name','instruction','mode','scheduleKind','scheduleExpression','triggerProvider','triggerEvent','filters','connectors','destination'] : ['name','instruction','mode','scheduleKind','scheduleExpression','triggerProvider','triggerEvent','filters','connectors','destination']);
    const existing = automationId ? this.store.require<AutomationDefinition>('automation_definitions', automationId) : undefined;
    if (existing && existing.ownerId !== actor.user.id) fail('FORBIDDEN', 403);
    if (existing && existing.revision !== Number(input.expectedRevision)) fail('REVISION_CONFLICT', 409);
    const mode = oneOf(input.mode, ['schedule','trigger','webhook','script'] as const);
    const destination = oneOf(input.destination, ['draft','task','report','manual_publish','webhook'] as const);
    const filters = list(input.filters ?? [], 20).map(value => text(value, 'Filter', 500));
    const connectors = list(input.connectors ?? [], 12).map(value => text(value, 'Connector', 120));
    if (mode === 'schedule' && !text(input.scheduleExpression, 'Schedule expression', 500)) fail('SCHEDULE_REQUIRED');
    if ((mode === 'trigger' || mode === 'webhook') && !text(input.triggerEvent, 'Trigger event', 200)) fail('TRIGGER_EVENT_REQUIRED');
    const record: AutomationDefinition = { id: existing?.id ?? id(), ownerId: existing?.ownerId ?? actor.user.id, name: text(input.name, 'Nama automation', 200), instruction: text(input.instruction, 'Arahan automation', 12000), mode, timezone: 'Asia/Kuala_Lumpur', filters, connectors, destination, approvalRequired: true, status: existing?.status ?? 'paused', revision: (existing?.revision ?? 0) + 1, createdAt: existing?.createdAt ?? now(), ...(input.scheduleKind ? { scheduleKind: oneOf(input.scheduleKind, ['one_time','recurring','interval','cron'] as const) } : {}), ...(input.scheduleExpression ? { scheduleExpression: text(input.scheduleExpression, 'Schedule expression', 500) } : {}), ...(input.triggerProvider ? { triggerProvider: text(input.triggerProvider, 'Trigger provider', 120) } : {}), ...(input.triggerEvent ? { triggerEvent: text(input.triggerEvent, 'Trigger event', 200) } : {}) };
    this.store.save('automation_definitions', record); this.store.audit(actor.user.id, 'automation.save', record.id, record.revision); return record;
  }
  toggle(actor: Principal, automationId: string, raw: unknown) { this.auth.founder(actor); const record = this.store.require<AutomationDefinition>('automation_definitions', automationId); if (record.ownerId !== actor.user.id) fail('FORBIDDEN', 403); const input = object(raw); fields(input, ['expectedRevision','status']); const status = oneOf(input.status, ['enabled','paused','disabled'] as const); if (record.revision !== Number(input.expectedRevision)) fail('REVISION_CONFLICT', 409); if (status === 'enabled') fail('AUTOMATION_EXECUTOR_UNAVAILABLE', 409, 'Automation belum mempunyai executor yang disahkan. Simpan sebagai paused; pekerjaan morning brief dan case summary boleh dijalankan melalui Jobs.'); const updated = { ...record, status, revision: record.revision + 1 }; this.store.save('automation_definitions', updated); this.store.audit(actor.user.id, 'automation.toggle', record.id, updated.revision); return updated; }
}
