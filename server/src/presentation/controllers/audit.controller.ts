import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Inject,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import type { IAuditRepository } from '../../application/ports/repositories/IAuditRepository';

@Controller('audit')
@UseGuards(FirebaseAuthGuard)
export class AuditController {
  constructor(
    @Inject('IAuditRepository')
    private readonly auditRepo: IAuditRepository,
  ) {}

  @Get('activities')
  async listActivities(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const userId = req.user.uid;
    const l = parseInt(limit || '20', 10);

    const { logs, nextCursor } = await this.auditRepo.findByUser(
      userId,
      l,
      cursor,
    );

    return {
      status: 'success',
      data: logs,
      meta: {
        limit: l,
        nextCursor,
      },
    };
  }
}
