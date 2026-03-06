import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../firebase/firebase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private bucket: any;

    constructor(
        private configService: ConfigService,
        private firebaseService: FirebaseService
    ) {
        const bucketName = this.configService.get<string>('FIREBASE_STORAGE_BUCKET') || `${this.configService.get('FIREBASE_PROJECT_ID')}.firebasestorage.app`;
        this.bucket = this.firebaseService.getStorage().bucket(bucketName);
    }

    async uploadFile(file: any, path: string): Promise<string> {
        const fileName = `${path}/${uuidv4()}_${file.originalname}`;
        const fileUpload = this.bucket.file(fileName);

        const stream = fileUpload.createWriteStream({
            metadata: {
                contentType: file.mimetype,
            },
        });

        return new Promise((resolve, reject) => {
            stream.on('error', (error: any) => {
                this.logger.error(`Error uploading file to storage: ${error.message}`);
                reject(error);
            });

            stream.on('finish', async () => {
                // If using emulator, we might need a different way to get the URL
                // For production/standard firebase, we make it public or get a signed URL
                // Given the current setup, we'll use makePublic for simplicity if not on emulator
                // or generate a permanent download URL format.

                try {
                    await fileUpload.makePublic();
                    const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
                    resolve(publicUrl);
                } catch (error: any) {
                    this.logger.warn(`Could not make file public, generating signed URL instead: ${error.message}`);
                    const [url] = await fileUpload.getSignedUrl({
                        action: 'read',
                        expires: '03-01-2500', // Far future
                    });
                    resolve(url);
                }
            });

            stream.end(file.buffer);
        });
    }
}
