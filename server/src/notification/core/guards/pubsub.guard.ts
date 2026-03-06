import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class PubSubGuard implements CanActivate {
  private readonly logger = new Logger(PubSubGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const expectedToken = this.configService.get<string>(
      'pubsub.verificationToken',
    );

    if (!expectedToken) {
      const isDev =
        this.configService.get<string>('environment') !== 'production';
      if (isDev) {
        return true;
      }
      this.logger.error(
        'Pub/Sub verification token is not configured in production',
      );
      throw new UnauthorizedException('Configuration error');
    }

    const queryToken = request.query['token'];

    let bearerToken: string | undefined;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.substring(7);
    }

    if (queryToken === expectedToken || bearerToken === expectedToken) {
      return true;
    }

    this.logger.warn(
      `Unauthorized Pub/Sub request attempt from IP: ${request.ip}`,
    );
    throw new UnauthorizedException('Invalid Pub/Sub verification token');
  }
}
