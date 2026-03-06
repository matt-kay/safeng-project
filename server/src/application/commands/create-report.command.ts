import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Report, ReportLocation } from '../../domain/entities/report';
import { ReportType } from '../../domain/value-objects/report-type';
import { FirestoreReportRepository } from '../../infrastructure/repositories/firestore-report.repository';
import { v4 as uuidv4 } from 'uuid';

export class CreateReportCommand {
    constructor(
        public readonly userId: string,
        public readonly type: ReportType,
        public readonly location: ReportLocation,
        public readonly description: string,
        public readonly media: string[],
        public readonly otherTitle?: string,
    ) { }
}

@CommandHandler(CreateReportCommand)
export class CreateReportHandler implements ICommandHandler<CreateReportCommand> {
    constructor(private readonly reportRepo: FirestoreReportRepository) { }

    async execute(command: CreateReportCommand): Promise<Report> {
        const report = new Report(
            uuidv4(),
            command.userId,
            command.type,
            command.location,
            command.description,
            command.media,
            command.otherTitle,
        );

        await this.reportRepo.create(report);
        return report;
    }
}
