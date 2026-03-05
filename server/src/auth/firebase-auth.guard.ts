import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.module';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
    constructor(private readonly firebaseService: FirebaseService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const decodedToken = await this.firebaseService.auth.verifyIdToken(token);

            // Inject the decoded token into the request. 
            // This serves as the caller's identity.
            request.user = decodedToken;
            return true;
        } catch (e) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
