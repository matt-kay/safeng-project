import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { StorageService } from '../../infrastructure/storage/storage.service';

@Controller('media')
export class MediaController {
    constructor(private readonly storageService: StorageService) { }

    @Post('upload')
    @UseGuards(FirebaseAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Limit file types if necessary
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException('Invalid file type');
        }

        // Limit file size (e.g., 50MB)
        if (file.size > 50 * 1024 * 1024) {
            throw new BadRequestException('File too large (max 50MB)');
        }

        const url = await this.storageService.uploadFile(file, 'reports');
        return { url };
    }
}
