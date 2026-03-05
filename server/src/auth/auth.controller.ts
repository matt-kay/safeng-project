import { Controller, Get, Post, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { RolesGuard } from './roles.guard';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../firebase/firebase.module';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
    constructor(
        private readonly usersService: UsersService,
        private readonly firebase: FirebaseService
    ) { }

    @Get('session')
    @UseGuards(FirebaseAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user session' })
    @ApiResponse({ status: 200, description: 'Session data retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getSession(@Req() req) {
        // Requires just token
        return this.usersService.getSession(req.user.uid);
    }

    @Post('logout')
    @HttpCode(204)
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout and revoke refresh tokens' })
    @ApiResponse({ status: 204, description: 'Successfully logged out' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async logout(@Req() req) {
        // Requires valid token + profile/effective_status check from RolesGuard
        // The spec says valid token required, so RolesGuard could optionally be omitted 
        // if logout is allowed for inactive profiles. But RolesGuard allows inactive if we don't specify Roles.
        try {
            await this.firebase.auth.revokeRefreshTokens(req.user.uid);
        } catch (e) { }
    }
}
