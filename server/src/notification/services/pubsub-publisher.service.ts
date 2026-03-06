import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub, Topic, Subscription } from '@google-cloud/pubsub';
import { NotificationEventDto } from '../models/dto/notification-event.dto';

@Injectable()
export class PubSubPublisherService implements OnModuleInit {
    private readonly logger = new Logger(PubSubPublisherService.name);
    private pubSubClient: PubSub;
    private topicName: string;
    private subscriptionName: string;
    private pushEndpoint: string;
    private readonly isDev: boolean;

    constructor(private readonly configService: ConfigService) {
        const projectId = this.configService.get<string>('pubsub.projectId');
        const emulatorHost = this.configService.get<string>('pubsub.emulatorHost');

        this.isDev =
            this.configService.get<string>('environment') !== 'production';
        this.topicName = this.configService.get<string>(
            'pubsub.notificationsTopic',
        )!;
        this.subscriptionName = this.configService.get<string>(
            'pubsub.notificationsSubscription',
        )!;
        this.pushEndpoint = this.configService.get<string>(
            'pubsub.pushEndpoint',
        )!;

        // Set the emulator host env var before creating the PubSub client
        // so the SDK picks it up automatically
        if (emulatorHost) {
            process.env.PUBSUB_EMULATOR_HOST = emulatorHost;
        }

        this.pubSubClient = new PubSub({ projectId });
    }

    async onModuleInit() {
        if (this.isDev) {
            await this.ensureTopicAndSubscription();
        }
    }

    /**
     * Publishes a notification event to the Pub/Sub topic.
     * Encodes the payload as a JSON base64 message.
     */
    async publishNotification(event: NotificationEventDto): Promise<void> {
        const messageData = Buffer.from(JSON.stringify(event));

        try {
            const topic = this.pubSubClient.topic(this.topicName);
            const messageId = await topic.publishMessage({ data: messageData });
            this.logger.log(
                `Published event [${event.eventType}] for transaction ${event.transactionId} → messageId: ${messageId}`,
            );
        } catch (error: any) {
            this.logger.error(
                `Failed to publish event [${event.eventType}] for transaction ${event.transactionId}`,
                error.stack,
            );
            // Don't re-throw — notification failure should not break the webhook response
        }
    }

    /**
     * In dev mode, auto-creates the topic and push subscription on the
     * Pub/Sub emulator so no manual setup is required.
     */
    private async ensureTopicAndSubscription(): Promise<void> {
        const topic = await this.ensureTopic();
        await this.ensureSubscription(topic);
    }

    private async ensureTopic(): Promise<Topic> {
        try {
            const [topics] = await this.pubSubClient.getTopics();
            const topicNames = topics.map((t) => t.name);
            const fullTopicName = `projects/${this.pubSubClient.projectId}/topics/${this.topicName}`;

            if (!topicNames.includes(fullTopicName)) {
                const [newTopic] = await this.pubSubClient.createTopic(this.topicName);
                this.logger.log(`[Dev] Created Pub/Sub topic: ${this.topicName}`);
                return newTopic;
            } else {
                this.logger.log(`[Dev] Pub/Sub topic already exists: ${this.topicName}`);
                return this.pubSubClient.topic(this.topicName);
            }
        } catch (error: any) {
            this.logger.error(
                `Failed to ensure Pub/Sub topic: ${this.topicName}`,
                error.stack,
            );
            return this.pubSubClient.topic(this.topicName);
        }
    }

    private async ensureSubscription(topic: Topic): Promise<void> {
        try {
            const [subscriptions] = await this.pubSubClient.getSubscriptions();
            const subNames = subscriptions.map((s: Subscription) => s.name);
            const fullSubName = `projects/${this.pubSubClient.projectId}/subscriptions/${this.subscriptionName}`;

            if (!subNames.includes(fullSubName)) {
                await topic.createSubscription(this.subscriptionName, {
                    pushConfig: { pushEndpoint: this.pushEndpoint },
                });
                this.logger.log(
                    `[Dev] Created Pub/Sub push subscription: ${this.subscriptionName} → ${this.pushEndpoint}`,
                );
            } else {
                this.logger.log(
                    `[Dev] Pub/Sub subscription already exists: ${this.subscriptionName}`,
                );
            }
        } catch (error: any) {
            this.logger.error(
                `Failed to ensure Pub/Sub subscription: ${this.subscriptionName}`,
                error.stack,
            );
        }
    }
}
