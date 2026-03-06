import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FirestoreReportRepository } from '../../infrastructure/repositories/firestore-report.repository';
import { Report } from '../../domain/entities/report';

export class GetReportsQuery {
    constructor(
        public readonly userId: string,
        public readonly page: number = 1,
        public readonly limit: number = 20,
    ) { }
}

export interface GetReportsResponse {
    reports: Report[];
    total: number;
    hasMore: boolean;
}

@QueryHandler(GetReportsQuery)
export class GetReportsHandler implements IQueryHandler<GetReportsQuery> {
    constructor(private readonly reportRepo: FirestoreReportRepository) { }

    async execute(query: GetReportsQuery): Promise<GetReportsResponse> {
        const { userId, page, limit } = query;
        return await this.reportRepo.getByUserIdPaginated(userId, page, limit);
    }
}
