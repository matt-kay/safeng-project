import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('notification')
export class NotificationController {
  @Get('/health')
  @HttpCode(HttpStatus.OK)
  healthCheck() {
    return {
      status: 'ok',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
    };
  }
}
