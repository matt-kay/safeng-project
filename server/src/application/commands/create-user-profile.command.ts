import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import {
  Inject,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRole } from '../../domain/value-objects/user-role';
import { UserStatus } from '../../domain/value-objects/user-status';
import { UserProfile } from '../../domain/entities/user-profile';

export class CreateUserProfileCommand {
  constructor(
    public readonly uid: string,
    public readonly data: {
      first_name: string;
      last_name: string;
      email?: string;
    },
  ) {}
}

@CommandHandler(CreateUserProfileCommand)
export class CreateUserProfileHandler implements ICommandHandler<CreateUserProfileCommand> {
  constructor(
    @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
  ) {}

  async execute(command: CreateUserProfileCommand) {
    const user = await this.userRepo.findById(command.uid);
    if (!user) throw new NotFoundException('Identity not found');
    if (!user.isProfileMissing())
      throw new ConflictException('Profile already exists');

    if (!command.data.first_name || !command.data.last_name) {
      throw new UnprocessableEntityException('Missing names');
    }

    user.profile = new UserProfile(
      command.uid,
      command.data.first_name,
      command.data.last_name,
      user.identity.phoneNumber,
      UserRole.CUSTOMER,
      UserStatus.ACTIVE,
      command.data.email,
      [],
      [],
      new Date(),
      new Date(),
    );

    await this.userRepo.save(user);

    return user;
  }
}
