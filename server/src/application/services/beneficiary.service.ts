import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { IBeneficiaryRepository } from '../../application/ports/repositories/IBeneficiaryRepository';
import {
  Beneficiary,
  BeneficiaryStatus,
} from '../../domain/entities/Beneficiary';
import { VTPassFacadeService } from '../services/vtpass-facade.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BeneficiaryService {
  private readonly logger = new Logger(BeneficiaryService.name);
  private readonly MAX_BENEFICIARIES_PER_USER = 50;

  constructor(
    @Inject('IBeneficiaryRepository')
    private readonly beneficiaryRepo: IBeneficiaryRepository,
    private readonly vtpassFacade: VTPassFacadeService,
  ) {}

  async createBeneficiary(
    userId: string,
    data: {
      serviceType: string;
      providerServiceId: string;
      billerCode: string;
      billerName: string;
      nickname: string;
      isFavorite?: boolean;
    },
  ): Promise<Beneficiary> {
    // Enforce Limits
    const existingBeneficiaries =
      await this.beneficiaryRepo.findByUserId(userId);
    if (existingBeneficiaries.length >= this.MAX_BENEFICIARIES_PER_USER) {
      throw new BadRequestException(
        `Maximum of ${this.MAX_BENEFICIARIES_PER_USER} beneficiaries reached.`,
      );
    }

    // Check for exact duplicates
    const duplicate = existingBeneficiaries.find(
      (b) =>
        b.serviceType === data.serviceType &&
        b.providerServiceId === data.providerServiceId,
    );
    if (duplicate) {
      throw new BadRequestException(
        'A beneficiary with this number already exists for this service.',
      );
    }

    const beneficiary = new Beneficiary(
      uuidv4(),
      userId,
      data.serviceType,
      data.providerServiceId,
      data.billerCode,
      data.billerName,
      data.nickname,
      data.isFavorite || false,
    );

    // Optional/Required Verification based on service type
    if (data.serviceType === 'tv' || data.serviceType === 'electricity') {
      try {
        this.logger.debug(
          `Verifying beneficiary ${data.providerServiceId} for ${data.serviceType}`,
        );
        const verifyResult = await this.vtpassFacade.verifyMerchant(
          data.billerCode,
          data.providerServiceId,
          data.serviceType, // Usually mapped in facade to correct verification flow
        );

        // Assuming successful verification returns the correct name
        const verifiedName =
          verifyResult.content?.Customer_Name || data.billerName;
        beneficiary.verify(verifiedName, verifyResult.content || {});
      } catch (error: any) {
        this.logger.warn(
          `Verification failed for ${data.providerServiceId}: ${error.message}`,
        );
        // Depending on business rules, we could reject creation or save as UNVERIFIED.
        // Let's reject creation for TV/Electricity to enforce strict trust & safety.
        throw new BadRequestException(
          'Failed to verify the beneficiary account details with the provider.',
        );
      }
    }

    await this.beneficiaryRepo.save(beneficiary);
    return beneficiary;
  }

  async getUserBeneficiaries(userId: string): Promise<Beneficiary[]> {
    return this.beneficiaryRepo.findByUserId(userId);
  }

  async updateBeneficiary(
    userId: string,
    beneficiaryId: string,
    updates: { nickname?: string; isFavorite?: boolean },
  ): Promise<Beneficiary> {
    const beneficiary = await this.beneficiaryRepo.findById(beneficiaryId);
    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    if (beneficiary.userId !== userId) {
      throw new BadRequestException(
        'You do not have permission to modify this beneficiary',
      );
    }

    beneficiary.updateDetails(updates.nickname, updates.isFavorite);
    await this.beneficiaryRepo.save(beneficiary);
    return beneficiary;
  }

  async archiveBeneficiary(
    userId: string,
    beneficiaryId: string,
  ): Promise<void> {
    const beneficiary = await this.beneficiaryRepo.findById(beneficiaryId);

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    if (beneficiary.userId !== userId) {
      throw new BadRequestException(
        'You do not have permission to delete this beneficiary',
      );
    }

    // Hard deleting per implementation plan
    await this.beneficiaryRepo.delete(beneficiaryId);
  }
}
