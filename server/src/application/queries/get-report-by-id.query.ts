import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FirestoreReportRepository } from '../../infrastructure/repositories/firestore-report.repository';
import { Report } from '../../domain/entities/report';
import { NotFoundException } from '@nestjs/common';

export class GetReportByIdQuery {
    constructor(public readonly id: string, public readonly userId: string) { }
}

@QueryHandler(GetReportByIdQuery)
export class GetReportByIdHandler implements IQueryHandler<GetReportByIdQuery> {
    constructor(private readonly reportRepo: FirestoreReportRepository) { }

    async execute(query: GetReportByIdQuery): Promise<Report> {
        const report = await this.reportRepo.getById(query.id);

        if (!report || report.userId !== query.userId) {
            throw new NotFoundException(`Report with ID ${query.id} not found`);
        }

        return report;
    }
}
