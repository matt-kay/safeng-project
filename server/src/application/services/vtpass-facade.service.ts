import { Injectable, Logger } from '@nestjs/common';
import { VTPassService } from '../../infrastructure/services/vtpass/vtpass.service';
import {
  VTPassCacheService,
  VTPassVariation,
} from '../../infrastructure/services/vtpass/vtpass-cache.service';
import { VTPassException } from '../../infrastructure/services/vtpass/vtpass.errors';

@Injectable()
export class VTPassFacadeService {
  private readonly logger = new Logger(VTPassFacadeService.name);

  constructor(
    private readonly vtpassService: VTPassService,
    private readonly cacheService: VTPassCacheService,
  ) { }

  /**
   * Retrieves variation codes for a specific service.
   * Uses cache if available and not expired.
   */
  async getServiceVariations(
    serviceId: string,
    forceRefresh: boolean = false,
  ): Promise<VTPassVariation[]> {
    if (!forceRefresh) {
      const cached = await this.cacheService.getVariationCodes(serviceId);
      if (cached) {
        return cached;
      }
    }

    const response = await this.vtpassService.getVariationCodes(serviceId);

    const variationsList = response?.content?.variations || response?.content?.varations;

    if (variationsList && Array.isArray(variationsList)) {
      const variations = variationsList as VTPassVariation[];
      await this.cacheService.setVariationCodes(serviceId, variations);
      return variations;
    }

    this.logger.warn(
      `No variations found or unexpected format for serviceId: ${serviceId}. Raw response: ${JSON.stringify(response)}`,
    );
    return [];
  }

  /**
   * Verifies merchant details (e.g., Meter Number, Smartcard Number).
   */
  async verifyMerchant(
    serviceId: string,
    billerCode: string,
    type?: string,
  ): Promise<any> {
    const response = await this.vtpassService.verifyMerchant(
      serviceId,
      billerCode,
      type,
    );
    return response.content;
  }

  /**
   * Executes a payment or top-up via VTpass.
   */
  async processPayment(payload: {
    request_id: string;
    serviceID: string;
    billersCode: string;
    variation_code?: string;
    amount?: number;
    phone: string;
    subscription_type?: string;
  }): Promise<any> {
    return this.vtpassService.pay(payload);
  }

  /**
   * Requeries a transaction status via VTpass.
   */
  async requeryTransaction(requestId: string): Promise<any> {
    return this.vtpassService.requeryTransaction(requestId);
  }

  /**
   * Retrieves the current environment and wallet balance.
   */
  async getVTPassStatus(): Promise<{ environment: string; balance: number }> {
    try {
      const response = await this.vtpassService.getWalletBalance();
      return {
        environment: this.vtpassService.getEnvironment(),
        balance: response?.contents?.balance !== undefined ? parseFloat(response.contents.balance) : 0,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve VTPass wallet balance', error);
      return {
        environment: this.vtpassService.getEnvironment(),
        balance: 0,
      };
    }
  }
}
