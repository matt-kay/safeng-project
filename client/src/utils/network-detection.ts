export type NetworkProvider = 'mtn' | 'glo' | 'airtel' | '9mobile' | null;

export interface NetworkConfig {
    name: string;
    color: string;
    logo?: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
    mtn: { name: 'MTN', color: '#FFCC00' },
    glo: { name: 'Glo', color: '#008444' },
    airtel: { name: 'Airtel', color: '#E11900' },
    '9mobile': { name: '9mobile', color: '#006600' },
};

const PREFIXES: Record<string, string[]> = {
    mtn: [
        '0703', '0706', '0803', '0806', '0810', '0813', '0814', '0816',
        '0903', '0906', '0913', '0916'
    ],
    glo: [
        '0705', '0805', '0807', '0811', '0815', '0905', '0915'
    ],
    airtel: [
        '0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904',
        '0907', '0911', '0912', '0917'
    ],
    '9mobile': [
        '0809', '0817', '0818', '0908', '0909'
    ],
};

// VTPass Sandbox numbers usually use 08011111111 but sometimes they recommend 
// specific ones for different results. To support detection in DEV, we'll
// map specific sandbox-style numbers to providers.
const SANDBOX_DETECTION: Record<string, NetworkProvider> = {
    '08011111111': 'mtn',
    '08022222222': 'glo',
    '08033333333': 'airtel',
    '08044444444': '9mobile',
};

/**
 * Maps a NetworkProvider to the correct VTpass serviceID.
 * VTpass uses 'etisalat' for 9mobile, and for data appends '-data'.
 *
 * @param network - Detected network provider (e.g. 'mtn', '9mobile')
 * @param serviceType - 'airtime' or 'data'
 * @returns VTpass serviceID (e.g. 'mtn', 'etisalat', 'mtn-data', 'etisalat-data')
 */
export const toVTPassServiceId = (
    network: NetworkProvider,
    serviceType: 'airtime' | 'data',
): string => {
    if (!network) return '';
    // VTpass uses the old brand name 'etisalat' for 9mobile
    const vtpassNetwork = network === '9mobile' ? 'etisalat' : network;
    return serviceType === 'airtime' ? vtpassNetwork : `${vtpassNetwork}-data`;
};

/**
 * Detects the network provider for a Nigerian phone number.
 * Supports standard prefixes and VTPass sandbox numbers in DEV mode.
 */
export const detectNetwork = (phoneNumber: string): NetworkProvider => {
    const cleaned = phoneNumber.replace(/\D/g, '');

    // In development environment, check for sandbox numbers first
    if (__DEV__) {
        if (SANDBOX_DETECTION[cleaned]) {
            return SANDBOX_DETECTION[cleaned];
        }
    }

    if (cleaned.length < 4) return null;

    const prefix = cleaned.substring(0, 4);

    for (const [provider, providerPrefixes] of Object.entries(PREFIXES)) {
        if (providerPrefixes.includes(prefix)) {
            return provider as NetworkProvider;
        }
    }

    return null;
};

/**
 * Detects the TV provider for a smartcard or IUC number.
 * Supports VTPass sandbox numbers and basic length patterns.
 */
export const detectTVProvider = (number: string): string | null => {
    const cleaned = number.replace(/\D/g, '');

    // In development environment, check for sandbox numbers first
    if (__DEV__) {
        if (cleaned === '1212121212') return 'dstv'; // Multichoice default
        if (cleaned === '0212121212') return 'startimes';
        if (cleaned === '08011111111') return 'showmax';
    }

    if (cleaned.length === 10) return 'dstv'; // DStv/GOtv default
    if (cleaned.length === 11) return 'startimes';

    return null;
};
