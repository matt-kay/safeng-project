import { Controller, Get, Logger } from '@nestjs/common';
import { PortalSettingsService } from '../../application/services/PortalSettingsService';

@Controller('settings/public')
export class PublicSettingsController {
    private readonly logger = new Logger(PublicSettingsController.name);

    constructor(private readonly settingsService: PortalSettingsService) { }

    @Get()
    async getPublicSettings() {
        return this.settingsService.getPublicSettings();
    }
}
