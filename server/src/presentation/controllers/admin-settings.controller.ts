import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PortalSettingsService } from '../../application/services/PortalSettingsService';
import { IUserRepositoryToken } from '../../application/ports/user.repository.interface';
import type { IUserRepository } from '../../application/ports/user.repository.interface';
import { Inject } from '@nestjs/common';
import { UserAccessPolicy } from '../../domain/patterns/user-access.policy';
import type { PortalSettings } from '../../application/ports/repositories/IPortalSettingsRepository';

@Controller('admin/settings')
@UseGuards(FirebaseAuthGuard)
export class AdminSettingsController {
  private readonly logger = new Logger(AdminSettingsController.name);

  constructor(
    private readonly settingsService: PortalSettingsService,
    @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
  ) { }

  private async ensureAdmin(uid: string) {
    const user = await this.userRepo.findById(uid);
    if (!user) throw new ForbiddenException('User not found');
    const policy = new UserAccessPolicy(user);
    if (!policy.isAdmin()) {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get()
  async getSettings(@CurrentUser() uid: string) {
    await this.ensureAdmin(uid);
    return this.settingsService.getSettings();
  }

  @Patch()
  async updateSettings(
    @CurrentUser() uid: string,
    @Body() settings: Partial<PortalSettings>,
  ) {
    await this.ensureAdmin(uid);
    this.logger.log(
      `Admin ${uid} updating settings: ${JSON.stringify(settings)}`,
    );
    return this.settingsService.updateSettings(settings);
  }
}
