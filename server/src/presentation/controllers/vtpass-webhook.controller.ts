import {
    Controller,
    Post,
    Body,
    Logger,
    Inject,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { TransactionExecutionService } from '../../application/services/transaction-execution.service';
import type { ITransactionRepository } from '../../application/ports/repositories/ITransactionRepository';
import { TransactionStatus } from '../../domain/entities/Transaction';
import { VTPASS_STATUS_CODES } from '../../infrastructure/services/vtpass/vtpass.errors';
import { PubSubPublisherService } from '../../notification/services/pubsub-publisher.service';
import { NotificationEventType } from '../../notification/models/dto/notification-event.dto';

@Controller('vtpass-webhook')
export class VtpassWebhookController {
    private readonly logger = new Logger(VtpassWebhookController.name);

    constructor(
        private readonly transactionExecution: TransactionExecutionService,
        @Inject('ITransactionRepository')
        private readonly transactionRepo: ITransactionRepository,
        private readonly pubSubPublisher: PubSubPublisherService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Body() rawPayload: any) {
        this.logger.log(`Received VTpass webhook: ${JSON.stringify(rawPayload)}`);

        // 1. Normalize payload: VTpass sometimes sends the entire JSON as a key in an object
        let payload = rawPayload;
        const keys = Object.keys(rawPayload);
        if (keys.length === 1 && keys[0].startsWith('{"') && rawPayload[keys[0]] === "") {
            try {
                payload = JSON.parse(keys[0]);
                this.logger.log('Detected and parsed stringified VTpass webhook payload');
            } catch (e) {
                this.logger.error('Failed to parse stringified VTpass webhook payload', e);
            }
        }

        // 2. Extract requestId from various possible locations
        const requestId =
            payload?.requestId ||
            payload?.request_id ||
            payload?.data?.requestId ||
            payload?.data?.request_id ||
            payload?.content?.transactions?.requestId ||
            payload?.content?.transactions?.request_id ||
            payload?.content?.transactions?.transactionId;

        if (!requestId) {
            this.logger.error(`Webhook payload missing requestId. Unrecognized format. Normalized payload: ${JSON.stringify(payload)}`);
            return { status: 'error', message: 'Missing requestId' };
        }

        const transaction = await this.transactionRepo.findByRequestId(requestId);
        if (!transaction) {
            this.logger.error(`Transaction not found for requestId: ${requestId}`);
            return { status: 'error', message: 'Transaction not found' };
        }

        if (
            transaction.status === TransactionStatus.SUCCESS ||
            transaction.status === TransactionStatus.FAILED
        ) {
            this.logger.log(`Transaction ${transaction.id} already finalized. Ignoring webhook.`);
            return { status: 'success', message: 'Already finalized' };
        }

        // 3. Extract status and code
        const status =
            payload?.data?.content?.transactions?.status ||
            payload?.content?.transactions?.status;
        const code = payload?.data?.code || payload?.code;

        if (status === 'delivered' || code === VTPASS_STATUS_CODES.SUCCESS) {
            await this.transactionExecution.finalizeTransaction(
                transaction,
                TransactionStatus.SUCCESS,
                payload,
            );

            await this.pubSubPublisher.publishNotification({
                eventType: NotificationEventType.VTPASS_SUCCESS,
                userId: transaction.userId,
                transactionId: transaction.id,
                amount: transaction.amount,
                metadata: {
                    serviceID: transaction.metadata?.serviceID,
                    billersCode: transaction.metadata?.billersCode,
                    requestId,
                },
            });
        } else if (status === 'failed' || status === 'reversed' || code === 'failed') {
            await this.transactionExecution.finalizeTransaction(
                transaction,
                TransactionStatus.FAILED,
                payload,
                `Webhook confirmed ${status || code}`,
            );

            await this.pubSubPublisher.publishNotification({
                eventType: NotificationEventType.VTPASS_FAILED,
                userId: transaction.userId,
                transactionId: transaction.id,
                amount: transaction.amount,
                metadata: {
                    serviceID: transaction.metadata?.serviceID,
                    billersCode: transaction.metadata?.billersCode,
                    requestId,
                    failureReason: `Webhook confirmed ${status}`,
                },
            });
        } else {
            this.logger.log(`Webhook status ${status} for ${transaction.id} not a final state. Skipping.`);
        }

        return { status: 'success' };
    }

}
