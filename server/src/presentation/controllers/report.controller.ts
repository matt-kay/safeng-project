import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { CreateReportCommand } from '../../application/commands/create-report.command';
import { ReportType } from '../../domain/value-objects/report-type';
import { ReportLocation } from '../../domain/entities/report';

@Controller('reports')
export class ReportController {
    constructor(private readonly commandBus: CommandBus) { }

    @Post()
    @UseGuards(FirebaseAuthGuard)
    async createReport(
        @Request() req: any,
        @Body() body: { type: ReportType; location: ReportLocation; description: string; media: string[]; otherTitle?: string },
    ) {
        const user = req.user;
        const { type, location, description, media, otherTitle } = body;

        return await this.commandBus.execute(
            new CreateReportCommand(user.uid, type, location, description, media, otherTitle),
        );
    }
}
