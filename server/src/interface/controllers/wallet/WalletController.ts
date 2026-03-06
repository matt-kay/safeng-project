import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WalletService } from '../../../application/services/wallet/WalletService';
import { FirebaseAuthGuard } from '../../../presentation/guards/firebase-auth.guard';

@Controller('wallet')
@UseGuards(FirebaseAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('initiate')
  async initiateWallet(@Req() req: any) {
    const userId = req.user.uid;
    const email = req.user.email || req.user.phone_number || '';
    return this.walletService.initiateWallet(userId, email);
  }

  @Get('config')
  async getWalletConfig() {
    return this.walletService.getWalletConfig();
  }

  @Get()
  async getWallet(@Req() req: any) {
    const userId = req.user.uid;
    return this.walletService.getWallet(userId);
  }

  @Get('cards')
  async listCards(@Req() req: any) {
    const userId = req.user.uid;
    return this.walletService.listCards(userId);
  }

  @Post('cards/setup-intent')
  async createSetupIntent(@Req() req: any) {
    const userId = req.user.uid;
    const email = req.user.email || req.user.phone_number || '';
    return this.walletService.createSetupIntent(userId, email);
  }

  @Post('cards/tokenize')
  async tokenizeAndAttachCard(
    @Req() req: any,
    @Body()
    body: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
      name?: string;
    },
  ) {
    const userId = req.user.uid;
    return this.walletService.tokenizeAndAttachCard(userId, body);
  }

  @Post('cards')
  async attachCard(@Req() req: any, @Body() body: { paymentMethodId: string }) {
    const userId = req.user.uid;
    return this.walletService.attachCard(userId, body.paymentMethodId);
  }

  @Delete('cards/:id')
  async removeCard(@Req() req: any, @Param('id') cardId: string) {
    const userId = req.user.uid;
    return this.walletService.removeCard(userId, cardId);
  }

  @Post('topup/initiate')
  async initiateTopUp(
    @Req() req: any,
    @Body() body: { amountUsd: number; cardId?: string },
  ) {
    const userId = req.user.uid;
    return this.walletService.initiateTopUp(
      userId,
      body.amountUsd,
      body.cardId,
    );
  }
}
