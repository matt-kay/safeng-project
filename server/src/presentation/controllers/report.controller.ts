import { Controller, Post, Get, UseGuards, Request, Body, Query, Param, Patch, Delete } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { CreateReportCommand } from '../../application/commands/create-report.command';
import { GetReportsQuery } from '../../application/queries/get-reports.query';
import { GetReportByIdQuery } from '../../application/queries/get-report-by-id.query';
import { UpdateReportCommand } from '../../application/commands/update-report.command';
import { DeleteReportCommand } from '../../application/commands/delete-report.command';
import { ReportType } from '../../domain/value-objects/report-type';
import { ReportLocation } from '../../domain/entities/report';

@Controller('reports')
export class ReportController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) { }

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

    @Get()
    @UseGuards(FirebaseAuthGuard)
    async getReports(
        @Request() req: any,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20,
    ) {
        const user = req.user;
        return await this.queryBus.execute(
            new GetReportsQuery(user.uid, Number(page), Number(limit)),
        );
    }

    @Get(':id')
    @UseGuards(FirebaseAuthGuard)
    async getReportById(
        @Request() req: any,
        @Param('id') id: string,
    ) {
        const user = req.user;
        return await this.queryBus.execute(new GetReportByIdQuery(id, user.uid));
    }

    @Patch(':id')
    @UseGuards(FirebaseAuthGuard)
    async updateReport(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { type: ReportType; location: ReportLocation; description: string; media: string[]; otherTitle?: string },
    ) {
        const user = req.user;
        const { type, location, description, media, otherTitle } = body;
        return await this.commandBus.execute(
            new UpdateReportCommand(id, user.uid, type, location, description, media, otherTitle),
        );
    }

    @Delete(':id')
    @UseGuards(FirebaseAuthGuard)
    async deleteReport(
        @Request() req: any,
        @Param('id') id: string,
    ) {
        const user = req.user;
        return await this.commandBus.execute(new DeleteReportCommand(id, user.uid));
    }
}
