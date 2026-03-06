import { UserAggregate } from '../../domain/aggregates/user.aggregate';

export interface IUserRepository {
  findById(uid: string): Promise<UserAggregate | null>;
  save(aggregate: UserAggregate): Promise<void>;
  softDelete(uid: string, reason?: string, deletedBy?: string): Promise<void>;
  permanentDelete(uid: string, alsoDeleteProfile: boolean): Promise<void>;
}

export const IUserRepositoryToken = Symbol('IUserRepository');
