import {
    Controller,
    Get,
    UseGuards,
    ForbiddenException,
    Logger,
    Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { IUserRepositoryToken } from '../../application/ports/user.repository.interface';
import type { IUserRepository } from '../../application/ports/user.repository.interface';
import { UserAccessPolicy } from '../../domain/patterns/user-access.policy';
import { VTPassFacadeService } from '../../application/services/vtpass-facade.service';

@Controller('admin/integrations')
@UseGuards(FirebaseAuthGuard)
export class AdminIntegrationController {
    private readonly logger = new Logger(AdminIntegrationController.name);

    constructor(
        private readonly vtpassFacadeService: VTPassFacadeService,
        private readonly configService: ConfigService,
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

    @Get('vtpass')
    async getVTPassStatus(@CurrentUser() uid: string) {
        await this.ensureAdmin(uid);
        return this.vtpassFacadeService.getVTPassStatus();
    }

    @Get('stripe')
    async getStripeStatus(@CurrentUser() uid: string) {
        await this.ensureAdmin(uid);
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
        const isLive = secretKey.startsWith('sk_live_');
        return {
            environment: isLive ? 'Live' : 'Sandbox',
        };
    }
}
