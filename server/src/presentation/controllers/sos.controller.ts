import { Controller, Post, Get, Body, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { FirestoreProfileRepository } from '../../infrastructure/repositories/firestore-profile.repository';
import { FirestoreEmergencyContactRepository } from '../../infrastructure/repositories/firestore-emergency-contact.repository';
import { EmergencyContact } from '../../domain/value-objects/emergency-contact';

@Controller('sos')
@UseGuards(FirebaseAuthGuard)
export class SOSController {
    constructor(
        private readonly profileRepo: FirestoreProfileRepository,
        private readonly emergencyContactRepo: FirestoreEmergencyContactRepository,
    ) { }

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
