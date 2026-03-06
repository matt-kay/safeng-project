import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserAccessPolicy } from '../../domain/patterns/user-access.policy';
import { UserRole } from '../../domain/value-objects/user-role';
import { UserStatus } from '../../domain/value-objects/user-status';
import { PhoneNumber } from '../../domain/value-objects/phone-number';

export class UpdateUserProfileCommand {
  constructor(
    public readonly uid: string,
    public readonly targetUid: string,
    public readonly data: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone_number?: string;
      disabled?: boolean;
      role?: UserRole;
      status?: UserStatus;
    },
  ) {}
}

@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileHandler implements ICommandHandler<UpdateUserProfileCommand> {
  constructor(
    @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
  ) {}

  async execute(command: UpdateUserProfileCommand) {
    const isSelf = command.uid === command.targetUid;

    const callerUser = await this.userRepo.findById(command.uid);
    if (!callerUser) throw new NotFoundException('Caller not found');

    const targetUser = isSelf
      ? callerUser
      : await this.userRepo.findById(command.targetUid);
    if (!targetUser || targetUser.isProfileMissing()) {
      throw new NotFoundException('Profile not found');
    }

    const policy = new UserAccessPolicy(callerUser);

    if (isSelf) {
      if (!policy.canModifySelf()) {
        throw new ForbiddenException('User is inactive, suspended or deleted');
      }
      if (command.data.first_name)
        targetUser.profile!.first_name = command.data.first_name;
      if (command.data.last_name)
        targetUser.profile!.last_name = command.data.last_name;
      if (command.data.email !== undefined)
        targetUser.profile!.email = command.data.email;
      if (command.data.phone_number) {
        targetUser.profile!.phone_number = new PhoneNumber(
          command.data.phone_number,
        );
      }
    } else {
      if (!policy.isAdmin()) {
        throw new ForbiddenException('Admin access required');
      }
      if (command.data.first_name)
        targetUser.profile!.first_name = command.data.first_name;
      if (command.data.last_name)
        targetUser.profile!.last_name = command.data.last_name;
      if (command.data.email !== undefined)
        targetUser.profile!.email = command.data.email;
      if (command.data.phone_number) {
        targetUser.profile!.phone_number = new PhoneNumber(
          command.data.phone_number,
        );
      }
      if (command.data.role) targetUser.profile!.role = command.data.role;
      if (command.data.status) targetUser.profile!.status = command.data.status;
      if (command.data.disabled !== undefined) {
        (targetUser.identity as any).disabled = command.data.disabled;
      }
    }

    targetUser.profile!.updated_at = new Date();
    await this.userRepo.save(targetUser);

    return targetUser;
  }
}
