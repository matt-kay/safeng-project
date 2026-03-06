import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { VTPassFacadeService } from '../../../application/services/vtpass-facade.service';
import { FirebaseAuthGuard } from '../../../presentation/guards/firebase-auth.guard';

@Controller('vtpass')
@UseGuards(FirebaseAuthGuard)
export class VtpassController {
  constructor(private readonly vtpassFacade: VTPassFacadeService) { }

  @Get('variations/:serviceId')
  async getVariations(
    @Param('serviceId') serviceId: string,
    @Query('forceRefresh') forceRefresh?: string,
  ) {
    const variations = await this.vtpassFacade.getServiceVariations(
      serviceId,
      forceRefresh === 'true',
    );
    return {
      status: 'success',
      data: variations,
    };
  }

  @Post('verify')
  async verifyMerchant(
    @Body()
    body: {
      billerCode: string;
      providerServiceId: string;
      serviceType: string;
    },
  ) {
    const result = await this.vtpassFacade.verifyMerchant(
      body.providerServiceId,
      body.billerCode,
      body.serviceType,
    );
    return {
      status: 'success',
      data: result,
    };
  }
}
