import { Injectable, Inject } from '@nestjs/common';
import type {
  IPortalSettingsRepository,
  PortalSettings,
} from '../ports/repositories/IPortalSettingsRepository';

@Injectable()
export class PortalSettingsService {
  constructor(
    @Inject('IPortalSettingsRepository')
    private readonly settingsRepo: IPortalSettingsRepository,
  ) { }

  async getSettings(): Promise<PortalSettings> {
    return this.settingsRepo.getSettings();
  }

  async getPublicSettings(): Promise<Pick<PortalSettings, 'maintenanceMode'>> {
    const settings = await this.settingsRepo.getSettings();
    return { maintenanceMode: settings.maintenanceMode };
  }

  async getExchangeRate(): Promise<number> {
    const settings = await this.getSettings();
    return settings.exchangeRate;
  }

  async getTopUpFeePercentage(): Promise<number> {
    const settings = await this.getSettings();
    return settings.topUpFeePercentage;
  }

  async isMaintenanceMode(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.maintenanceMode;
  }

  async updateSettings(
    settings: Partial<PortalSettings>,
  ): Promise<PortalSettings> {
    return this.settingsRepo.updateSettings(settings);
  }
}
