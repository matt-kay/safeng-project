import { Controller, Get, Patch, Delete, Post, Body, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { AdminService } from './admin.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard, ROLES_KEY } from '../auth/roles.guard';
import { SetMetadata } from '@nestjs/common';

const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Controller('api/v1/admin/users')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get()
    async listUsers() {
        // Basic implementation since pagination specs omit exact firebase sync details
        // But since it's just proxying the collection query
        return this.adminService.listUsers();
    }

    @Patch(':uid')
    async updateUser(@Req() req, @Param('uid') uid: string, @Body() body: any) {
        return this.adminService.updateUser(req.user.uid, uid, body);
    }

    @Delete(':uid')
    @HttpCode(204)
    async softDeleteUser(@Req() req, @Param('uid') uid: string, @Body() body: any) {
        await this.adminService.softDeleteUser(req.user.uid, uid, body.reason);
    }

    @Delete(':uid/permanent')
    @HttpCode(204)
    async permanentDeleteUser(@Req() req, @Param('uid') uid: string, @Body() body: any) {
        await this.adminService.permanentDeleteUser(req.user.uid, uid, body.reason, body.also_delete_profile);
    }

    @Post(':uid/revoke-tokens')
    @HttpCode(204)
    async revokeTokens(@Req() req, @Param('uid') uid: string, @Body() body: any) {
        await this.adminService.revokeTokens(req.user.uid, uid, body.reason);
    }
}
