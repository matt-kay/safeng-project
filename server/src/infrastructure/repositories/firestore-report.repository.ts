import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Report } from '../../domain/entities/report';

@Injectable()
export class FirestoreReportRepository {
    private readonly collectionName = 'crime_reports';

    constructor(private readonly firebaseService: FirebaseService) { }

    private get collection() {
        return this.firebaseService.getFirestore().collection(this.collectionName);
    }

    async create(report: Report): Promise<void> {
        const data = this.toFirestore(report);
        await this.collection.doc(report.id).set(data);
    }

    async getById(id: string): Promise<Report | null> {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return this.fromFirestore(doc.id, doc.data());
    }

    async getByUserId(userId: string): Promise<Report[]> {
        const snapshot = await this.collection.where('userId', '==', userId).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => this.fromFirestore(doc.id, doc.data()));
    }

    async getByUserIdPaginated(userId: string, page: number, limit: number): Promise<{ reports: Report[], total: number, hasMore: boolean }> {
        const reports = await this.getByUserId(userId);
        const total = reports.length;
        const startIndex = (page - 1) * limit;
        const pagedReports = reports.slice(startIndex, startIndex + limit);

        return {
            reports: pagedReports,
            total,
            hasMore: startIndex + limit < total,
        };
    }

    async update(report: Report): Promise<void> {
        const data = this.toFirestore(report);
        await this.collection.doc(report.id).set(data, { merge: true });
    }

    async delete(id: string): Promise<void> {
        await this.collection.doc(id).delete();
    }

    private toFirestore(report: Report): any {
        const bucketName = this.firebaseService.getStorage().bucket().name;

        const extractPath = (media: string[] | undefined): string[] => {
            if (!media) return [];
            return media.map(url => {
                // If it's an emulator URL or GCS URL, try to extract the path
                if (url.includes(`/v0/b/${bucketName}/o/`)) {
                    const parts = url.split('/o/');
                    if (parts.length > 1) {
                        const pathPart = parts[1].split('?')[0];
                        return decodeURIComponent(pathPart);
                    }
                }
                if (url.includes(`storage.googleapis.com/${bucketName}/`)) {
                    return url.split(`${bucketName}/`)[1];
                }
                return url;
            });
        };

        return {
            userId: report.userId,
            type: report.type,
            location: report.location,
            description: report.description,
            media: extractPath(report.media),
            otherTitle: report.otherTitle,
            status: report.status,
            rejectionReason: report.rejectionReason,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
        };
    }

    private fromFirestore(id: string, data: any): Report {
        const bucketName = this.firebaseService.getStorage().bucket().name;
        const storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;

        const transformMedia = (media: string[] | undefined): string[] => {
            if (!media) return [];
            return media.map(item => {
                if (item.startsWith('http://') || item.startsWith('https://')) {
                    return item;
                }
                // If it's a path, transform it into a URL
                if (storageEmulatorHost) {
                    return `http://${storageEmulatorHost}/v0/b/${bucketName}/o/${encodeURIComponent(item)}?alt=media`;
                }
                // Fallback to a standard GCS public URL if not in emulator (or signed URL if preferred)
                return `https://storage.googleapis.com/${bucketName}/${item}`;
            });
        };

        return new Report(
            id,
            data.userId,
            data.type,
            data.location,
            data.description,
            transformMedia(data.media),
            data.otherTitle,
            data.status,
            data.rejectionReason,
            data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        );
    }
}
