import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BeneficiaryService } from '../../application/services/beneficiary.service';
import {
  CreateBeneficiaryDto,
  UpdateBeneficiaryDto,
} from '../dtos/beneficiary.dto';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';

@Controller('beneficiaries')
@UseGuards(FirebaseAuthGuard)
export class BeneficiaryController {
  constructor(private readonly beneficiaryService: BeneficiaryService) {}

  @Post()
  async createBeneficiary(@Request() req, @Body() dto: CreateBeneficiaryDto) {
    const userId = req.user.uid;
    const beneficiary = await this.beneficiaryService.createBeneficiary(
      userId,
      dto,
    );
    return {
      status: 'success',
      message: 'Beneficiary saved successfully',
      data: beneficiary,
    };
  }

  @Get()
  async getUserBeneficiaries(@Request() req) {
    const userId = req.user.uid;
    const beneficiaries =
      await this.beneficiaryService.getUserBeneficiaries(userId);
    return {
      status: 'success',
      data: beneficiaries,
    };
  }

  @Patch(':id')
  async updateBeneficiary(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateBeneficiaryDto,
  ) {
    const userId = req.user.uid;
    const beneficiary = await this.beneficiaryService.updateBeneficiary(
      userId,
      id,
      dto,
    );
    return {
      status: 'success',
      message: 'Beneficiary updated successfully',
      data: beneficiary,
    };
  }

  @Delete(':id')
  async archiveBeneficiary(@Request() req, @Param('id') id: string) {
    const userId = req.user.uid;
    await this.beneficiaryService.archiveBeneficiary(userId, id);
    return {
      status: 'success',
      message: 'Beneficiary removed successfully',
    };
  }
}
