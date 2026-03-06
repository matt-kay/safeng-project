import { Beneficiary } from '../../../domain/entities/Beneficiary';

export interface IBeneficiaryRepository {
  findById(id: string): Promise<Beneficiary | null>;
  findByUserId(userId: string): Promise<Beneficiary[]>;
  findByUserIdAndServiceType(
    userId: string,
    serviceType: string,
  ): Promise<Beneficiary[]>;
  save(beneficiary: Beneficiary): Promise<void>;
  delete(id: string): Promise<void>;
}
