import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateBeneficiaryDto {
  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @IsString()
  @IsNotEmpty()
  providerServiceId: string; // e.g., phone number, smartcard number

  @IsString()
  @IsNotEmpty()
  billerCode: string;

  @IsString()
  @IsNotEmpty()
  billerName: string;

  @IsString()
  nickname: string;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}

export class UpdateBeneficiaryDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
