import {
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { FirebaseAdminProvider } from '../../infrastructure/repositories/firebase-admin.provider';
import { GetUserProfileQuery } from '../../application/queries/get-user-profile.query';

@Controller('auth')
@UseGuards(FirebaseAuthGuard)
export class AuthController {
  constructor(
    private readonly firebaseProvider: FirebaseAdminProvider,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() uid: string) {
    await this.firebaseProvider.revokeRefreshTokens(uid);
  }

  @Get('session')
  async getSession(@CurrentUser() uid: string) {
    const userView: any = await this.queryBus.execute(
      new GetUserProfileQuery(uid, uid),
    );
    return {
      uid: uid,
      role: userView.role || null,
      effective_status: userView.effective_status || 'inactive',
      profile_exists: !userView.profile_missing,
    };
  }
}
