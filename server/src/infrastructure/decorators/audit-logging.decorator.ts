import { Injectable, Inject } from '@nestjs/common';
import type { IUserRepository } from '../../application/ports/user.repository.interface';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import type { IAuditRepository } from '../../application/ports/repositories/IAuditRepository';

@Injectable()
export class AuditLoggingDecorator implements IUserRepository {
  constructor(
    @Inject('INNER_USER_REPOSITORY') private readonly inner: IUserRepository,
    @Inject('IAuditRepository') private readonly auditRepo: IAuditRepository,
  ) {}

  async findById(uid: string): Promise<UserAggregate | null> {
    return this.inner.findById(uid);
  }

  async save(aggregate: UserAggregate): Promise<void> {
    const before = await this.inner.findById(aggregate.uid);
    await this.inner.save(aggregate);

    if (before?.profile) {
      await this.logAction(
        'profile_update',
        aggregate.uid,
        aggregate.uid,
        null,
        before.profile,
        aggregate.profile,
      );
    } else if (aggregate.profile) {
      await this.logAction(
        'profile_create',
        aggregate.uid,
        aggregate.uid,
        null,
        null,
        aggregate.profile,
      );
    }
  }

  async softDelete(
    uid: string,
    reason?: string,
    deletedBy?: string,
  ): Promise<void> {
    const before = await this.inner.findById(uid);
    await this.inner.softDelete(uid, reason, deletedBy);

    await this.logAction(
      'soft_delete',
      deletedBy || uid,
      uid,
      reason || null,
      before?.profile,
      { status: 'deleted', deleted_reason: reason },
    );
  }

  async permanentDelete(
    uid: string,
    alsoDeleteProfile: boolean,
  ): Promise<void> {
    const before = await this.inner.findById(uid);
    await this.inner.permanentDelete(uid, alsoDeleteProfile);
    await this.logAction(
      'permanent_delete',
      'system',
      uid,
      `alsoDeleteProfile: ${alsoDeleteProfile}`,
      before?.profile,
      null,
    );
  }

  private async logAction(
    action: string,
    actorUid: string,
    targetUid: string,
    reason: string | null,
    beforeData: any,
    afterData: any,
  ) {
    await this.auditRepo.save({
      action,
      actor_uid: actorUid,
      target_uid: targetUid,
      reason,
      before: beforeData ? JSON.parse(JSON.stringify(beforeData)) : null,
      after: afterData ? JSON.parse(JSON.stringify(afterData)) : null,
      created_at: new Date(),
    });
  }
}
