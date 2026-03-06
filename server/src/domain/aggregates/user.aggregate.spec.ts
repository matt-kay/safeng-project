import { UserAggregateBuilder } from '../patterns/user-aggregate.builder';
import { UserRole } from '../value-objects/user-role';
import { UserStatus } from '../value-objects/user-status';

describe('UserAggregate - Effective Status', () => {
  let builder: UserAggregateBuilder;

  beforeEach(() => {
    builder = new UserAggregateBuilder().withIdentity({
      uid: 'user123',
      phoneNumber: '+1234567890',
      disabled: false,
    });
  });

  it('should be "profile_missing" when no profile exists', () => {
    const aggregate = builder.build();
    expect(aggregate.effective_status).toBe('profile_missing');
  });

  it('should be INACTIVE when identity is disabled', () => {
    const aggregate = builder
      .withIdentity({
        uid: 'user123',
        phoneNumber: '+1234567890',
        disabled: true,
      })
      .build();
    expect(aggregate.effective_status).toBe(UserStatus.INACTIVE);
  });

  it('should be DELETED if profile status is DELETED (overriding identity)', () => {
    const aggregate = builder
      .withProfile({
        uid: 'user123',
        first_name: 'Test',
        last_name: 'User',
        phone_number: '+1234567890',
        role: UserRole.CUSTOMER,
        status: UserStatus.DELETED,
      })
      .build();
    expect(aggregate.effective_status).toBe(UserStatus.DELETED);
  });

  it('should return ACTIVE if profile is ACTIVE and identity is not disabled', () => {
    const aggregate = builder
      .withProfile({
        uid: 'user123',
        first_name: 'Test',
        last_name: 'User',
        phone_number: '+1234567890',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      })
      .build();
    expect(aggregate.effective_status).toBe(UserStatus.ACTIVE);
  });
});
