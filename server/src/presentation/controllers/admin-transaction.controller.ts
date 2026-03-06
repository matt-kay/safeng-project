import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { GetAdminTransactionStatsQuery } from '../../application/queries/get-admin-transaction-stats.query';
import { GetAdminTransactionsQuery } from '../../application/queries/get-admin-transactions.query';
import { GetAdminTransactionQuery } from '../../application/queries/get-admin-transaction.query';
import type { TrendPeriod } from '../../application/queries/get-admin-user-stats.query';

@Controller('admin/transactions')
@UseGuards(FirebaseAuthGuard)
export class AdminTransactionController {
    constructor(
        private readonly queryBus: QueryBus,
    ) { }

    @Get('stats')
    async getTransactionStats(
        @CurrentUser() callerUid: string,
        @Query('period') period: TrendPeriod = 'month',
    ) {
        return this.queryBus.execute(
            new GetAdminTransactionStatsQuery(callerUid, period),
        );
    }

    @Get()
    async getTransactions(
        @CurrentUser() callerUid: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20,
        @Query('filterType') filterType?: 'status' | 'type' | 'category',
        @Query('filterValue') filterValue?: string,
        @Query('search') search?: string,
    ) {
        return this.queryBus.execute(
            new GetAdminTransactionsQuery(
                callerUid,
                Number(page),
                Number(limit),
                filterType,
                filterValue,
                search,
            ),
        );
    }

    @Get(':id')
    async getTransaction(
        @CurrentUser() callerUid: string,
        @Param('id') id: string,
    ) {
        return this.queryBus.execute(
            new GetAdminTransactionQuery(callerUid, id),
        );
    }
}
