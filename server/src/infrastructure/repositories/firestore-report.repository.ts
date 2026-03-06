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
        const snapshot = await this.collection.where('userId', '==', userId).get();
        return snapshot.docs.map(doc => this.fromFirestore(doc.id, doc.data()));
    }

    async update(id: string, updates: Partial<Report>): Promise<void> {
        const data = { ...updates, updatedAt: new Date() };
        await this.collection.doc(id).update(data);
    }

    private toFirestore(report: Report): any {
        return {
            userId: report.userId,
            type: report.type,
            location: report.location,
            description: report.description,
            media: report.media,
            otherTitle: report.otherTitle,
            status: report.status,
            rejectionReason: report.rejectionReason,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
        };
    }

    private fromFirestore(id: string, data: any): Report {
        return new Report(
            id,
            data.userId,
            data.type,
            data.location,
            data.description,
            data.media,
            data.otherTitle,
            data.status,
            data.rejectionReason,
            data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        );
    }
}
