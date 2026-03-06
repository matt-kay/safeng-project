import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface VTPassVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice: string;
}

@Injectable()
export class VTPassCacheService {
  private readonly logger = new Logger(VTPassCacheService.name);
  private readonly collectionName = 'vtpass_cache';
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  private get collection() {
    return admin.firestore().collection(this.collectionName);
  }

  async getVariationCodes(
    serviceId: string,
  ): Promise<VTPassVariation[] | null> {
    try {
      const doc = await this.collection.doc(serviceId).get();
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      const lastUpdated = data?.updatedAt?.toDate() || new Date(0);

      if (Date.now() - lastUpdated.getTime() > this.CACHE_TTL_MS) {
        this.logger.debug(`Cache expired for serviceId: ${serviceId}`);
        return null; // Expired, trigger refresh
      }

      return data?.variations as VTPassVariation[];
    } catch (error) {
      this.logger.error(
        `Failed to get variation codes from cache for ${serviceId}`,
        error,
      );
      return null; // Fallback to fetching fresh data
    }
  }

  async setVariationCodes(
    serviceId: string,
    variations: VTPassVariation[],
  ): Promise<void> {
    try {
      await this.collection.doc(serviceId).set(
        {
          variations,
          updatedAt: new Date(),
        },
        { merge: true },
      );
      this.logger.debug(
        `Successfully cached variation codes for serviceId: ${serviceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cache variation codes for ${serviceId}`,
        error,
      );
    }
  }
}
