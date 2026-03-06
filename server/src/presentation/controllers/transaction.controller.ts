import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Inject,
} from '@nestjs/common';
import { TransactionExecutionService } from '../../application/services/transaction-execution.service';
import { InitiateTransactionDto } from '../dtos/vtpass-transaction.dto';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import type { ITransactionRepository } from '../../application/ports/repositories/ITransactionRepository';

@Controller('transactions')
@UseGuards(FirebaseAuthGuard)
export class TransactionController {
  constructor(
    private readonly transactionExecutionService: TransactionExecutionService,
    @Inject('ITransactionRepository')
    private readonly transactionRepo: ITransactionRepository,
  ) { }

  @Get()
  async listTransactions(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.uid;
    const p = parseInt(page || '1', 10);
    const l = parseInt(limit || '20', 10);
    const offset = (p - 1) * l;

    const transactions = await this.transactionRepo.findByUserId(
      userId,
      l,
      offset,
    );

    return {
      status: 'success',
      data: transactions,
      meta: {
        page: p,
        limit: l,
      },
    };
  }

  @Get('vtu')
  async listVtuTransactions(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.uid;
    const p = parseInt(page || '1', 10);
    const l = parseInt(limit || '20', 10);
    const offset = (p - 1) * l;

    const transactions = await this.transactionRepo.findVtuTransactionsByUserId(
      userId,
      l,
      offset,
    );

    return {
      status: 'success',
      data: transactions,
      meta: {
        page: p,
        limit: l,
      },
    };
  }

  @Post('initiate')
  async initiateTransaction(
    @Request() req,
    @Body() dto: InitiateTransactionDto,
  ) {
    const userId = req.user.uid;
    const transaction = await this.transactionExecutionService.executePurchase(
      userId,
      dto,
    );

    return {
      status: 'success',
      message: 'Transaction processed',
      data: transaction,
    };
  }

  @Get(':id')
  async getTransaction(@Request() req, @Param('id') id: string) {
    const userId = req.user.uid;
    const transaction = await this.transactionRepo.findById(id);

    if (!transaction || transaction.userId !== userId) {
      return {
        status: 'error',
        message: 'Transaction not found',
      };
    }

    return {
      status: 'success',
      data: transaction,
    };
  }
}
