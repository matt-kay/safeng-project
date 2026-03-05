import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { FirebaseService } from '../firebase/firebase.module';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class AdminService {
    constructor(
        private readonly auditRepository: AuditRepository,
        private readonly firebase: FirebaseService,
        private readonly usersRepository: UsersRepository
    ) { }

    async listUsers() {
        const snapshot = await this.firebase.firestore.collection('profiles').limit(50).get();
        const items = snapshot.docs.map(doc => doc.data());
        return {
            items,
            next_cursor: null
        };
    }

    async updateUser(actorUid: string, targetUid: string, data: any) {
        const profile = await this.usersRepository.findById(targetUid);
        if (!profile) throw new NotFoundException('Profile not found');

        const updateData: any = {};
        if (data.first_name) updateData.first_name = data.first_name;
        if (data.last_name) updateData.last_name = data.last_name;
        if (data.role) updateData.role = data.role;
        if (data.status) updateData.status = data.status;

        if (Object.keys(updateData).length > 0) {
            await this.usersRepository.update(targetUid, updateData);
        }

        try {
            if (data.disabled !== undefined) {
                await this.firebase.auth.updateUser(targetUid, { disabled: data.disabled });
            }
            if (data.first_name || data.last_name) {
                const first = data.first_name || profile.first_name;
                const last = data.last_name || profile.last_name;
                await this.firebase.auth.updateUser(targetUid, { displayName: `${first} ${last}`.trim() });
            }
        } catch (e) { }

        await this.auditRepository.logAction({
            action: 'profile_update',
            actor_uid: actorUid,
            target_uid: targetUid,
            reason: data.reason
        });

        return this.usersRepository.findById(targetUid);
    }

    async softDeleteUser(actorUid: string, targetUid: string, reason?: string) {
        const profile = await this.usersRepository.findById(targetUid);
        if (!profile) throw new NotFoundException('Profile not found');

        if (profile.status !== 'deleted') {
            await this.usersRepository.update(targetUid, {
                status: 'deleted',
                deleted_by: actorUid,
                deleted_at: new Date() as any,
                deleted_reason: reason
            });
        }

        try {
            await this.firebase.auth.updateUser(targetUid, { disabled: true });
            await this.firebase.auth.revokeRefreshTokens(targetUid);
        } catch (e) { }

        await this.auditRepository.logAction({
            action: 'soft_delete',
            actor_uid: actorUid,
            target_uid: targetUid,
            reason
        });
    }

    async permanentDeleteUser(actorUid: string, targetUid: string, reason?: string, alsoDeleteProfile: boolean = true) {
        const profile = await this.usersRepository.findById(targetUid);
        if (!profile) throw new NotFoundException('Profile not found');

        try {
            await this.firebase.auth.deleteUser(targetUid);
        } catch (e) { }

        if (alsoDeleteProfile) {
            await this.usersRepository.delete(targetUid);
        } else {
            await this.usersRepository.update(targetUid, {
                first_name: 'Deleted',
                last_name: 'User',
                email: null as any,
                phone_number: 'Deleted',
                status: 'deleted',
                deleted_by: actorUid,
                deleted_at: new Date() as any,
                deleted_reason: reason
            });
        }

        await this.auditRepository.logAction({
            action: 'permanent_delete',
            actor_uid: actorUid,
            target_uid: targetUid,
            reason
        });
    }

    async revokeTokens(actorUid: string, targetUid: string, reason?: string) {
        const profile = await this.usersRepository.findById(targetUid);
        if (!profile) throw new NotFoundException('Profile not found');

        await this.firebase.auth.revokeRefreshTokens(targetUid);

        await this.auditRepository.logAction({
            action: 'revoke_tokens',
            actor_uid: actorUid,
            target_uid: targetUid,
            reason
        });
    }
}
