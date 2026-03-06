import apiClient from './api-client';

export interface WalletBalance {
    currency: string;
    balance: number;        // Naira
    cashbackBalance: number; // Naira
}

export interface Transaction {
    id: string;
    amount: number;    // Naira
    direction: 'CREDIT' | 'DEBIT';
    type: string;      // TransactionType enum string
    status: string;    // lowercased TransactionStatus from server
    createdAt: string;
    description: string;
    serviceFee?: number; // Naira
    failureReason?: string | null;
    metadata?: {
        amountUsd?: number;
        serviceFeeUsd?: number;
        exchangeRate?: number;
        [key: string]: any;
    };
}

export interface PaymentCard {
    id: string;
    last4: string;
    brand: string;      // e.g. 'visa', 'mastercard', 'amex'
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
}

export class WalletService {
    /**
     * POST /wallet/initiate — explicitly creates the user's wallet.
     * Use this during profile setup to ensure the wallet exists.
     */
    static async initiate(): Promise<void> {
        try {
            await apiClient.post('/wallet/initiate');
        } catch (error: any) {
            // Ignore if already exists (ConflictException 409)
            if (error?.response?.status === 409) return;
            throw error;
        }
    }

    /**
     * GET /wallet — returns the Wallet entity directly.
     * Fields: mainBalance (Kobo), cashbackBalance (Kobo), currency.
     * If 404 (no wallet yet), auto-calls POST /wallet/initiate then retries.
     * Falls back to zero balances if initiation also fails.
     */
    static async getBalance(): Promise<WalletBalance> {
        const mapWallet = (data: any): WalletBalance => ({
            balance: (data.mainBalance ?? 0) / 100,
            cashbackBalance: (data.cashbackBalance ?? 0) / 100,
            currency: data.currency ?? 'NGN',
        });

        try {
            const { data } = await apiClient.get<any>('/wallet');
            return mapWallet(data);
        } catch (error: any) {
            if (error?.response?.status !== 404) throw error;

            // Wallet not yet created — initiate it silently, then retry once
            try {
                await apiClient.post('/wallet/initiate');
            } catch {
                // initiate failed (e.g. already exists race), still try GET again
            }

            try {
                const { data } = await apiClient.get<any>('/wallet');
                return mapWallet(data);
            } catch {
                // Wallet still not available — return safe zero state
                return { balance: 0, cashbackBalance: 0, currency: 'NGN' };
            }
        }
    }

    /**
     * GET /transactions — returns { status, data: Transaction[] }.
     * Transaction.amount is stored in Kobo on the server — we divide by 100 for Naira.
     * Transaction.type is a TransactionType enum: TOP_UP | PAYMENT | CASHBACK | REFUND.
     */
    static async getTransactions(page: number = 1, limit: number = 20): Promise<Transaction[]> {
        const { data } = await apiClient.get<{ status: string; data: any[] }>(`/transactions?page=${page}&limit=${limit}`);
        const rows: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        return rows.map(t => ({
            id: t.id,
            amount: (t.amount ?? 0) / 100,
            direction: t.direction || (t.type === 'TOP_UP' || t.type === 'CASHBACK' ? 'CREDIT' : 'DEBIT'),
            type: t.type,
            status: (t.status ?? '').toLowerCase(),
            createdAt: t.createdAt,
            failureReason: t.failureReason ?? null,
            description: t.description || (t.type ?? '').replace(/_/g, ' '),
            serviceFee: (t.serviceFee ?? 0) / 100,
            metadata: t.metadata ?? {},
        }));
    }

    /**
     * GET /transactions/vtu — returns { status, data: Transaction[] }.
     * Fetches only VTU transactions (PAYMENT type).
     */
    static async getVtuTransactions(page: number = 1, limit: number = 20): Promise<Transaction[]> {
        const { data } = await apiClient.get<{ status: string; data: any[] }>(`/transactions/vtu?page=${page}&limit=${limit}`);
        const rows: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        return rows.map(t => ({
            id: t.id,
            amount: (t.amount ?? 0) / 100,
            direction: t.direction || 'DEBIT',
            type: t.type,
            status: (t.status ?? '').toLowerCase(),
            createdAt: t.createdAt,
            failureReason: t.failureReason ?? null,
            description: t.description || 'VTU Payment',
            serviceFee: (t.serviceFee ?? 0) / 100,
            metadata: t.metadata ?? {},
        }));
    }

    /**
     * GET /transactions/:id — returns a single transaction.
     */
    static async getTransaction(id: string): Promise<Transaction> {
        const { data } = await apiClient.get<any>(`/transactions/${id}`);
        const t = data.data || data;
        return {
            id: t.id,
            amount: (t.amount ?? 0) / 100,
            direction: t.direction || (t.type === 'TOP_UP' || t.type === 'CASHBACK' ? 'CREDIT' : 'DEBIT'),
            type: t.type,
            status: (t.status ?? '').toLowerCase(),
            createdAt: t.createdAt,
            failureReason: t.failureReason ?? null,
            description: t.description || (t.type ?? '').replace(/_/g, ' '),
            serviceFee: (t.serviceFee ?? 0) / 100,
            metadata: t.metadata ?? {},
        };
    }

    /**
     * GET /wallet/cards — returns a raw PaymentCard[] array.
     * Fields: id, last4, brand, expiryMonth, expiryYear, isDefault.
     */
    static async listCards(): Promise<PaymentCard[]> {
        const { data } = await apiClient.get<any>('/wallet/cards');
        const cards: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        return cards.map(c => ({
            id: c.id,
            last4: c.last4,
            brand: (c.brand ?? '').toLowerCase(),
            expiryMonth: c.expiryMonth,
            expiryYear: c.expiryYear,
            isDefault: c.isDefault ?? false,
        }));
    }

    /**
     * POST /wallet/cards/tokenize
     * Sends raw card details to the server, which tokenizes them server-side via Stripe
     * (uses secret key — no client-side surface restrictions).
     * Returns the saved PaymentCard.
     */
    static async tokenizeAndSave(card: {
        number: string;
        expMonth: number;
        expYear: number;
        cvc: string;
        name?: string;
    }): Promise<PaymentCard> {
        const { data } = await apiClient.post<any>('/wallet/cards/tokenize', card);
        return {
            id: data.id,
            last4: data.last4,
            brand: (data.brand ?? '').toLowerCase(),
            expiryMonth: data.expiryMonth,
            expiryYear: data.expiryYear,
            isDefault: data.isDefault ?? false,
        };
    }

    /**
     * POST /wallet/cards/setup-intent
     * Returns a Stripe SetupIntent clientSecret used to tokenize a card.
     */
    static async createSetupIntent(): Promise<{ clientSecret: string }> {
        const { data } = await apiClient.post<{ clientSecret: string }>('/wallet/cards/setup-intent');
        return data;
    }

    /**
     * POST /wallet/cards
     * Attaches a Stripe PaymentMethod to the user's wallet on the server.
     * body: { paymentMethodId: string }
     */
    static async attachCard(paymentMethodId: string): Promise<PaymentCard> {
        const { data } = await apiClient.post<any>('/wallet/cards', { paymentMethodId });
        return {
            id: data.id,
            last4: data.last4,
            brand: (data.brand ?? '').toLowerCase(),
            expiryMonth: data.expiryMonth,
            expiryYear: data.expiryYear,
            isDefault: data.isDefault ?? false,
        };
    }

    /**
     * DELETE /wallet/cards/:id
     */
    static async deleteCard(cardId: string): Promise<void> {
        await apiClient.delete(`/wallet/cards/${cardId}`);
    }

    /**
     * POST /wallet/topup/initiate
     * amountUsd is a whole number (dollars).
     */
    static async topUp(amountUsd: number, cardId?: string): Promise<{
        transactionId: string;
        clientSecret: string;
        amountUsd: number;
        serviceFeeUsd: number;
        totalChargeUsd: number;
        netNgnAmount: number;
        serviceFeeNgn: number;
        exchangeRate: number;
    }> {
        const { data } = await apiClient.post<any>('/wallet/topup/initiate', {
            amountUsd,
            cardId,
        });
        return data;
    }

    /**
     * GET /wallet/config — exchange rate & fee percentage from admin.
     */
    static async getConfig(): Promise<{ exchangeRate: number; topUpFeePercentage: number }> {
        const { data } = await apiClient.get<any>('/wallet/config');
        return {
            exchangeRate: data.exchangeRate ?? 1500,
            topUpFeePercentage: data.topUpFeePercentage ?? 1.5,
        };
    }
}
