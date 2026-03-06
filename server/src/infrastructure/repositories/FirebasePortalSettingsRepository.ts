import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  IPortalSettingsRepository,
  PortalSettings,
} from '../../application/ports/repositories/IPortalSettingsRepository';

@Injectable()
export class FirebasePortalSettingsRepository
  implements IPortalSettingsRepository, OnApplicationBootstrap
{
  private readonly logger = new Logger(FirebasePortalSettingsRepository.name);
  private readonly collection = 'settings';
  private readonly docId = 'portal';

  private readonly defaultSettings: PortalSettings = {
    exchangeRate: 1500,
    topUpFeePercentage: 1.5,
    maintenanceMode: false,
  };

  constructor() {}

  private get db() {
    return admin.firestore();
  }

  async onApplicationBootstrap() {
    try {
      const doc = await this.db
        .collection(this.collection)
        .doc(this.docId)
        .get();
      if (!doc.exists) {
        this.logger.log(
          'Portal settings not found in database. Initializing default settings.',
        );
        await this.db
          .collection(this.collection)
          .doc(this.docId)
          .set(this.defaultSettings);
      }
    } catch (error) {
      this.logger.error(
        'Failed to initialize portal settings on startup',
        error,
      );
    }
  }

  async getSettings(): Promise<PortalSettings> {
    try {
      const doc = await this.db
        .collection(this.collection)
        .doc(this.docId)
        .get();
      if (!doc.exists) {
        return this.defaultSettings;
      }
      const data = doc.data() as PortalSettings;
      return {
        exchangeRate: data.exchangeRate ?? this.defaultSettings.exchangeRate,
        topUpFeePercentage:
          data.topUpFeePercentage ?? this.defaultSettings.topUpFeePercentage,
        maintenanceMode:
          data.maintenanceMode ?? this.defaultSettings.maintenanceMode,
      };
    } catch (error) {
      this.logger.error(
        'Failed to fetch portal settings from Firestore',
        error,
      );
      return this.defaultSettings;
    }
  }

  async updateSettings(
    settings: Partial<PortalSettings>,
  ): Promise<PortalSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await this.db
      .collection(this.collection)
      .doc(this.docId)
      .set(updated, { merge: true });
    return updated;
  }
}
