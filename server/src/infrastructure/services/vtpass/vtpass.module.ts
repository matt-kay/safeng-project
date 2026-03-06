import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VTPassService } from './vtpass.service';
import { VTPassCacheService } from './vtpass-cache.service';
import { VTPassFacadeService } from '../../../application/services/vtpass-facade.service';
import { VtpassController } from './vtpass.controller';

@Module({
  imports: [HttpModule],
  controllers: [VtpassController],
  providers: [VTPassService, VTPassCacheService, VTPassFacadeService],
  exports: [VTPassFacadeService],
})
export class VtpassModule {}
