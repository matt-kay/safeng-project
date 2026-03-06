import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserAccessPolicy } from '../../domain/patterns/user-access.policy';
import { UserStatus } from '../../domain/value-objects/user-status';

export class SoftDeleteUserCommand {
  constructor(
    public readonly uid: string,
    public readonly targetUid: string,
    public readonly reason?: string,
  ) {}
}

@CommandHandler(SoftDeleteUserCommand)
export class SoftDeleteUserHandler implements ICommandHandler<SoftDeleteUserCommand> {
  constructor(
    @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
  ) {}

  async execute(command: SoftDeleteUserCommand) {
    const isSelf = command.uid === command.targetUid;

    const callerUser = await this.userRepo.findById(command.uid);
    if (!callerUser) throw new NotFoundException('Caller not found');

    const targetUser = isSelf
      ? callerUser
      : await this.userRepo.findById(command.targetUid);
    if (!targetUser || targetUser.isProfileMissing()) {
      throw new NotFoundException('Profile not found');
    }

    if (targetUser.profile!.status === UserStatus.DELETED) {
      return;
    }

    const policy = new UserAccessPolicy(callerUser);

    if (!isSelf) {
      if (!policy.isAdmin()) {
        throw new ForbiddenException('Admin access required');
      }
    }

    const deletedBy = isSelf ? 'self' : 'admin';
    await this.userRepo.softDelete(
      command.targetUid,
      command.reason,
      deletedBy,
    );
  }
}
