import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { FirestoreReportRepository } from '../../infrastructure/repositories/firestore-report.repository';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

export class DeleteReportCommand {
    constructor(public readonly id: string, public readonly userId: string) { }
}

@CommandHandler(DeleteReportCommand)
export class DeleteReportHandler implements ICommandHandler<DeleteReportCommand> {
    constructor(private readonly reportRepo: FirestoreReportRepository) { }

    async execute(command: DeleteReportCommand): Promise<void> {
        const existingReport = await this.reportRepo.getById(command.id);

        if (!existingReport) {
            throw new NotFoundException(`Report with ID ${command.id} not found`);
        }

        if (existingReport.userId !== command.userId) {
            throw new ForbiddenException('You do not have permission to delete this report');
        }

        await this.reportRepo.delete(command.id);
    }
}
