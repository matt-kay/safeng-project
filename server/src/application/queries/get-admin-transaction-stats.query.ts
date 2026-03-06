import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, ForbiddenException } from '@nestjs/common';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { UserRole } from '../../domain/value-objects/user-role';
import { TransactionType, TransactionStatus } from '../../domain/entities/Transaction';
import { TrendPeriod, TrendDataPoint } from './get-admin-user-stats.query';

export class GetAdminTransactionStatsQuery {
    constructor(
        public readonly callerUid: string,
        public readonly period: TrendPeriod = 'month',
    ) { }
}

export interface AdminTransactionStats {
    total: number;
    wallet: number;
    coupon: number;
    success: number;
    pending: number;
    failed: number;
    trend: TrendDataPoint[];
}

@QueryHandler(GetAdminTransactionStatsQuery)
export class GetAdminTransactionStatsHandler
    implements IQueryHandler<GetAdminTransactionStatsQuery> {
    constructor(
        @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
        private readonly firebaseService: FirebaseService,
    ) { }

    async execute(query: GetAdminTransactionStatsQuery): Promise<AdminTransactionStats> {
        const { callerUid, period } = query;

        // Verify caller is admin
        const caller = await this.userRepo.findById(callerUid);
        if (!caller || caller.profile?.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Admin access required');
        }

        // Fetch all transactions from Firestore
        const snapshot = await this.firebaseService.getFirestore().collection('transactions').get();

        let total = 0;
        let wallet = 0; // TOP_UP, PAYMENT (not coupon)
        let coupon = 0; // COUPON_FUNDING, COUPON_REDEMPTION, COUPON_REFUND
        let success = 0;
        let pending = 0;
        let failed = 0;

        const transactionDates: Date[] = [];

        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const status = data.status as TransactionStatus;
            const type = data.type as TransactionType;

            total++;

            if (status === TransactionStatus.SUCCESS) success++;
            else if (status === TransactionStatus.PENDING || status === TransactionStatus.INITIATED) pending++;
            else if (status === TransactionStatus.FAILED) failed++;

            if ([TransactionType.COUPON_FUNDING, TransactionType.COUPON_REDEMPTION, TransactionType.COUPON_REFUND].includes(type)) {
                coupon++;
            } else {
                wallet++;
            }

            // Collect createdAt for trend
            if (data.createdAt) {
                const createdAt = data.createdAt?.toDate
                    ? data.createdAt.toDate()
                    : new Date(data.createdAt);
                if (createdAt instanceof Date && !isNaN(createdAt.getTime())) {
                    transactionDates.push(createdAt);
                }
            }
        });

        const trend = this.buildTrend(transactionDates, period);

        return { total, wallet, coupon, success, pending, failed, trend };
    }

    private buildTrend(dates: Date[], period: TrendPeriod): TrendDataPoint[] {
        const now = new Date();
        const buckets = new Map<string, number>();

        if (period === 'day') {
            for (let h = 23; h >= 0; h--) {
                const label = this.hourLabel(now, h);
                buckets.set(label, 0);
            }
            dates.forEach((d) => {
                const diffHours = Math.floor(
                    (now.getTime() - d.getTime()) / (1000 * 60 * 60),
                );
                if (diffHours >= 0 && diffHours < 24) {
                    const label = this.hourLabel(now, diffHours);
                    buckets.set(label, (buckets.get(label) ?? 0) + 1);
                }
            });
        } else if (period === 'week') {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                buckets.set(dayNames[d.getDay()], 0);
            }
            dates.forEach((d) => {
                const diffDays = Math.floor(
                    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
                );
                if (diffDays >= 0 && diffDays < 7) {
                    const label = dayNames[d.getDay()];
                    buckets.set(label, (buckets.get(label) ?? 0) + 1);
                }
            });
        } else if (period === 'month') {
            for (let w = 3; w >= 0; w--) {
                buckets.set(`Wk ${4 - w}`, 0);
            }
            dates.forEach((d) => {
                const diffDays = Math.floor(
                    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
                );
                if (diffDays >= 0 && diffDays < 28) {
                    const week = Math.floor(diffDays / 7);
                    const label = `Wk ${4 - week}`;
                    buckets.set(label, (buckets.get(label) ?? 0) + 1);
                }
            });
        } else {
            const monthNames = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
            ];
            for (let m = 11; m >= 0; m--) {
                const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
                buckets.set(monthNames[d.getMonth()], 0);
            }
            dates.forEach((d) => {
                const monthsAgo =
                    (now.getFullYear() - d.getFullYear()) * 12 +
                    (now.getMonth() - d.getMonth());
                if (monthsAgo >= 0 && monthsAgo < 12) {
                    const label = monthNames[d.getMonth()];
                    buckets.set(label, (buckets.get(label) ?? 0) + 1);
                }
            });
        }

        return Array.from(buckets.entries()).map(([label, count]) => ({
            label,
            count,
        }));
    }

    private hourLabel(now: Date, hoursAgo: number): string {
        const d = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
        const h = d.getHours();
        return h < 12 ? `${h === 0 ? 12 : h}am` : `${h === 12 ? 12 : h - 12}pm`;
    }
}
