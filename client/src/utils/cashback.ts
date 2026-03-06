import { NetworkProvider } from './network-detection';

export type ServiceIdentifier = 'airtime' | 'data' | 'tv-subscription' | 'electricity-bill';

/**
 * VTpass Commission Rates for API Users (Estimated)
 * These are the percentages VTpass gives to the platform.
 */
const COMMISSIONS: Record<ServiceIdentifier, Record<string, number>> = {
    airtime: {
        mtn: 0.03,
        glo: 0.04,
        airtel: 0.03,
        '9mobile': 0.045,
        default: 0.03,
    },
    data: {
        mtn: 0.03,
        glo: 0.04,
        airtel: 0.03,
        '9mobile': 0.04,
        default: 0.03,
    },
    'tv-subscription': {
        default: 0.02, // Often flat, but approximating
    },
    'electricity-bill': {
        default: 0.015, // Often flat
    },
};

/**
 * Calculates the estimated cashback for a transaction.
 * The user receives 30% of the commission earned by the platform.
 */
export const calculateEstimatedCashback = (
    service: ServiceIdentifier,
    amount: number,
    provider?: NetworkProvider | string
): number => {
    if (!amount || amount <= 0) return 0;

    const serviceCommissions = COMMISSIONS[service] || COMMISSIONS.airtime;
    const providerKey = (provider || 'default').toLowerCase();

    const commissionRate = serviceCommissions[providerKey] || serviceCommissions.default;

    // Platform earns: amount * commissionRate
    // User earns: 30% of platform earnings
    const platformCommission = amount * commissionRate;
    const userCashback = platformCommission * 0.3;

    return Math.floor(userCashback);
};
