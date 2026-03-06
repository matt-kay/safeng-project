import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class InitiateTransactionDto {
  @IsString()
  serviceID: string;

  @IsString()
  billersCode: string;

  @IsOptional()
  @IsString()
  variation_code?: string;

  @IsNumber()
  @Min(100)
  amount: number; // in Kobo

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  subscription_type?: string;
}
