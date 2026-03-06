import { Module } from '@nestjs/common';
import { FirebaseModule } from './firebase/firebase.module';
import { FirebaseAdminProvider } from './repositories/firebase-admin.provider';
import { FirestoreProfileRepository } from './repositories/firestore-profile.repository';
import { FirestoreEmergencyContactRepository } from './repositories/firestore-emergency-contact.repository';
import { UserRepository } from './repositories/user.repository.facade';
import { IUserRepositoryToken } from '../application/ports/user.repository.interface';
import { PaystackService } from './services/paystack.service';

@Module({
  imports: [FirebaseModule],
  providers: [
    FirebaseAdminProvider,
    FirestoreProfileRepository,
    FirestoreEmergencyContactRepository,
    {
      provide: IUserRepositoryToken,
      useClass: UserRepository,
    },
    PaystackService,
  ],
  exports: [
    IUserRepositoryToken,
    FirebaseModule,
    FirebaseAdminProvider,
    PaystackService,
    FirestoreProfileRepository,
    FirestoreEmergencyContactRepository,
  ],
})
export class InfrastructureModule { }
