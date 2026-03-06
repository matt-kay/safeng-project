import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  ValidateIf,
  IsObject,
  IsInt,
} from 'class-validator';

export enum NotificationType {
  SINGLE = 'single',
  BATCH = 'batch',
}

export enum NotificationChannel {
  APN = 'apn',
  FCM = 'fcm',
  EMAIL = 'email',
}

export enum NotificationPriority {
  HIGH = 'high',
  NORMAL = 'normal',
}

export class ApnPayloadDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  sound?: string = 'default';

  @IsInt()
  @IsOptional()
  badge?: number;

  @IsObject()
  @IsOptional()
  custom_data?: Record<string, any>;
}

export class FcmPayloadDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}

export class SesPayloadDto {
  @IsString()
  subject: string;

  @IsString()
  @IsOptional()
  body_text?: string;

  @IsString()
  @IsOptional()
  body_html?: string;

  @IsString()
  @IsOptional()
  sender?: string;
}

export class NotificationPayloadDto {
  @IsUUID()
  id: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority = NotificationPriority.NORMAL;

  @ValidateIf((o) => o.type === NotificationType.SINGLE)
  @IsString()
  recipient?: string;

  @ValidateIf((o) => o.type === NotificationType.BATCH)
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @ValidateNested()
  @Type((opts) => {
    switch (opts?.newObject?.channel) {
      case NotificationChannel.APN:
        return ApnPayloadDto;
      case NotificationChannel.FCM:
        return FcmPayloadDto;
      case NotificationChannel.EMAIL:
        return SesPayloadDto;
      default:
        return Object;
    }
  })
  payload: ApnPayloadDto | FcmPayloadDto | SesPayloadDto;
}
