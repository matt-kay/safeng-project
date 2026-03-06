import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SesPayloadDto } from '../../models/dto/notification.dto';

@Injectable()
export class SesService {
  private readonly logger = new Logger(SesService.name);
  private readonly client: SESClient;
  private readonly defaultSender = 'noreply@example.com'; // In a real app, load this from config

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.region') || 'us-east-1';
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
    );

    if (accessKeyId && secretAccessKey) {
      this.client = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } else {
      this.client = new SESClient({ region });
    }
  }

  async sendSingle(email: string, payload: SesPayloadDto): Promise<boolean> {
    const isDev =
      this.configService.get<string>('environment') === 'development';
    if (isDev) {
      this.logger.log(
        `[Dev Mode] Sending SES to email=${email}, payload=${JSON.stringify(payload)}`,
      );
      return true;
    }

    try {
      const command = new SendEmailCommand({
        Source: payload.sender || this.defaultSender,
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: { Data: payload.subject },
          Body: {
            ...(payload.body_text && { Text: { Data: payload.body_text } }),
            ...(payload.body_html && { Html: { Data: payload.body_html } }),
          },
        },
      });

      await this.client.send(command);
      this.logger.log(`Successfully sent email to ${email}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${email}`, error.stack);
      return false;
    }
  }

  async sendBatch(
    emails: string[],
    payload: SesPayloadDto,
  ): Promise<{ successCount: number; failureCount: number }> {
    // Basic implementation: send emails concurrently
    const results = await Promise.all(
      emails.map((email) => this.sendSingle(email, payload).catch(() => false)),
    );
    const successCount = results.filter(Boolean).length;
    return {
      successCount,
      failureCount: emails.length - successCount,
    };
  }
}
