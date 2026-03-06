import { Module } from '@nestjs/common';
import { FirebaseModule } from './firebase/firebase.module';
import { FirebaseAdminProvider } from './repositories/firebase-admin.provider';
import { FirestoreProfileRepository } from './repositories/firestore-profile.repository';
import { FirebasePortalSettingsRepository } from './repositories/FirebasePortalSettingsRepository';
import { UserRepository } from './repositories/user.repository.facade';
import { AuditLoggingDecorator } from './decorators/audit-logging.decorator';
import { IUserRepositoryToken } from '../application/ports/user.repository.interface';
import { FirebaseService } from './firebase/firebase.service';
import { FirebaseAuditRepository } from './repositories/FirebaseAuditRepository';
import { VtpassModule } from './services/vtpass/vtpass.module';

@Module({
  imports: [FirebaseModule, VtpassModule],
  providers: [
    FirebaseAdminProvider,
    FirestoreProfileRepository,
    {
      provide: 'INNER_USER_REPOSITORY',
      useClass: UserRepository,
    },
    {
      provide: 'IPortalSettingsRepository',
      useClass: FirebasePortalSettingsRepository,
    },
    {
      provide: 'IAuditRepository',
      useClass: FirebaseAuditRepository,
    },
    {
      provide: IUserRepositoryToken,
      useFactory: (
        innerRepo: UserRepository,
        auditRepo: FirebaseAuditRepository,
      ) => {
        return new AuditLoggingDecorator(innerRepo, auditRepo);
      },
      inject: ['INNER_USER_REPOSITORY', 'IAuditRepository'],
    },
  ],
  exports: [
    IUserRepositoryToken,
    FirebaseModule,
    FirebaseAdminProvider,
    'IPortalSettingsRepository',
    'IAuditRepository',
    VtpassModule,
  ],
})
export class InfrastructureModule { }
