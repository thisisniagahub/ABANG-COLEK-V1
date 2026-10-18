import { createHash } from 'node:crypto';
import type { OrderRecord } from '../../../shared/platform-contracts';
import { Auth, type Principal } from '../auth';
import { fail, now, PlatformStore } from '../store';
import { mapSupabaseOrderToPlatform, type LegacySupabaseOrder } from './legacyMaps';

export interface MigrationDryRunReport {
  totalExamined: number;
  validCandidatesCount: number;
  rejectedCount: number;
  rejectedRows: { sourceId: string; reason: string }[];
  projectedTotalSen: number;
  projectedVerifiedPaidSen: number;
  candidateOrderIds: string[];
  sourceChecksum: string;
}

export interface MigrationReceipt {
  id: string;
  actorId: string;
  totalExamined: number;
  importedCount: number;
  rejectedCount: number;
  totalValueSen: number;
  importedOrderIds: string[];
  importedOrderHashes?: Record<string,string>;
  sourceChecksum: string;
  status: 'committed' | 'rolled_back';
  createdAt: string;
  rolledBackAt?: string;
}

export class LegacyMigrationReconciler {
  constructor(
    readonly store: PlatformStore,
    readonly auth: Auth,
  ) {}

  private getExistingOrderIds(): Set<string> {
    const existing = this.store.all<OrderRecord>('orders');
    const ids = new Set<string>();
    for (const o of existing) {
      ids.add(o.id);
      if (o.id.startsWith('LEGACY-')) {
        ids.add(o.id.replace('LEGACY-', ''));
      }
    }
    return ids;
  }

  dryRun(records: unknown[]): MigrationDryRunReport {
    const existingIds = this.getExistingOrderIds();
    const candidateOrders: OrderRecord[] = [];
    const rejectedRows: { sourceId: string; reason: string }[] = [];

    const seenInBatch = new Set<string>();

    for (const raw of records) {
      const sourceId = (raw as any)?.order_id || (raw as any)?.id || 'unknown';
      if (seenInBatch.has(sourceId)) {
        rejectedRows.push({ sourceId, reason: 'Pendua di dalam batch yang sama' });
        continue;
      }
      seenInBatch.add(sourceId);

      const mapped = mapSupabaseOrderToPlatform(raw, existingIds);
      if (mapped.valid && mapped.order) {
        candidateOrders.push(mapped.order);
      } else {
        rejectedRows.push({ sourceId: mapped.sourceId, reason: mapped.rejectionReason || 'Tidak sah' });
      }
    }

    const projectedTotalSen = candidateOrders.reduce((sum, o) => sum + o.amountSen, 0);
    const projectedVerifiedPaidSen = candidateOrders.reduce((sum, o) => sum + o.paidAmountSen, 0);
    const candidateOrderIds = candidateOrders.map(o => o.id);

    const hash = createHash('sha256');
    hash.update(JSON.stringify(candidateOrderIds));
    const sourceChecksum = hash.digest('hex');

    return {
      totalExamined: records.length,
      validCandidatesCount: candidateOrders.length,
      rejectedCount: rejectedRows.length,
      rejectedRows,
      projectedTotalSen,
      projectedVerifiedPaidSen,
      candidateOrderIds,
      sourceChecksum,
    };
  }

  executeImport(actor: Principal, records: unknown[]): MigrationReceipt {
    this.auth.founder(actor);
    const report = this.dryRun(records);

    if (report.validCandidatesCount === 0) {
      fail('MIGRATION_NO_VALID_ROWS', 400, 'Tiada rekod sah untuk diimport.');
    }

    const existingIds = this.getExistingOrderIds();
    const importedOrderIds: string[] = [];
    let totalValueSen = 0;

    let createdReceipt: MigrationReceipt | undefined;

    this.store.atomic(() => {
      const seen = new Set<string>();
      for (const raw of records) {
        const sourceId = (raw as any)?.order_id || (raw as any)?.id || 'unknown';
        if (seen.has(sourceId)) continue;
        seen.add(sourceId);

        const mapped = mapSupabaseOrderToPlatform(raw, existingIds);
        if (mapped.valid && mapped.order) {
          this.store.save('orders', mapped.order);
          importedOrderIds.push(mapped.order.id);
          totalValueSen += mapped.order.amountSen;
          existingIds.add(mapped.order.id);
        }
      }

      const receiptId = `MIG-REC-${crypto.randomUUID()}`;
      createdReceipt = {
        id: receiptId,
        actorId: actor.user.id,
        totalExamined: report.totalExamined,
        importedCount: importedOrderIds.length,
        rejectedCount: report.rejectedCount,
        totalValueSen,
        importedOrderIds,
        importedOrderHashes:Object.fromEntries(importedOrderIds.map(orderId=>[orderId,createHash('sha256').update(JSON.stringify(this.store.require('orders',orderId))).digest('hex')])),
        sourceChecksum: report.sourceChecksum,
        status: 'committed',
        createdAt: now(),
      };

      this.store.save('migration_receipts', createdReceipt);
      this.store.audit(actor.user.id, 'migration.import', createdReceipt.id, importedOrderIds.length);
    });

    return createdReceipt!;
  }

  rollback(actor: Principal, receiptId: string): MigrationReceipt {
    this.auth.founder(actor);
    const receipt = this.store.require<MigrationReceipt>('migration_receipts', receiptId);

    if (receipt.status === 'rolled_back') {
      fail('ALREADY_ROLLED_BACK', 409, 'Penerimaan migrasi ini telah pun diundur.');
    }

    this.store.atomic(() => {
      for (const orderId of receipt.importedOrderIds) {
        const order=this.store.get<OrderRecord>('orders',orderId);
        const expected=receipt.importedOrderHashes?.[orderId];
        // Old receipts lack provenance hashes and cannot prove deletion is safe.
        if(!order||!expected||createHash('sha256').update(JSON.stringify(order)).digest('hex')!==expected)fail('MIGRATION_ROLLBACK_SOURCE_CHANGED',409,'Rekod migrasi telah berubah. Rollback automatik tidak selamat.');
        const linked=this.store.db.query<{data:string},[]>('SELECT data FROM records').all().some(row=>{
          const record=JSON.parse(row.data) as Record<string,unknown>;
          if(record.id===receipt.id||record.id===orderId)return false;
          const contains=(value:unknown):boolean=>value===orderId||Array.isArray(value)&&value.some(contains)||!!value&&typeof value==='object'&&Object.values(value).some(contains);
          return contains(record);
        });
        if(linked)fail('MIGRATION_ROLLBACK_HAS_DEPENDENCIES',409,'Rekod mempunyai rujukan operasi. Selesaikan penyesuaian secara manual.');
        this.store.delete('orders', orderId);
      }

      const updatedReceipt: MigrationReceipt = {
        ...receipt,
        status: 'rolled_back',
        rolledBackAt: now(),
      };

      this.store.save('migration_receipts', updatedReceipt);
      this.store.audit(actor.user.id, 'migration.rollback', receipt.id);
    });

    return this.store.require<MigrationReceipt>('migration_receipts', receiptId);
  }
}
