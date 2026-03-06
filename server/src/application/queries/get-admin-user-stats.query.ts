import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, ForbiddenException } from '@nestjs/common';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { UserRole } from '../../domain/value-objects/user-role';
import { UserStatus } from '../../domain/value-objects/user-status';

export type TrendPeriod = 'day' | 'week' | 'month' | 'year';

export class GetAdminUserStatsQuery {
    constructor(
        public readonly callerUid: string,
        public readonly period: TrendPeriod = 'month',
    ) { }
}

export interface TrendDataPoint {
    label: string;
    count: number;
}

export interface AdminUserStats {
    total: number;
    customer: number;
    admin: number;
    active: number;
    inactive: number;
    suspended: number;
    trend: TrendDataPoint[];
}

@QueryHandler(GetAdminUserStatsQuery)
export class GetAdminUserStatsHandler
    implements IQueryHandler<GetAdminUserStatsQuery> {
    constructor(
        @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
        private readonly firebaseService: FirebaseService,
    ) { }

    async execute(query: GetAdminUserStatsQuery): Promise<AdminUserStats> {
        const { callerUid, period } = query;

        // Verify caller is admin
        const caller = await this.userRepo.findById(callerUid);
        if (!caller || caller.profile?.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Admin access required');
        }

        // Fetch all profiles from Firestore
        const snapshot = await this.firebaseService.getFirestore().collection('profiles').get();

        let total = 0;
        let customer = 0;
        let admin = 0;
        let active = 0;
        let inactive = 0;
        let suspended = 0;

        const signUpDates: Date[] = [];

        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const status = data.status as string;

            // Skip permanently deleted users
            if (status === UserStatus.DELETED) return;

            total++;

            if (data.role === UserRole.ADMIN) admin++;
            else customer++;

            if (status === UserStatus.ACTIVE) active++;
            else if (status === UserStatus.INACTIVE) inactive++;
            else if (status === UserStatus.SUSPENDED) suspended++;

            // Collect created_at for trend
            if (data.created_at) {
                const createdAt = data.created_at?.toDate
                    ? data.created_at.toDate()
                    : new Date(data.created_at);
                if (createdAt instanceof Date && !isNaN(createdAt.getTime())) {
                    signUpDates.push(createdAt);
                }
            }
        });

        const trend = this.buildTrend(signUpDates, period);

        return { total, customer, admin, active, inactive, suspended, trend };
    }

    private buildTrend(dates: Date[], period: TrendPeriod): TrendDataPoint[] {
        const now = new Date();
        const buckets = new Map<string, number>();

        if (period === 'day') {
            // Last 24 hours by hour
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
            // Last 7 days
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
            // Last 4 weeks labeled Week 1..4
            for (let w = 3; w >= 0; w--) {
                buckets.set(`Wk ${4 - w}`, 0);
            }
            dates.forEach((d) => {
                const diffDays = Math.floor(
                    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
                );
                if (diffDays >= 0 && diffDays < 28) {
                    const week = Math.floor(diffDays / 7); // 0 = most recent week
                    const label = `Wk ${4 - week}`;
                    buckets.set(label, (buckets.get(label) ?? 0) + 1);
                }
            });
        } else {
            // year — last 12 months
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
