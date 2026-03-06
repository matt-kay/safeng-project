import { PhoneNumber } from '../value-objects/phone-number';
import { UserRole } from '../value-objects/user-role';
import { UserStatus } from '../value-objects/user-status';
import { EmergencyContact } from '../value-objects/emergency-contact';

export type { EmergencyContact };

export class UserProfile {
  constructor(
    public readonly uid: string,
    public first_name: string,
    public last_name: string,
    public phone_number: PhoneNumber,
    public role: UserRole,
    public status: UserStatus,
    public email?: string,
    public fcm_tokens: string[] = [],
    public apn_tokens: string[] = [],
    public created_at?: Date,
    public updated_at?: Date,
    public deleted_at?: Date,
    public deleted_by?: string,
    public deleted_reason?: string,
    public stripeCustomerId?: string,
    public sos_subscription_active: boolean = false,
  ) { }
}
