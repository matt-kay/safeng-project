import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { FirestoreReportRepository } from '../../infrastructure/repositories/firestore-report.repository';
import { ReportType } from '../../domain/value-objects/report-type';
import { ReportLocation, Report } from '../../domain/entities/report';
import { ReportStatus } from '../../domain/value-objects/report-status';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

export class UpdateReportCommand {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly type: ReportType,
        public readonly location: ReportLocation,
        public readonly description: string,
        public readonly media: string[],
        public readonly otherTitle?: string,
    ) { }
}

@CommandHandler(UpdateReportCommand)
export class UpdateReportHandler implements ICommandHandler<UpdateReportCommand> {
    constructor(private readonly reportRepo: FirestoreReportRepository) { }

    async execute(command: UpdateReportCommand): Promise<void> {
        const existingReport = await this.reportRepo.getById(command.id);

        if (!existingReport) {
            throw new NotFoundException(`Report with ID ${command.id} not found`);
        }

        if (existingReport.userId !== command.userId) {
            throw new ForbiddenException('You do not have permission to update this report');
        }

        const updatedReport = new Report(
            command.id,
            command.userId,
            command.type,
            command.location,
            command.description,
            command.media,
            command.otherTitle,
            ReportStatus.PENDING, // Reset status to PENDING
            undefined, // Clear rejection reason if any
            existingReport.createdAt,
            new Date(),
        );

        await this.reportRepo.update(updatedReport);
    }
}
