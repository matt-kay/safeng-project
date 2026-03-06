import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  IAuditRepository,
  AuditLog,
} from '../../application/ports/repositories/IAuditRepository';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class FirebaseAuditRepository implements IAuditRepository {
  private readonly collectionName = 'user_audit_logs';

  constructor(private readonly firebaseService: FirebaseService) {}

  async save(log: AuditLog): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collectionName).add({
      ...log,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async findByUser(
    uid: string,
    limit: number,
    cursor?: string,
  ): Promise<{ logs: AuditLog[]; nextCursor?: string }> {
    const db = this.firebaseService.getFirestore();
    let query = db
      .collection(this.collectionName)
      .where('target_uid', '==', uid)
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (cursor) {
      const cursorDoc = await db
        .collection(this.collectionName)
        .doc(cursor)
        .get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
      } as AuditLog;
    });

    const nextCursor =
      snapshot.docs.length === limit
        ? snapshot.docs[snapshot.docs.length - 1].id
        : undefined;

    return { logs, nextCursor };
  }
}
