import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('api/v1')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @UseGuards(FirebaseAuthGuard)
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getMe(@Req() req) {
        return this.usersService.getSelf(req.user.uid);
    }

    @Post('users/profile')
    @UseGuards(FirebaseAuthGuard)
    @ApiOperation({ summary: 'Create user profile' })
    @ApiResponse({ status: 201, description: 'Profile created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async createProfile(@Req() req, @Body() body: { first_name: string; last_name: string; email?: string }) {
        return this.usersService.createProfile(req.user.uid, body);
    }

    @Patch('me/profile')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async updateProfile(@Req() req, @Body() body: { first_name?: string; last_name?: string; email?: string }) {
        if (Object.keys(body).length === 0) {
            throw new Error('Empty body'); // TODO: Update to nest exception
        }
        return this.usersService.updateProfile(req.user.uid, body);
    }

    @Delete('me')
    @HttpCode(204)
    @UseGuards(FirebaseAuthGuard)
    @ApiOperation({ summary: 'Soft delete current user' })
    @ApiResponse({ status: 204, description: 'User deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async deleteSelf(@Req() req) {
        await this.usersService.softDeleteSelf(req.user.uid);
    }

    @Get('users/:uid')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Get a specific user by UID' })
    @ApiParam({ name: 'uid', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Not Found' })
    async getUser(@Req() req, @Param('uid') uid: string) {
        if (uid === req.user.uid) {
            return this.usersService.getSelf(uid);
        }
        // Spec: Non-admin requesting other users -> 404
        // Admin request will be handled in admin.controller.ts, but standard users route handles self.
        const session = req.session;
        if (session.role !== 'admin') {
            throw new Error('Not found'); // Return 404 properly later
        }
        return this.usersService.getSelf(uid);
    }

    @Post('me/devices')
    @HttpCode(204)
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Register a device token' })
    @ApiResponse({ status: 204, description: 'Device registered successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async registerDevice(@Req() req, @Body() body: { token: string; type: 'fcm' | 'apn' }) {
        await this.usersService['usersRepository'].addDeviceToken(req.user.uid, body.token, body.type);
    }

    @Delete('me/devices/:token')
    @HttpCode(204)
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Remove a device token' })
    @ApiParam({ name: 'token', description: 'Device token' })
    @ApiResponse({ status: 204, description: 'Device removed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async removeDevice(@Req() req, @Param('token') token: string) {
        await this.usersService['usersRepository'].removeDeviceToken(req.user.uid, token);
    }
}
