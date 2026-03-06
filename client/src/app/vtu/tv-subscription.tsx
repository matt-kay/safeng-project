import React, { useState, useEffect, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BeneficiaryTabs from '../../components/BeneficiaryTabs';
import PaymentSourceSelector from '../../components/PaymentSourceSelector';
import VTUProcessingModal from '../../components/VTUProcessingModal';
import { WalletService, WalletBalance } from '../../services/sdk/wallet-service';
import { calculateEstimatedCashback } from '../../utils/cashback';
import { detectTVProvider } from '../../utils/network-detection';
import { VTUService, VTPassVariation } from '../../services/sdk/vtu-service';
import { BeneficiaryService } from '../../services/sdk/beneficiary-service';

const PROVIDERS = [
    { id: 'dstv', name: 'DStv', color: '#0067A3', icon: 'television-classic', requiresVerification: true },
    { id: 'gotv', name: 'GOtv', color: '#1EB04B', icon: 'television-guide', requiresVerification: true },
    { id: 'startimes', name: 'StarTimes', color: '#E10613', icon: 'satellite-variant', requiresVerification: true },
    { id: 'showmax', name: 'Showmax', color: '#000000', icon: 'play-box-multiple', requiresVerification: false },
];

const SUBSCRIPTION_TYPES = [
    { id: 'change', name: 'New / Change Bouquet', description: 'New purchase or bouquet change' },
    { id: 'renewal', name: 'Renew Bouquet', description: 'Renew existing bouquet' },
];

export default function TVSubscriptionScreen() {
    const [smartcardNumber, setSmartcardNumber] = useState('');
    const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0]);
    const [subscriptionType, setSubscriptionType] = useState<'change' | 'renewal'>('change');
    const [shouldSaveBeneficiary, setShouldSaveBeneficiary] = useState(false);
    const [beneficiaryNickname, setBeneficiaryNickname] = useState('');
    const [variations, setVariations] = useState<VTPassVariation[]>([]);
    const [selectedVariation, setSelectedVariation] = useState<VTPassVariation | null>(null);
    const [isLoadingVariations, setIsLoadingVariations] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifiedName, setVerifiedName] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [balance, setBalance] = useState<WalletBalance | null>(null);
    const [selectedSource, setSelectedSource] = useState<'main' | 'cashback'>('main');
    const [isBalanceLoading, setIsBalanceLoading] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [initiatedAmount, setInitiatedAmount] = useState(0);
    const [initiatedTransactionId, setInitiatedTransactionId] = useState<string | undefined>(undefined);

    const [isProviderModalVisible, setIsProviderModalVisible] = useState(false);

    const router = useRouter();

    useEffect(() => {
        fetchBalance();
    }, []);

    useEffect(() => {
        if (selectedProvider) {
            fetchVariations();
            setVerifiedName('');
        }
    }, [selectedProvider]);

    const fetchBalance = async () => {
        setIsBalanceLoading(true);
        try {
            const data = await WalletService.getBalance();
            setBalance(data);
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        } finally {
            setIsBalanceLoading(false);
        }
    };

    const fetchVariations = async () => {
        setIsLoadingVariations(true);
        try {
            const data = await VTUService.getVariations(selectedProvider.id);
            setVariations(data);
            setSelectedVariation(null);
        } catch (error) {
            console.error('Error fetching variations:', error);
            Alert.alert('Error', 'Failed to fetch TV plans. Please try again.');
        } finally {
            setIsLoadingVariations(false);
        }
    };

    const handleVerify = async () => {
        if (!smartcardNumber) return;
        setIsVerifying(true);
        setVerifiedName('');
        try {
            const data = await VTUService.verifyMerchant(
                smartcardNumber,
                selectedProvider.id,
                'tv'
            );
            if (data.Customer_Name) {
                setVerifiedName(data.Customer_Name);
            } else {
                setVerifiedName('Verified');
            }
        } catch (error: any) {
            console.error('Verification Error:', error);
            Alert.alert('Verification Failed', 'Could not verify smartcard number. Please check the number and provider.');
            setVerifiedName('');
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedVariation || !isBeneficiaryVerified) return;

        setIsPurchasing(true);
        try {
            const numericAmount = parseFloat(selectedVariation.variation_amount);

            // 1. Save Beneficiary if requested
            if (shouldSaveBeneficiary && beneficiaryNickname) {
                try {
                    await BeneficiaryService.createBeneficiary({
                        serviceType: 'tv-subscription',
                        providerServiceId: selectedProvider.id,
                        billerCode: smartcardNumber,
                        billerName: selectedProvider.name,
                        nickname: beneficiaryNickname,
                    });
                } catch (error) {
                    console.error('Failed to save beneficiary:', error);
                }
            }

            // 2. Initiate Transaction
            const response = await VTUService.initiateTransaction({
                serviceID: selectedProvider.id,
                billersCode: smartcardNumber,
                variation_code: selectedVariation.variation_code,
                amount: numericAmount * 100, // to Kobo
                phone: '08000000000', // Placeholder phone or collect user phone if needed
                subscription_type: subscriptionType,
            });

            setInitiatedAmount(numericAmount);
            setInitiatedTransactionId(response.data?.id);
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Purchase failed:', error);
            const message = error.response?.data?.message || 'Failed to initiate purchase. Please try again.';
            Alert.alert('Purchase Error', message);
        } finally {
            setIsPurchasing(false);
        }
    };

    const isBeneficiaryVerified = selectedProvider.requiresVerification ? !!verifiedName : smartcardNumber.length > 5;
    const numericAmount = selectedVariation ? parseFloat(selectedVariation.variation_amount) : 0;
    const selectedBalance = selectedSource === 'main' ? (balance?.balance || 0) : (balance?.cashbackBalance || 0);
    const hasInsufficientFunds = numericAmount > selectedBalance;

    const estimatedCashback = calculateEstimatedCashback('tv-subscription' as any, numericAmount, selectedProvider.id as any);

    const formatAmount = (val: string) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            maximumFractionDigits: 0
        }).format(parseFloat(val));
    };

    const filteredVariations = variations.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={styles.title}>TV Subscription</Text>
                    <TouchableOpacity onPress={() => router.push('/vtu/transactions')} style={styles.transactionsLink}>
                        <Text style={styles.transactionsLinkText}>Transactions</Text>
                        <Ionicons name="receipt-outline" size={16} color="#FF9500" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Provider Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Service Provider</Text>
                        <TouchableOpacity
                            style={styles.selectCard}
                            onPress={() => setIsProviderModalVisible(true)}
                        >
                            <View style={styles.selectCardContent}>
                                <View style={styles.selectedProviderInfo}>
                                    <View style={[styles.providerIconSmall, { backgroundColor: selectedProvider.color + '20' }]}>
                                        <MaterialCommunityIcons name={selectedProvider.icon as any} size={20} color={selectedProvider.color} />
                                    </View>
                                    <Text style={styles.selectedProviderName}>{selectedProvider.name}</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                        </TouchableOpacity>
                    </View>

                    <BeneficiaryTabs
                        serviceIdentifier="tv-subscription"
                        selectedNumber={smartcardNumber}
                        onNumberSelect={(val) => {
                            setSmartcardNumber(val);
                            setVerifiedName('');
                        }}
                        providerId={selectedProvider.id}
                        showSaveSection={isBeneficiaryVerified}
                        onSaveChange={setShouldSaveBeneficiary}
                        onNicknameChange={setBeneficiaryNickname}
                    />

                    {smartcardNumber.length > 0 && selectedProvider.requiresVerification && !verifiedName && (
                        <TouchableOpacity
                            style={[styles.verifyButton, isVerifying && styles.disabledButton]}
                            onPress={handleVerify}
                            disabled={isVerifying}
                        >
                            {isVerifying ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.verifyButtonText}>Verify Smartcard</Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {!!verifiedName && (
                        <View style={styles.verifiedBox}>
                            <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
                            <Text style={styles.verifiedText}>{verifiedName}</Text>
                        </View>
                    )}

                    {!selectedProvider.requiresVerification && smartcardNumber.length > 5 && (
                        <View style={styles.verifiedBox}>
                            <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
                            <Text style={styles.verifiedText}>Ready for Purchase</Text>
                        </View>
                    )}

                    {isBeneficiaryVerified && (
                        <View style={styles.formSection}>
                            {/* Multichoice Specific Logic */}
                            {(selectedProvider.id === 'dstv' || selectedProvider.id === 'gotv') && (
                                <View style={styles.subTypeSection}>
                                    <Text style={styles.label}>Subscription Type</Text>
                                    <View style={styles.subTypeGrid}>
                                        {SUBSCRIPTION_TYPES.map((type) => (
                                            <TouchableOpacity
                                                key={type.id}
                                                style={[
                                                    styles.subTypeCard,
                                                    subscriptionType === type.id && styles.selectedSubType
                                                ]}
                                                onPress={() => setSubscriptionType(type.id as any)}
                                            >
                                                <Text style={[styles.subTypeName, subscriptionType === type.id && styles.selectedSubTypeText]}>{type.name}</Text>
                                                <Text style={styles.subTypeDesc}>{type.description}</Text>
                                                {subscriptionType === type.id && (
                                                    <View style={styles.subTypeCheck}>
                                                        <Ionicons name="checkmark-circle" size={16} color="#FF9500" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <View style={styles.plansSection}>
                                <Text style={styles.label}>Package / Bouquet</Text>
                                <TouchableOpacity
                                    style={styles.selectCard}
                                    onPress={() => setIsModalVisible(true)}
                                    disabled={isLoadingVariations}
                                >
                                    <View style={styles.selectCardContent}>
                                        {selectedVariation ? (
                                            <View>
                                                <Text style={styles.selectedPlanName}>{selectedVariation.name}</Text>
                                                <Text style={styles.selectedPlanPrice}>{formatAmount(selectedVariation.variation_amount)}</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.placeholderText}>
                                                {isLoadingVariations ? 'Fetching plans...' : 'Select a package'}
                                            </Text>
                                        )}
                                    </View>
                                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                                </TouchableOpacity>
                            </View>

                            {selectedVariation && (
                                <View style={styles.paymentSection}>
                                    <PaymentSourceSelector
                                        amount={numericAmount}
                                        mainBalance={balance?.balance || 0}
                                        cashbackBalance={balance?.cashbackBalance || 0}
                                        selectedSource={selectedSource}
                                        onSourceSelect={setSelectedSource}
                                        isLoading={isBalanceLoading}
                                        estimatedCashback={estimatedCashback}
                                        onTopUpPress={() => router.push('/(tabs)/wallet')}
                                    />

                                    <TouchableOpacity
                                        style={[
                                            styles.continueButton,
                                            (hasInsufficientFunds || isPurchasing) && styles.disabledButton
                                        ]}
                                        disabled={hasInsufficientFunds || isPurchasing}
                                        onPress={handlePurchase}
                                    >
                                        {isPurchasing ? (
                                            <ActivityIndicator color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.continueButtonText}>
                                                {hasInsufficientFunds ? 'Insufficient Balance' : 'Purchase'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                <VTUProcessingModal
                    isVisible={showSuccessModal}
                    amount={initiatedAmount}
                    serviceName={`${selectedProvider.name} - ${selectedVariation?.name}`}
                    transactionId={initiatedTransactionId}
                    onDismiss={() => {
                        setShowSuccessModal(false);
                        setSelectedVariation(null);
                        setVerifiedName('');
                        setSmartcardNumber('');
                        fetchBalance();
                    }}
                    onViewTransactions={() => {
                        setShowSuccessModal(false);
                        router.push('/activities');
                    }}
                />

                {/* Provider Selection Modal */}
                <Modal
                    visible={isProviderModalVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setIsProviderModalVisible(false)}
                >
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Provider</Text>
                            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsProviderModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalList}>
                            {PROVIDERS.map((provider) => (
                                <TouchableOpacity
                                    key={provider.id}
                                    style={[
                                        styles.planItem,
                                        Boolean(selectedProvider.id === provider.id) && styles.selectedPlan
                                    ]}
                                    onPress={() => {
                                        setSelectedProvider(provider);
                                        setIsProviderModalVisible(false);
                                    }}
                                >
                                    <View style={styles.planInfo}>
                                        <View style={styles.selectedProviderInfo}>
                                            <View style={[styles.providerIconSmall, { backgroundColor: provider.color + '20' }]}>
                                                <MaterialCommunityIcons name={provider.icon as any} size={20} color={provider.color} />
                                            </View>
                                            <Text style={styles.planName}>{provider.name}</Text>
                                        </View>
                                    </View>
                                    {Boolean(selectedProvider.id === provider.id) && (
                                        <Ionicons name="checkmark-circle" size={24} color="#FF9500" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </SafeAreaView>
                </Modal>

                {/* Bouquet Modal */}
                <Modal
                    visible={isModalVisible}
                    animationType="slide"
                    presentationStyle="fullScreen"
                    onRequestClose={() => setIsModalVisible(false)}
                >
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#1A1A1A" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Select Package</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#8E8E93" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search packages..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#8E8E93"
                            />
                        </View>

                        <ScrollView contentContainerStyle={styles.modalList}>
                            {filteredVariations.map((item, index) => (
                                <TouchableOpacity
                                    key={`${item.variation_code}-${item.variation_amount}-${index}`}
                                    style={[
                                        styles.planItem,
                                        Boolean(selectedVariation?.variation_code === item.variation_code &&
                                            selectedVariation?.variation_amount === item.variation_amount) &&
                                        styles.selectedPlan
                                    ]}
                                    onPress={() => {
                                        setSelectedVariation(item);
                                        setIsModalVisible(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    <View style={styles.planInfo}>
                                        <Text style={styles.planName}>{item.name}</Text>
                                        <Text style={styles.planPrice}>{formatAmount(item.variation_amount)}</Text>
                                    </View>
                                    {Boolean(selectedVariation?.variation_code === item.variation_code &&
                                        selectedVariation?.variation_amount === item.variation_amount) && (
                                            <Ionicons name="checkmark-circle" size={24} color="#FF9500" />
                                        )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </SafeAreaView>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        paddingTop: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        flex: 1,
    },
    transactionsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9F2',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    transactionsLinkText: {
        color: '#FF9500',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 24,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 12,
    },

    verifyButton: {
        backgroundColor: '#1A1A1A',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    verifyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    verifiedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: 16,
        borderRadius: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#C8E6C9',
        gap: 12,
    },
    verifiedText: {
        color: '#2E7D32',
        fontWeight: '700',
        fontSize: 16,
        flex: 1,
    },
    selectedProviderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectedProviderName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    providerIconSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        padding: 4,
    },
    formSection: {
        marginTop: 24,
    },
    subTypeSection: {
        marginBottom: 24,
    },
    subTypeGrid: {
        gap: 12,
    },
    subTypeCard: {
        flexDirection: 'column',
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    selectedSubType: {
        borderColor: '#FF9500',
        backgroundColor: '#FFF9F2',
    },
    subTypeName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    selectedSubTypeText: {
        color: '#FF9500',
    },
    subTypeDesc: {
        fontSize: 13,
        color: '#666',
    },
    subTypeCheck: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    plansSection: {
        marginBottom: 24,
    },
    selectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    selectCardContent: {
        flex: 1,
    },
    selectedPlanName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    selectedPlanPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FF9500',
    },
    placeholderText: {
        fontSize: 16,
        color: '#8E8E93',
    },
    paymentSection: {
        marginTop: 8,
    },
    continueButton: {
        backgroundColor: '#FF9500',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    disabledButton: {
        backgroundColor: '#FFCC80',
    },
    continueButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },

    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F7',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F7',
        margin: 24,
        paddingHorizontal: 16,
        borderRadius: 12,
        height: 50,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#1A1A1A',
    },
    modalList: {
        padding: 24,
        paddingTop: 0,
        gap: 12,
    },
    planItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    selectedPlan: {
        borderColor: '#FF9500',
        backgroundColor: '#FFF9F2',
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    planPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF9500',
    },
});
