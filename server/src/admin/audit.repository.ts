import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.module';
import * as admin from 'firebase-admin';

export interface AuditLogEntry {
    action: 'profile_update' | 'soft_delete' | 'permanent_delete' | 'revoke_tokens' | 'restore';
    actor_uid: string;
    target_uid: string;
    reason?: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    created_at?: admin.firestore.Timestamp;
}

@Injectable()
export class AuditRepository {
    private readonly logger = new Logger(AuditRepository.name);
    private readonly collectionName = 'user_audit_logs';

    constructor(private readonly firebase: FirebaseService) { }

    private get collection() {
        return this.firebase.firestore.collection(this.collectionName);
    }

    async logAction(entry: AuditLogEntry): Promise<void> {
        entry.created_at = admin.firestore.FieldValue.serverTimestamp() as any;
        await this.collection.add(entry);
        this.logger.log(`Audit log: [${entry.action}] by ${entry.actor_uid} on ${entry.target_uid}`);
    }
}
