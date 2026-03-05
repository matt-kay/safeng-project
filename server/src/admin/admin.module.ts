import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditRepository } from './audit.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AdminController],
  providers: [AdminService, AuditRepository],
  exports: [AdminService, AuditRepository]
})
export class AdminModule { }
