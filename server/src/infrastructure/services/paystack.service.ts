import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PaystackService {
    private readonly logger = new Logger(PaystackService.name);
    private readonly baseUrl = 'https://api.paystack.co';
    private readonly secretKey: string;

    constructor(private readonly configService: ConfigService) {
        this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
        if (!this.secretKey) {
            this.logger.warn('PAYSTACK_SECRET_KEY is not defined in environment variables');
        }
    }

    private get headers() {
        return {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
        };
    }

    async verifyTransaction(reference: string): Promise<any> {
        try {
            const response = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`, {
                headers: this.headers,
            });
            return response.data.data;
        } catch (error) {
            this.logger.error(`Error verifying transaction: ${error.message}`);
            throw error;
        }
    }

    async createSubscription(data: { customer: string; plan: string; start_date?: string }) {
        try {
            const response = await axios.post(`${this.baseUrl}/subscription`, data, {
                headers: this.headers,
            });
            return response.data.data;
        } catch (error) {
            this.logger.error(`Error creating subscription: ${error.message}`);
            throw error;
        }
    }

    async disableSubscription(code: string, token: string) {
        try {
            const response = await axios.post(`${this.baseUrl}/subscription/disable`, {
                code,
                token,
            }, {
                headers: this.headers,
            });
            return response.data;
        } catch (error) {
            this.logger.error(`Error disabling subscription: ${error.message}`);
            throw error;
        }
    }
}
