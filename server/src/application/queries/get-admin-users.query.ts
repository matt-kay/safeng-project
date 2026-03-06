import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, ForbiddenException } from '@nestjs/common';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { UserRole } from '../../domain/value-objects/user-role';
import { UserStatus } from '../../domain/value-objects/user-status';

export class GetAdminUsersQuery {
    constructor(
        public readonly callerUid: string,
        public readonly page: number = 1,
        public readonly limit: number = 20,
        public readonly filterType?: 'role' | 'status',
        public readonly filterValue?: string,
        public readonly search?: string,
    ) { }
}

export interface AdminUserListItem {
    uid: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    role: string;
    status: string;
    created_at: Date;
}

export interface GetAdminUsersResponse {
    users: AdminUserListItem[];
    total: number;
    hasMore: boolean;
}

@QueryHandler(GetAdminUsersQuery)
export class GetAdminUsersHandler implements IQueryHandler<GetAdminUsersQuery> {
    constructor(
        @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
        private readonly firebaseService: FirebaseService,
    ) { }

    async execute(query: GetAdminUsersQuery): Promise<GetAdminUsersResponse> {
        const { callerUid, page, limit, filterType, filterValue, search } = query;

        // Verify caller is admin
        const caller = await this.userRepo.findById(callerUid);
        if (!caller || caller.profile?.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Admin access required');
        }

        const db = this.firebaseService.getFirestore();
        let profilesRef: any = db.collection('profiles');

        // Apply filters
        if (filterType && filterValue) {
            profilesRef = profilesRef.where(filterType, '==', filterValue);
        }

        // Fetch results
        // Note: Firestore doesn't support easy case-insensitive search or "contains" queries without external tools.
        // For simplicity and small-ish datasets, we'll fetch and filter if search is provided, 
        // OR implement prefix search if possible.
        // Given the requirement, we'll do our best with what Firestore provides.

        // Let's try to get all matching the filter first, then handle search and pagination in memory if search is active.
        // If no search, we use standard firestore ordering and limit.

        let snapshot;
        if (search) {
            // If there's a search, we might need to fetch more because we filter in-memory
            // This is a trade-off for Firestore's lack of complex queries.
            snapshot = await profilesRef.get();
        } else {
            // Standard paginated query
            snapshot = await profilesRef
                .orderBy('created_at', 'desc')
                .limit(limit * page) // For simple offset-less pagination in this demo
                .get();
        }

        let users: AdminUserListItem[] = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                uid: doc.id,
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                email: data.email || '',
                phone_number: data.phone_number?.value || data.phone_number || '',
                role: data.role,
                status: data.status,
                created_at: data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at),
            };
        });

        // Filter by search in memory
        if (search) {
            const s = search.toLowerCase();
            users = users.filter(u =>
                u.first_name.toLowerCase().includes(s) ||
                u.last_name.toLowerCase().includes(s) ||
                u.email.toLowerCase().includes(s) ||
                u.phone_number.toLowerCase().includes(s)
            );
            // Re-apply sorting
            users.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        }

        const total = users.length;
        const startIndex = (page - 1) * limit;
        const pagedUsers = users.slice(startIndex, startIndex + limit);

        return {
            users: pagedUsers,
            total,
            hasMore: startIndex + limit < total,
        };
    }
}
