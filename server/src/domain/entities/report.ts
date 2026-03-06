import { ReportStatus } from '../value-objects/report-status';
import { ReportType } from '../value-objects/report-type';

export interface ReportLocation {
    latitude: number;
    longitude: number;
    street: string;
    lga: string;
    state: string;
    landmark?: string;
}

export class Report {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly type: ReportType,
        public readonly location: ReportLocation,
        public readonly description: string,
        public readonly media: string[],
        public readonly otherTitle?: string,
        public status: ReportStatus = ReportStatus.PENDING,
        public rejectionReason?: string,
        public readonly createdAt: Date = new Date(),
        public readonly updatedAt: Date = new Date(),
    ) { }
}
