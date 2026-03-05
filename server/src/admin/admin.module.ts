import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditRepository } from './audit.repository';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AuditRepository],
  exports: [AdminService, AuditRepository]
})
export class AdminModule { }
