import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private usersService: UsersService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.uid) {
            return false;
        }

        // Always check effective status as required by spec section 2
        const session = await this.usersService.getSession(user.uid);
        request.session = session;

        if (session.effective_status === 'deleted' || session.effective_status === 'suspended') {
            throw new ForbiddenException('Account is deleted or suspended');
        }

        if (!requiredRoles) {
            return true; // No roles required for this route
        }

        if (!session.profile_exists) {
            throw new ForbiddenException('Profile missing');
        }

        if (session.role && requiredRoles.includes(session.role)) {
            return true;
        }

        throw new ForbiddenException('Insufficient role privileges');
    }
}
