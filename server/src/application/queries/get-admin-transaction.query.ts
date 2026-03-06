import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { UserRole } from '../../domain/value-objects/user-role';
import { TransactionType, TransactionStatus } from '../../domain/entities/Transaction';

export class GetAdminTransactionQuery {
    constructor(
        public readonly callerUid: string,
        public readonly transactionId: string,
    ) { }
}

export interface AdminTransactionDetails {
    id: string;
    walletId: string;
    userId: string;
    type: TransactionType;
    direction: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    status: TransactionStatus;
    createdAt: Date;
    metadata?: any;
    userEmail?: string;
    userName?: string;
}

@QueryHandler(GetAdminTransactionQuery)
export class GetAdminTransactionHandler implements IQueryHandler<GetAdminTransactionQuery> {
    constructor(
        @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
        private readonly firebaseService: FirebaseService,
    ) { }

    async execute(query: GetAdminTransactionQuery): Promise<AdminTransactionDetails> {
        const { callerUid, transactionId } = query;

        // Verify caller is admin
        const caller = await this.userRepo.findById(callerUid);
        if (!caller || caller.profile?.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Admin access required');
        }

        const db = this.firebaseService.getFirestore();
        const doc = await db.collection('transactions').doc(transactionId).get();

        if (!doc.exists) {
            throw new NotFoundException('Transaction not found');
        }

        const data = doc.data();
        if (!data) {
            throw new NotFoundException('Transaction data is missing');
        }

        const transaction: AdminTransactionDetails = {
            id: doc.id,
            walletId: data.walletId,
            userId: data.userId,
            type: data.type,
            direction: data.direction,
            amount: data.amount,
            description: data.description,
            status: data.status,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            metadata: data.metadata,
        };

        // Fetch user info
        try {
            const user = await this.userRepo.findById(transaction.userId);
            if (user && user.profile) {
                transaction.userEmail = user.profile.email;
                transaction.userName = `${user.profile.first_name} ${user.profile.last_name}`.trim();
            }
        } catch (e) {
            // Ignore missing user profiles
        }

        return transaction;
    }
}
