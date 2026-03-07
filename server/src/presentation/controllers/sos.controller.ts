import { Controller, Post, Get, Body, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { FirestoreProfileRepository } from '../../infrastructure/repositories/firestore-profile.repository';
import { FirestoreEmergencyContactRepository } from '../../infrastructure/repositories/firestore-emergency-contact.repository';
import { EmergencyContact } from '../../domain/value-objects/emergency-contact';
import { PaystackService } from '../../infrastructure/services/paystack.service';
import { ConfigService } from '@nestjs/config';

@Controller('sos')
@UseGuards(FirebaseAuthGuard)
export class SOSController {
    constructor(
        private readonly profileRepo: FirestoreProfileRepository,
        private readonly emergencyContactRepo: FirestoreEmergencyContactRepository,
        private readonly paystackService: PaystackService,
        private readonly configService: ConfigService,
    ) { }

    @Get('subscription')
    async getSOSSubscription(@Request() req: any) {
        let email = req.user.email;
        const uid = req.user.uid;

        if (!email) {
            // Fallback to profile if email is not in token
            const profile = await this.profileRepo.getProfile(uid);
            email = profile?.email;
        }

        if (!email) {
            throw new BadRequestException('User email not found');
        }

        const subscriptions = await this.paystackService.getSubscriptions(email);
        const sosPlanCode = this.configService.get<string>('PAYSTACK_SOS_PLAN_CODE');

        // Find the SOS subscription
        const sosSub = subscriptions.find(sub => sub.plan.plan_code === sosPlanCode);

        if (!sosSub) {
            return {
                status: 'inactive',
                cardUsed: null,
                subscribedOn: null,
                nextChargeDate: null,
            };
        }

        return {
            status: sosSub.status,
            cardUsed: sosSub.authorization.last4 ? `**** ${sosSub.authorization.last4}` : null,
            subscribedOn: sosSub.createdAt,
            nextChargeDate: sosSub.next_payment_date,
        };
    }

    @Post('subscription/cancel')
    async cancelSOSSubscription(@Request() req: any) {
        let email = req.user.email;
        const uid = req.user.uid;

        if (!email) {
            const profile = await this.profileRepo.getProfile(uid);
            email = profile?.email;
        }

        if (!email) {
            throw new BadRequestException('User email not found');
        }

        const subscriptions = await this.paystackService.getSubscriptions(email);
        const sosPlanCode = this.configService.get<string>('PAYSTACK_SOS_PLAN_CODE');

        // Find the active SOS subscription
        const sosSub = subscriptions.find(sub =>
            sub.plan.plan_code === sosPlanCode &&
            (sub.status === 'active' || sub.status === 'non-renewing')
        );

        if (!sosSub) {
            throw new BadRequestException('No active SOS subscription found');
        }

        await this.paystackService.disableSubscription(sosSub.subscription_code, sosSub.email_token);

        return { success: true, message: 'Subscription cancelled successfully' };
    }

    @Get('status')
    async getSOSStatus(@Request() req: any) {
        const uid = req.user.uid;
        const profile = await this.profileRepo.getProfile(uid);
        if (!profile) {
            throw new BadRequestException('Profile not found');
        }
        const contacts = await this.emergencyContactRepo.getContacts(uid);
        return {
            subscribed: profile.sos_subscription_active || false,
            contacts: contacts || [],
        };
    }

    @Post('contacts')
    async updateContacts(@Request() req: any, @Body() contacts: EmergencyContact[]) {
        const uid = req.user.uid;

        if (!Array.isArray(contacts)) {
            throw new BadRequestException('Contacts must be an array');
        }

        if (contacts.length > 10) {
            throw new BadRequestException('Maximum of 10 emergency contacts allowed');
        }

        // Basic validation
        for (const contact of contacts) {
            if (!contact.firstName || !contact.lastName || !contact.email || !contact.phoneNumber) {
                throw new BadRequestException('First name, last name, email, and phone number are required for each contact');
            }
        }

        const profile = await this.profileRepo.getProfile(uid);
        if (!profile) {
            throw new BadRequestException('Profile not found');
        }

        // Check subscription if needed (optional based on UX flow, but good for safety)
        if (!profile.sos_subscription_active) {
            // We allow updating contacts even if not subscribed yet, or maybe not?
            // The requirement says "once setup is complete then navigate to sos emergency screen"
            // Let's allow updating anyway, but maybe warn.
        }

        await this.emergencyContactRepo.saveContacts(uid, contacts);

        return { success: true, contacts };
    }
}
