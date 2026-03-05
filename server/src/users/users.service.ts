import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UsersRepository, UserProfile } from './users.repository';
import { FirebaseService } from '../firebase/firebase.module';

export interface UserSession {
    uid: string;
    role: 'customer' | 'admin' | null;
    effective_status: 'active' | 'inactive' | 'suspended' | 'deleted';
    profile_exists: boolean;
}

@Injectable()
export class UsersService {
    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly firebase: FirebaseService
    ) { }

    async getSession(uid: string): Promise<UserSession> {
        const [profile, userRecord] = await Promise.all([
            this.usersRepository.findById(uid),
            this.firebase.auth.getUser(uid).catch(() => null),
        ]);

        if (!userRecord) {
            throw new NotFoundException('Identity not found');
        }

        const disabled = userRecord.disabled || false;

        let effective_status: UserSession['effective_status'] = 'active';

        if (profile) {
            if (profile.status === 'deleted') effective_status = 'deleted';
            else if (profile.status === 'suspended') effective_status = 'suspended';
            else if (disabled) effective_status = 'inactive';
            else effective_status = profile.status;
        } else {
            if (disabled) effective_status = 'inactive';
        }

        return {
            uid,
            role: profile?.role || null,
            effective_status,
            profile_exists: !!profile,
        };
    }

    async getSelf(uid: string) {
        const [profile, userRecord] = await Promise.all([
            this.usersRepository.findById(uid),
            this.firebase.auth.getUser(uid).catch(() => null),
        ]);

        if (!userRecord) {
            throw new NotFoundException('Identity not found');
        }

        if (!profile) {
            return {
                uid,
                identity: userRecord,
                profile: null,
                profile_missing: true,
            };
        }

        return {
            user: {
                uid,
                identity: userRecord,
                profile,
            }
        };
    }

    async createProfile(uid: string, data: { first_name: string; last_name: string; email?: string }) {
        const existing = await this.usersRepository.findById(uid);
        if (existing) {
            throw new ConflictException('Profile already exists');
        }

        const userRecord = await this.firebase.auth.getUser(uid).catch(() => null);
        if (!userRecord) {
            throw new NotFoundException('Identity not found');
        }

        const newProfile: UserProfile = {
            uid,
            first_name: data.first_name.trim(),
            last_name: data.last_name.trim(),
            email: data.email,
            phone_number: userRecord.phoneNumber || '',
            role: 'customer',
            status: 'active',
        };

        await this.usersRepository.create(newProfile);

        // Best-effort Firebase sync
        try {
            await this.firebase.auth.updateUser(uid, {
                displayName: `${newProfile.first_name} ${newProfile.last_name}`.trim(),
            });
            await this.firebase.auth.setCustomUserClaims(uid, { role: 'customer', status: 'active' });
        } catch (e) { }

        return this.getSelf(uid);
    }

    async updateProfile(uid: string, data: { first_name?: string; last_name?: string; email?: string }) {
        await this.usersRepository.update(uid, data);

        const profile = await this.usersRepository.findById(uid);
        if (profile) {
            try {
                await this.firebase.auth.updateUser(uid, {
                    displayName: `${profile.first_name} ${profile.last_name}`.trim(),
                });
            } catch (e) { }
        }

        return this.getSelf(uid);
    }

    async softDeleteSelf(uid: string) {
        const profile = await this.usersRepository.findById(uid);
        if (!profile) throw new NotFoundException('Profile missing');
        if (profile.status === 'deleted') return;

        await this.usersRepository.update(uid, {
            status: 'deleted',
            deleted_at: new Date() as any,
            deleted_by: uid,
        });

        try {
            await this.firebase.auth.updateUser(uid, { disabled: true });
            await this.firebase.auth.revokeRefreshTokens(uid);
        } catch (e) { }
    }
}
