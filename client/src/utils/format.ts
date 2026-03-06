/**
 * Formats a number as a currency string.
 * @param amount - The amount to format.
 * @param currency - The currency code (default: 'NGN').
 * @param showSign - Whether to show the plus/minus sign for credit/debit (optional).
 * @returns A formatted currency string.
 */
export const formatCurrency = (
    amount: number,
    currency: string = 'NGN',
    options?: {
        showSign?: boolean;
        direction?: 'CREDIT' | 'DEBIT';
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
    }
): string => {
    const formatter = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: options?.minimumFractionDigits ?? 2,
        maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    });

    let formatted = formatter.format(Math.abs(amount));

    if (options?.showSign && options?.direction) {
        const sign = options.direction === 'CREDIT' ? '+' : '-';
        return `${sign}${formatted}`;
    }

    if (amount < 0) {
        return `-${formatted}`;
    }

    return formatted;
};
