import { Injectable, Logger } from '@nestjs/common';
import {
    NotificationEventDto,
    NotificationEventType,
} from '../models/dto/notification-event.dto';
import { DispatcherService } from './dispatcher.service';
import {
    NotificationChannel,
    NotificationType,
    NotificationPriority,
} from '../models/dto/notification.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationEventHandlerService {
    private readonly logger = new Logger(NotificationEventHandlerService.name);

    constructor(private readonly dispatcherService: DispatcherService) { }

    /**
     * Processes an event received from Pub/Sub.
     * In a real app, this would look up the user's preferred channels,
     * email address, and push tokens. For now, it mimics this for dev logging.
     */
    async handleEvent(event: NotificationEventDto): Promise<void> {
        this.logger.log(`Handling notification event: ${event.eventType}`);

        // Mock lookups for dev mode
        const mockEmail = `user_${event.userId.slice(0, 8)}@example.com`;
        const mockFcmToken = `fcm_token_${event.userId.slice(0, 8)}`;

        const { title, body } = this.getNotificationContent(event);

        // 1. Send Email Notification
        await this.dispatcherService.processNotification({
            id: uuidv4(),
            type: NotificationType.SINGLE,
            channel: NotificationChannel.EMAIL,
            priority: NotificationPriority.NORMAL,
            recipient: mockEmail,
            payload: {
                subject: title,
                body_text: body,
                body_html: `<p>${body}</p>`,
            },
        });

        // 2. Send Push Notification (FCM)
        await this.dispatcherService.processNotification({
            id: uuidv4(),
            type: NotificationType.SINGLE,
            channel: NotificationChannel.FCM,
            priority: NotificationPriority.HIGH,
            recipient: mockFcmToken,
            payload: {
                title,
                body,
                data: {
                    transactionId: event.transactionId,
                    eventType: event.eventType,
                },
            },
        });
    }

    private getNotificationContent(event: NotificationEventDto): {
        title: string;
        body: string;
    } {
        const amountNaira = (event.amount / 100).toFixed(2);

        switch (event.eventType) {
            case NotificationEventType.VTPASS_SUCCESS:
                return {
                    title: 'Transaction Successful',
                    body: `Your payment of ₦${amountNaira} for ${event.metadata?.serviceID || 'service'} was successful.`,
                };
            case NotificationEventType.VTPASS_FAILED:
                return {
                    title: 'Transaction Failed',
                    body: `Your payment of ₦${amountNaira} for ${event.metadata?.serviceID || 'service'} failed. Any debited amount has been refunded to your wallet.`,
                };
            case NotificationEventType.STRIPE_TOPUP_SUCCESS:
                return {
                    title: 'Wallet Top-up Successful',
                    body: `Your wallet has been credited with ₦${amountNaira} via Stripe.`,
                };
            case NotificationEventType.STRIPE_TOPUP_FAILED:
                return {
                    title: 'Wallet Top-up Failed',
                    body: `Your wallet top-up of ₦${amountNaira} via Stripe failed: ${event.metadata?.failureReason || 'Unknown error'}.`,
                };
            default:
                return {
                    title: 'Notification Update',
                    body: `Update for transaction ${event.transactionId}: ${event.eventType}`,
                };
        }
    }
}
