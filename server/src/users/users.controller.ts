import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/v1')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @UseGuards(FirebaseAuthGuard)
    async getMe(@Req() req) {
        return this.usersService.getSelf(req.user.uid);
    }

    @Post('users/profile')
    @UseGuards(FirebaseAuthGuard)
    async createProfile(@Req() req, @Body() body: { first_name: string; last_name: string; email?: string }) {
        return this.usersService.createProfile(req.user.uid, body);
    }

    @Patch('me/profile')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    async updateProfile(@Req() req, @Body() body: { first_name?: string; last_name?: string; email?: string }) {
        if (Object.keys(body).length === 0) {
            throw new Error('Empty body'); // TODO: Update to nest exception
        }
        return this.usersService.updateProfile(req.user.uid, body);
    }

    @Delete('me')
    @HttpCode(204)
    @UseGuards(FirebaseAuthGuard)
    async deleteSelf(@Req() req) {
        await this.usersService.softDeleteSelf(req.user.uid);
    }

    @Get('users/:uid')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
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
    async registerDevice(@Req() req, @Body() body: { token: string; type: 'fcm' | 'apn' }) {
        await this.usersService['usersRepository'].addDeviceToken(req.user.uid, body.token, body.type);
    }

    @Delete('me/devices/:token')
    @HttpCode(204)
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    async removeDevice(@Req() req, @Param('token') token: string) {
        await this.usersService['usersRepository'].removeDeviceToken(req.user.uid, token);
    }
}
