import { Controller, Post, Get, UseGuards, Request, Query, Redirect, BadRequestException } from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { PaystackService } from '../../infrastructure/services/paystack.service';
import { ConfigService } from '@nestjs/config';
import { FirestoreProfileRepository } from '../../infrastructure/repositories/firestore-profile.repository';
import axios from 'axios';

@Controller('payments/paystack')
export class PaystackController {
    constructor(
        private readonly paystackService: PaystackService,
        private readonly configService: ConfigService,
        private readonly profileRepo: FirestoreProfileRepository,
    ) { }

    @Post('initialize-sos')
    @UseGuards(FirebaseAuthGuard)
    async initializeSOS(@Request() req: any) {
        const user = req.user;
        const { platform } = req.body;
        const profile = await this.profileRepo.getProfile(user.uid);

        if (!profile) {
            throw new BadRequestException('Profile not found');
        }

        const planCode = this.configService.get<string>('PAYSTACK_SOS_PLAN_CODE');
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

        // Check if plan code is a placeholder
        const isPlaceholderPlan = planCode === 'PLN_safeme_sos_monthly';

        try {
            const reference = `SAFEME-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
            const payload: any = {
                email: user.email || profile.email,
                amount: 4200000, // 42,000 NGN in kobo
                reference,
                callback_url: `${this.configService.get<string>('SERVER_URL') || 'http://localhost:3000'}/api/v1/payments/paystack/callback`,
                metadata: {
                    user_id: user.uid,
                    payment_type: 'sos_subscription',
                    platform: platform || 'web'
                }
            };

            // Only add plan if it's not the placeholder
            if (planCode && !isPlaceholderPlan) {
                payload.plan = planCode;
            }

            const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.data;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message;
            const statusCode = error.response?.status || 400;

            if (isPlaceholderPlan) {
                throw new BadRequestException(
                    `SOS Plan Code is still set to placeholder 'PLN_safeme_sos_monthly'. ` +
                    `Please create a real plan in Paystack Dashboard and update PAYSTACK_SOS_PLAN_CODE in your .env file. ` +
                    `Original error: ${errorMessage}`
                );
            }

            throw new BadRequestException(`Failed to initialize payment: ${errorMessage}`);
        }
    }

    @Get('callback')
    @Redirect()
    async handleCallback(@Query('reference') reference: string) {
        const transaction = await this.paystackService.verifyTransaction(reference);
        const platform = transaction?.metadata?.platform || 'web';
        const clientUrl = this.configService.get<string>('CLIENT_APP_URL') || 'http://localhost:8081';

        if (platform === 'ios' || platform === 'android') {
            return { url: `safeme://sos-callback?reference=${reference}` };
        }

        return { url: `${clientUrl}/sos-callback?reference=${reference}` };
    }
}
