import { BadRequestException } from '@nestjs/common';

export class PhoneNumber {
  private readonly value: string;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new BadRequestException(
        'Invalid phone number format. Must be E.164.',
      );
    }
    this.value = value;
  }

  get getValue(): string {
    return this.value;
  }

  private isValid(value: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.getValue;
  }
}
