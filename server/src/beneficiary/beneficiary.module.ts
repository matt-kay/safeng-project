import { Module } from '@nestjs/common';
import { BeneficiaryController } from '../presentation/controllers/beneficiary.controller';
import { BeneficiaryService } from '../application/services/beneficiary.service';
import { FirebaseBeneficiaryRepository } from '../infrastructure/repositories/FirebaseBeneficiaryRepository';
import { VtpassModule } from '../infrastructure/services/vtpass/vtpass.module';

@Module({
  imports: [VtpassModule],
  controllers: [BeneficiaryController],
  providers: [
    BeneficiaryService,
    {
      provide: 'IBeneficiaryRepository',
      useClass: FirebaseBeneficiaryRepository,
    },
  ],
  exports: [BeneficiaryService],
})
export class BeneficiaryModule {}
