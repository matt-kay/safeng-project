import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({ description: 'Amount per use in Kobo' })
  @IsNumber()
  @Min(1)
  amount_per_use: number;

  @ApiProperty({ description: 'Maximum number of uses' })
  @IsNumber()
  @Min(1)
  max_uses: number;

  @ApiProperty({ description: 'Currency code', default: 'NGN' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Coupon name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Custom coupon code' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: 'Expiry date and time' })
  @IsDateString()
  @IsOptional()
  expires_at?: string;

  @ApiProperty({ description: 'Idempotency key for creation' })
  @IsUUID()
  idempotency_key: string;
}

export class RedeemCouponDto {
  @ApiProperty({ description: 'The unique coupon code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Idempotency key for redemption' })
  @IsUUID()
  idempotency_key: string;
}

export class UpdateCouponDto {
  @ApiProperty({ description: 'Updated name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Updated expiry date' })
  @IsDateString()
  @IsOptional()
  expires_at?: string;
}
