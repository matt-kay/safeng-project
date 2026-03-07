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
        const bucketName = this.firebaseService.getStorageBucketName();
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
                try {
                    const storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
                    let url: string;

                    if (storageEmulatorHost) {
                        // In emulator mode, construct a direct URL to avoid signing issues
                        // Format: http://<host>:<port>/v0/b/<bucket>/o/<path>?alt=media
                        const encodedPath = encodeURIComponent(fileName);
                        url = `http://${storageEmulatorHost}/v0/b/${this.bucket.name}/o/${encodedPath}?alt=media`;
                        this.logger.debug(`Generated emulator URL: ${url}`);
                    } else {
                        // Use signed URLs for production
                        const [signedUrl] = await fileUpload.getSignedUrl({
                            action: 'read',
                            expires: '03-01-2500', // Far future
                        });
                        url = signedUrl;
                    }

                    this.logger.log(`File uploaded successfully: ${fileName}`);
                    resolve(url);
                } catch (error: any) {
                    this.logger.error(`Error finalizing upload or generating URL: ${error.message}`);
                    reject(error);
                }
            });

            stream.end(file.buffer);
        });
    }
}
