import { Controller, Post, Body, Headers, Res, HttpStatus, Logger } from '@nestjs/common';
import * as express from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { FirestoreProfileRepository } from '../../infrastructure/repositories/firestore-profile.repository';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';

@Controller('payments/paystack')
export class PaystackWebhookController {
    private readonly logger = new Logger(PaystackWebhookController.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly profileRepo: FirestoreProfileRepository,
        private readonly firebaseService: FirebaseService,
    ) { }

    @Post('webhook')
    async handleWebhook(
        @Body() payload: any,
        @Headers('x-paystack-signature') signature: string,
        @Res() res: express.Response,
    ) {
        const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
        if (!secret) {
            this.logger.error('PAYSTACK_SECRET_KEY is not defined');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Configuration error');
        }
        const hash = crypto
            .createHmac('sha512', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (hash !== signature) {
            this.logger.warn('Invalid Paystack signature');
            return res.status(HttpStatus.BAD_REQUEST).send('Invalid signature');
        }

        const event = payload.event;
        const data = payload.data;

        this.logger.log(`Received Paystack event: ${event}`);

        try {
            switch (event) {
                case 'subscription.create':
                case 'charge.success':
                    await this.handleSubscriptionActive(data);
                    break;
                case 'subscription.disable':
                case 'subscription.not_renew':
                    await this.handleSubscriptionInactive(data);
                    break;
                default:
                    this.logger.log(`Unhandled event type: ${event}`);
            }
        } catch (error) {
            this.logger.error(`Error processing webhook: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error processing webhook');
        }

        return res.status(HttpStatus.OK).send('Webhook processed');
    }

    private async handleSubscriptionActive(data: any) {
        const email = data.customer.email;
        const profiles = await this.firebaseService.getFirestore()
            .collection('profiles')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (profiles.empty) {
            this.logger.warn(`No profile found for email: ${email}`);
            return;
        }

        const profile = profiles.docs[0];
        const uid = profile.id;

        await this.profileRepo.saveProfile(uid, {
            sos_subscription_active: true,
        });

        await this.firebaseService.updateUserClaims(uid, { sos_active: true });
        this.logger.log(`SOS subscription activated for user: ${uid}`);
    }

    private async handleSubscriptionInactive(data: any) {
        const email = data.customer.email;
        const profiles = await this.firebaseService.getFirestore()
            .collection('profiles')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (profiles.empty) {
            this.logger.warn(`No profile found for email: ${email}`);
            return;
        }

        const profile = profiles.docs[0];
        const uid = profile.id;

        await this.profileRepo.saveProfile(uid, {
            sos_subscription_active: false,
        });

        await this.firebaseService.updateUserClaims(uid, { sos_active: false });
        this.logger.log(`SOS subscription deactivated for user: ${uid}`);
    }
}
