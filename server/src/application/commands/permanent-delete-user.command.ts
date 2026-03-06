import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserAccessPolicy } from '../../domain/patterns/user-access.policy';

export class PermanentDeleteUserCommand {
  constructor(
    public readonly uid: string,
    public readonly targetUid: string,
    public readonly reason?: string,
    public readonly alsoDeleteProfile: boolean = true,
  ) {}
}

@CommandHandler(PermanentDeleteUserCommand)
export class PermanentDeleteUserHandler implements ICommandHandler<PermanentDeleteUserCommand> {
  constructor(
    @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
  ) {}

  async execute(command: PermanentDeleteUserCommand) {
    const callerUser = await this.userRepo.findById(command.uid);
    if (!callerUser) throw new NotFoundException('Caller not found');

    const policy = new UserAccessPolicy(callerUser);
    if (!policy.isAdmin()) {
      throw new ForbiddenException('Admin access required');
    }

    const targetUser = await this.userRepo.findById(command.targetUid);
    if (!targetUser || targetUser.isProfileMissing()) {
      throw new NotFoundException('Profile not found');
    }

    await this.userRepo.permanentDelete(
      command.targetUid,
      command.alsoDeleteProfile,
    );
  }
}
