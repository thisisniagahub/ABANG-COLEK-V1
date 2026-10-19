import {
  type LoyaltyEventType,
  type LoyaltyLedgerEntry,
  LOYALTY_EARN_RATE_SEN_PER_POINT,
  LOYALTY_REDEMPTION_POINTS_PER_RM,
  LOYALTY_POINT_VALUE_SEN,
  calculateLoyaltyPointsEarned,
  loyaltyPointsToDiscountSen,
  discountSenToLoyaltyPoints,
} from '../../shared/growth-contracts';
import { fail, id, integer, now, text, fields, object, type PlatformStore } from './store';
import type { Principal, Auth } from './auth';

export {
  LOYALTY_EARN_RATE_SEN_PER_POINT,
  LOYALTY_REDEMPTION_POINTS_PER_RM,
  LOYALTY_POINT_VALUE_SEN,
  calculateLoyaltyPointsEarned,
  loyaltyPointsToDiscountSen,
  discountSenToLoyaltyPoints,
};

export interface LoyaltyAccountSummary {
  userId: string;
  balancePoints: number;
  totalEarnedPoints: number;
  totalRedeemedPoints: number;
  totalExpiredPoints: number;
  totalReversedPoints: number;
  monetaryValueSen: number;
  entriesCount: number;
}

export class Loyalty {
  constructor(readonly store: PlatformStore, readonly auth?: Auth) {}

  calculatePointsEarned(amountSen: number): number {
    return calculateLoyaltyPointsEarned(amountSen);
  }

  pointsToDiscountSen(points: number): number {
    return loyaltyPointsToDiscountSen(points);
  }

  discountSenToPoints(discountSen: number): number {
    return discountSenToLoyaltyPoints(discountSen);
  }

  getEntries(userId: string): LoyaltyLedgerEntry[] {
    return this.store
      .all<LoyaltyLedgerEntry>('loyalty_ledger')
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getBalance(userId: string, asOf = now()): number {
    const entries = this.store
      .all<LoyaltyLedgerEntry>('loyalty_ledger')
      .filter((entry) => entry.userId === userId);

    if (entries.length === 0) return 0;

    // Peruntukan FIFO: kredit positif mengikut susunan kronologi (tertua dahulu)
    const credits = entries
      .filter((e) => e.pointsDelta > 0)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((e) => ({
        remainingPoints: e.pointsDelta,
        expiryAt: e.expiryAt,
      }));

    // Kumpulkan jumlah debit negatif (ditebus, pelarasan negatif, clawback pembalikan, atau luput eksplisit)
    let totalDebits = entries
      .filter((e) => e.pointsDelta < 0)
      .reduce((sum, e) => sum + Math.abs(e.pointsDelta), 0);

    // Tolak debit daripada kredit tertua dahulu (FIFO)
    for (const credit of credits) {
      if (totalDebits <= 0) break;
      const deduction = Math.min(credit.remainingPoints, totalDebits);
      credit.remainingPoints -= deduction;
      totalDebits -= deduction;
    }

    // Kira baki daripada kredit yang masih belum ditebus dan belum tamat tempoh pada tarikh asOf
    let balance = 0;
    for (const credit of credits) {
      if (credit.remainingPoints > 0) {
        if (!credit.expiryAt || credit.expiryAt > asOf) {
          balance += credit.remainingPoints;
        }
      }
    }

    // Jika ada baki debit yang melebihi jumlah kredit
    if (totalDebits > 0) {
      balance = Math.max(0, balance - totalDebits);
    }

    return balance;
  }

  getExpiredPoints(userId: string, asOf = now()): number {
    const entries = this.store
      .all<LoyaltyLedgerEntry>('loyalty_ledger')
      .filter((entry) => entry.userId === userId);

    if (entries.length === 0) return 0;

    const credits = entries
      .filter((e) => e.pointsDelta > 0)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((e) => ({
        remainingPoints: e.pointsDelta,
        expiryAt: e.expiryAt,
      }));

    let totalDebits = entries
      .filter((e) => e.pointsDelta < 0)
      .reduce((sum, e) => sum + Math.abs(e.pointsDelta), 0);

    for (const credit of credits) {
      if (totalDebits <= 0) break;
      const deduction = Math.min(credit.remainingPoints, totalDebits);
      credit.remainingPoints -= deduction;
      totalDebits -= deduction;
    }

    let expired = 0;
    for (const credit of credits) {
      if (credit.remainingPoints > 0 && credit.expiryAt && credit.expiryAt <= asOf) {
        expired += credit.remainingPoints;
      }
    }
    return expired;
  }

  expirePoints(userId: string, asOf = now()): LoyaltyLedgerEntry | null {
    return this.store.atomic(() => {
      const safeUserId = text(userId, 'ID Pengguna', 120);
      const expiredCount = this.getExpiredPoints(safeUserId, asOf);
      if (expiredCount <= 0) return null;

      const entry: LoyaltyLedgerEntry = {
        id: id(),
        userId: safeUserId,
        pointsDelta: -expiredCount,
        monetaryEquivalentSen: this.pointsToDiscountSen(expiredCount),
        eventType: 'expired',
        description: `Luput tempoh ${expiredCount} mata kesetiaan`,
        createdAt: asOf,
      };

      this.store.save('loyalty_ledger', entry);
      this.store.audit(safeUserId, 'loyalty.expired', entry.id);
      return entry;
    });
  }

  getSummary(userId: string, asOf = now()): LoyaltyAccountSummary {
    const entries = this.getEntries(userId);
    const balancePoints = this.getBalance(userId, asOf);
    const expiredUnrecorded = this.getExpiredPoints(userId, asOf);

    const totalEarnedPoints = entries
      .filter((e) => e.eventType === 'earned' && e.pointsDelta > 0)
      .reduce((sum, e) => sum + e.pointsDelta, 0);

    const totalRedeemedPoints = entries
      .filter((e) => e.eventType === 'redeemed' && e.pointsDelta < 0)
      .reduce((sum, e) => sum + Math.abs(e.pointsDelta), 0);

    const explicitExpiredPoints = entries
      .filter((e) => e.eventType === 'expired' && e.pointsDelta < 0)
      .reduce((sum, e) => sum + Math.abs(e.pointsDelta), 0);

    const totalReversedPoints = entries
      .filter((e) => e.eventType === 'reversed' && e.pointsDelta < 0)
      .reduce((sum, e) => sum + Math.abs(e.pointsDelta), 0);

    return {
      userId,
      balancePoints,
      totalEarnedPoints,
      totalRedeemedPoints,
      totalExpiredPoints: explicitExpiredPoints + expiredUnrecorded,
      totalReversedPoints,
      monetaryValueSen: this.pointsToDiscountSen(balancePoints),
      entriesCount: entries.length,
    };
  }

  awardPoints(
    userId: string,
    points: number,
    sourceOrderId?: string,
    description?: string,
    expiryDays = 365
  ): LoyaltyLedgerEntry {
    return this.store.atomic(() => {
      const safeUserId = text(userId, 'ID Pengguna', 120);
      const safePoints = integer(points, 'Mata ganjaran', 1, 10_000_000);

      // Semakan Idempotensi: Jika mata bagi pesanan ini sudah direkodkan, pulangkan rekod sedia ada
      if (sourceOrderId) {
        const existing = this.store
          .all<LoyaltyLedgerEntry>('loyalty_ledger')
          .find(
            (e) =>
              e.userId === safeUserId &&
              e.sourceOrderId === sourceOrderId &&
              e.eventType === 'earned'
          );
        if (existing) return existing;
      }

      const expiryAt =
        expiryDays > 0
          ? new Date(Date.now() + expiryDays * 24 * 3600_000).toISOString()
          : undefined;

      const entry: LoyaltyLedgerEntry = {
        id: id(),
        userId: safeUserId,
        pointsDelta: safePoints,
        monetaryEquivalentSen: this.pointsToDiscountSen(safePoints),
        eventType: 'earned',
        ...(sourceOrderId ? { sourceOrderId } : {}),
        ...(expiryAt ? { expiryAt } : {}),
        description:
          description ??
          `Ganjaran ${safePoints} mata kesetiaan (RM${(this.pointsToDiscountSen(safePoints) / 100).toFixed(2)})`,
        createdAt: now(),
      };

      this.store.save('loyalty_ledger', entry);
      this.store.audit(safeUserId, 'loyalty.earned', entry.id);
      return entry;
    });
  }

  redeemPoints(
    userId: string,
    points: number,
    sourceOrderId?: string,
    description?: string
  ): LoyaltyLedgerEntry {
    return this.store.atomic(() => {
      const safeUserId = text(userId, 'ID Pengguna', 120);
      const safePoints = integer(points, 'Poin ditebus', 1, 10_000_000);

      // Semakan idempotensi penebusan bagi pesanan yang sama
      if (sourceOrderId) {
        const existing = this.store
          .all<LoyaltyLedgerEntry>('loyalty_ledger')
          .find(
            (e) =>
              e.userId === safeUserId &&
              e.sourceOrderId === sourceOrderId &&
              e.eventType === 'redeemed'
          );
        if (existing) return existing;
      }

      const currentBalance = this.getBalance(safeUserId);
      if (currentBalance < safePoints) {
        fail(
          'INSUFFICIENT_LOYALTY_POINTS',
          400,
          `Baki mata kesetiaan (${currentBalance}) tidak mencukupi untuk penebusan ${safePoints} mata.`
        );
      }

      const discountSen = this.pointsToDiscountSen(safePoints);
      const entry: LoyaltyLedgerEntry = {
        id: id(),
        userId: safeUserId,
        pointsDelta: -safePoints,
        monetaryEquivalentSen: discountSen,
        eventType: 'redeemed',
        ...(sourceOrderId ? { sourceOrderId } : {}),
        description:
          description ??
          `Penebusan ${safePoints} mata kesetiaan untuk diskaun RM${(discountSen / 100).toFixed(2)}`,
        createdAt: now(),
      };

      this.store.save('loyalty_ledger', entry);
      this.store.audit(safeUserId, 'loyalty.redeemed', entry.id);
      return entry;
    });
  }

  reversePointsForOrder(
    userId: string,
    sourceOrderId: string,
    reason = 'Pembatalan atau pemulangan pesanan'
  ): LoyaltyLedgerEntry[] {
    return this.store.atomic(() => {
      const safeUserId = text(userId, 'ID Pengguna', 120);
      const safeOrderId = text(sourceOrderId, 'ID Pesanan', 120);
      const reversed: LoyaltyLedgerEntry[] = [];

      const relatedEntries = this.store
        .all<LoyaltyLedgerEntry>('loyalty_ledger')
        .filter((e) => e.userId === safeUserId && e.sourceOrderId === safeOrderId);

      // 1. Jika pesanan ini memperoleh mata (earned), tarik balik mata dengan entri debit negatif (sekiranya belum ditarik balik)
      const earnedEntry = relatedEntries.find((e) => e.eventType === 'earned' && e.pointsDelta > 0);
      const alreadyClawedBack = relatedEntries.some(
        (e) => e.eventType === 'reversed' && e.pointsDelta < 0
      );
      if (earnedEntry && !alreadyClawedBack) {
        const clawbackEntry: LoyaltyLedgerEntry = {
          id: id(),
          userId: safeUserId,
          pointsDelta: -earnedEntry.pointsDelta,
          monetaryEquivalentSen: earnedEntry.monetaryEquivalentSen,
          eventType: 'reversed',
          sourceOrderId: safeOrderId,
          description: `Pelarasan kontra mata ganjaran pesanan #${safeOrderId}: ${reason}`,
          createdAt: now(),
        };
        this.store.save('loyalty_ledger', clawbackEntry);
        this.store.audit(safeUserId, 'loyalty.reversed_earned', clawbackEntry.id);
        reversed.push(clawbackEntry);
      }

      // 2. Jika pesanan ini menebus mata (redeemed), pulangkan semula mata kepada pelanggan dengan entri kredit positif (sekiranya belum dipulangkan)
      const redeemedEntry = relatedEntries.find((e) => e.eventType === 'redeemed' && e.pointsDelta < 0);
      const alreadyRestored = relatedEntries.some(
        (e) => e.eventType === 'reversed' && e.pointsDelta > 0
      );
      if (redeemedEntry && !alreadyRestored) {
        const pointsToRestore = Math.abs(redeemedEntry.pointsDelta);
        const restoreEntry: LoyaltyLedgerEntry = {
          id: id(),
          userId: safeUserId,
          pointsDelta: pointsToRestore,
          monetaryEquivalentSen: redeemedEntry.monetaryEquivalentSen,
          eventType: 'reversed',
          sourceOrderId: safeOrderId,
          description: `Pemulangan semula ${pointsToRestore} mata ditebus bagi pesanan #${safeOrderId}: ${reason}`,
          createdAt: now(),
        };
        this.store.save('loyalty_ledger', restoreEntry);
        this.store.audit(safeUserId, 'loyalty.reversed_redeemed', restoreEntry.id);
        reversed.push(restoreEntry);
      }

      // Sekiranya semua pembalikan bagi pesanan ini telah direkodkan sebelum ini (idempotensi)
      if (reversed.length === 0) {
        return relatedEntries.filter((e) => e.eventType === 'reversed');
      }

      return reversed;
    });
  }

  adjustPoints(
    actor: Principal,
    userId: string,
    pointsDelta: number,
    reason: string
  ): LoyaltyLedgerEntry {
    if (this.auth) this.auth.founder(actor);
    return this.store.atomic(() => {
      const safeUserId = text(userId, 'ID Pengguna', 120);
      const safeDelta = integer(pointsDelta, 'Perubahan mata', -10_000_000, 10_000_000);
      if (safeDelta === 0) fail('INVALID_DELTA', 400, 'Perubahan mata tidak boleh sifar.');
      const safeReason = text(reason, 'Sebab pelarasan', 1000);

      if (safeDelta < 0) {
        const currentBalance = this.getBalance(safeUserId);
        if (currentBalance < Math.abs(safeDelta)) {
          fail('INSUFFICIENT_LOYALTY_POINTS', 400, 'Baki mata tidak mencukupi untuk pelarasan negatif.');
        }
      }

      const entry: LoyaltyLedgerEntry = {
        id: id(),
        userId: safeUserId,
        pointsDelta: safeDelta,
        monetaryEquivalentSen: this.pointsToDiscountSen(Math.abs(safeDelta)),
        eventType: 'adjustment',
        description: `Pelarasan pentadbir: ${safeReason}`,
        createdAt: now(),
      };

      this.store.save('loyalty_ledger', entry);
      this.store.audit(actor.user.id, 'loyalty.adjustment', entry.id);
      return entry;
    });
  }
}
