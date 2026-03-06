import { Module } from '@nestjs/common';
import { FirebaseModule } from './firebase/firebase.module';
import { FirebaseAdminProvider } from './repositories/firebase-admin.provider';
import { FirestoreProfileRepository } from './repositories/firestore-profile.repository';
import { FirestoreEmergencyContactRepository } from './repositories/firestore-emergency-contact.repository';
import { FirestoreReportRepository } from './repositories/firestore-report.repository';
import { UserRepository } from './repositories/user.repository.facade';
import { IUserRepositoryToken } from '../application/ports/user.repository.interface';
import { PaystackService } from './services/paystack.service';
import { StorageService } from './storage/storage.service';

@Module({
  imports: [FirebaseModule],
  providers: [
    FirebaseAdminProvider,
    FirestoreProfileRepository,
    FirestoreEmergencyContactRepository,
    FirestoreReportRepository,
    {
      provide: IUserRepositoryToken,
      useClass: UserRepository,
    },
    PaystackService,
    StorageService,
  ],
  exports: [
    IUserRepositoryToken,
    FirebaseModule,
    FirebaseAdminProvider,
    PaystackService,
    FirestoreProfileRepository,
    FirestoreEmergencyContactRepository,
    FirestoreReportRepository,
    StorageService,
  ],
})
export class InfrastructureModule { }
