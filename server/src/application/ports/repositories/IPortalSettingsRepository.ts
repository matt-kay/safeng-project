export interface PortalSettings {
  exchangeRate: number; // 1 USD = X NGN
  topUpFeePercentage: number; // e.g. 1.5 for 1.5%
  maintenanceMode: boolean;
}

export interface IPortalSettingsRepository {
  getSettings(): Promise<PortalSettings>;
  updateSettings(settings: Partial<PortalSettings>): Promise<PortalSettings>;
}
