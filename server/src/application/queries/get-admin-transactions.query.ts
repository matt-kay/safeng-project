import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, ForbiddenException } from '@nestjs/common';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { UserRole } from '../../domain/value-objects/user-role';
import { TransactionType, TransactionStatus } from '../../domain/entities/Transaction';

export class GetAdminTransactionsQuery {
    constructor(
        public readonly callerUid: string,
        public readonly page: number = 1,
        public readonly limit: number = 20,
        public readonly filterType?: 'status' | 'type' | 'category',
        public readonly filterValue?: string,
        public readonly search?: string,
    ) { }
}

export interface AdminTransactionListItem {
    id: string;
    walletId: string;
    userId: string;
    type: TransactionType;
    direction: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    status: TransactionStatus;
    createdAt: Date;
    userEmail?: string;
    userName?: string;
}

export interface GetAdminTransactionsResponse {
    transactions: AdminTransactionListItem[];
    total: number;
    hasMore: boolean;
}

@QueryHandler(GetAdminTransactionsQuery)
export class GetAdminTransactionsHandler implements IQueryHandler<GetAdminTransactionsQuery> {
    constructor(
        @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
        private readonly firebaseService: FirebaseService,
    ) { }

    async execute(query: GetAdminTransactionsQuery): Promise<GetAdminTransactionsResponse> {
        const { callerUid, page, limit, filterType, filterValue, search } = query;

        // Verify caller is admin
        const caller = await this.userRepo.findById(callerUid);
        if (!caller || caller.profile?.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Admin access required');
        }

        const db = this.firebaseService.getFirestore();
        let transactionsRef: any = db.collection('transactions');

        // Apply filters
        if (filterType && filterValue) {
            if (filterType === 'category') {
                const categoryTypes = filterValue === 'coupon'
                    ? [TransactionType.COUPON_FUNDING, TransactionType.COUPON_REDEMPTION, TransactionType.COUPON_REFUND]
                    : [TransactionType.TOP_UP, TransactionType.PAYMENT, TransactionType.CASHBACK, TransactionType.REFUND];
                transactionsRef = transactionsRef.where('type', 'in', categoryTypes);
            } else {
                transactionsRef = transactionsRef.where(filterType, '==', filterValue);
            }
        }

        // Fetch results
        // Similar to users query, we'll fetch more or all if searching, or paginated if not.
        let snapshot;
        if (search) {
            snapshot = await transactionsRef.get();
        } else {
            // Standard paginated query
            snapshot = await transactionsRef
                .orderBy('createdAt', 'desc')
                .limit(limit * page)
                .get();
        }

        let transactions: AdminTransactionListItem[] = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                walletId: data.walletId,
                userId: data.userId,
                type: data.type,
                direction: data.direction,
                amount: data.amount,
                description: data.description,
                status: data.status,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            };
        });

        // Search in memory
        if (search) {
            const s = search.toLowerCase();
            transactions = transactions.filter(t =>
                t.id.toLowerCase().includes(s) ||
                t.userId.toLowerCase().includes(s) ||
                t.walletId.toLowerCase().includes(s)
            );
            // Re-sort
            transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        const total = transactions.length;
        const startIndex = (page - 1) * limit;
        const pagedTransactions = transactions.slice(startIndex, startIndex + limit);

        // Fetch user info for the paged transactions to improve UI
        const enrichedTransactions = await Promise.all(pagedTransactions.map(async (t) => {
            try {
                const user = await this.userRepo.findById(t.userId);
                if (user && user.profile) {
                    return {
                        ...t,
                        userEmail: user.profile.email,
                        userName: `${user.profile.first_name} ${user.profile.last_name} `.trim(),
                    };
                }
            } catch (e) {
                // Ignore missing user profiles
            }
            return t;
        }));

        return {
            transactions: enrichedTransactions,
            total,
            hasMore: startIndex + limit < total,
        };
    }
}
