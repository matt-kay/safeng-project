import { Module } from '@nestjs/common';
import { FirebaseModule } from './firebase/firebase.module';
import { FirebaseAdminProvider } from './repositories/firebase-admin.provider';
import { FirestoreProfileRepository } from './repositories/firestore-profile.repository';
import { UserRepository } from './repositories/user.repository.facade';
import { IUserRepositoryToken } from '../application/ports/user.repository.interface';

@Module({
  imports: [FirebaseModule],
  providers: [
    FirebaseAdminProvider,
    FirestoreProfileRepository,
    {
      provide: IUserRepositoryToken,
      useClass: UserRepository,
    },
  ],
  exports: [
    IUserRepositoryToken,
    FirebaseModule,
    FirebaseAdminProvider,
  ],
})
export class InfrastructureModule { }
