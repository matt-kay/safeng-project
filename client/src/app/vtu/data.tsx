import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import BeneficiaryTabs from '../../components/BeneficiaryTabs';
import PaymentSourceSelector from '../../components/PaymentSourceSelector';
import VTUProcessingModal from '../../components/VTUProcessingModal';
import { NetworkProvider, NETWORKS, toVTPassServiceId } from '../../utils/network-detection';
import { WalletService, WalletBalance } from '../../services/sdk/wallet-service';
import { calculateEstimatedCashback } from '../../utils/cashback';
import { VTUService, VTPassVariation } from '../../services/sdk/vtu-service';
import { BeneficiaryService } from '../../services/sdk/beneficiary-service';

export default function DataScreen() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [network, setNetwork] = useState<NetworkProvider>(null);
    const [shouldSaveBeneficiary, setShouldSaveBeneficiary] = useState(false);
    const [beneficiaryNickname, setBeneficiaryNickname] = useState('');
    const [variations, setVariations] = useState<VTPassVariation[]>([]);
    const [selectedVariation, setSelectedVariation] = useState<VTPassVariation | null>(null);
    const [isLoadingVariations, setIsLoadingVariations] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [balance, setBalance] = useState<WalletBalance | null>(null);
    const [selectedSource, setSelectedSource] = useState<'main' | 'cashback'>('main');
    const [isBalanceLoading, setIsBalanceLoading] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [initiatedAmount, setInitiatedAmount] = useState(0);
    const [initiatedTransactionId, setInitiatedTransactionId] = useState<string | undefined>(undefined);

    const router = useRouter();

    useEffect(() => {
        fetchBalance();
    }, []);

    useEffect(() => {
        if (network) {
            fetchVariations();
        } else {
            setVariations([]);
            setSelectedVariation(null);
        }
    }, [network]);

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
        if (!network) return;
        setIsLoadingVariations(true);
        try {
            const serviceId = toVTPassServiceId(network, 'data');
            const data = await VTUService.getVariations(serviceId);
            setVariations(data);
            setSelectedVariation(null);
        } catch (error) {
            console.error('Error fetching variations:', error);
            Alert.alert('Error', 'Failed to fetch data plans. Please try again.');
        } finally {
            setIsLoadingVariations(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedVariation) return;

        setIsPurchasing(true);
        try {
            const numericAmount = parseFloat(selectedVariation.variation_amount);

            // 1. Save Beneficiary if requested
            if (shouldSaveBeneficiary && beneficiaryNickname) {
                try {
                    await BeneficiaryService.createBeneficiary({
                        serviceType: 'data',
                        providerServiceId: network || '',
                        billerCode: phoneNumber,
                        billerName: NETWORKS[network || '']?.name || 'Data',
                        nickname: beneficiaryNickname,
                    });
                } catch (error) {
                    console.error('Failed to save beneficiary:', error);
                }
            }

            // 2. Initiate Transaction
            const response = await VTUService.initiateTransaction({
                serviceID: toVTPassServiceId(network, 'data'),
                billersCode: phoneNumber,
                variation_code: selectedVariation.variation_code,
                amount: numericAmount * 100, // to Kobo
                phone: phoneNumber,
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

    const isBeneficiaryVerified = phoneNumber.length === 11 && phoneNumber.startsWith('0');
    const numericAmount = selectedVariation ? parseFloat(selectedVariation.variation_amount) : 0;
    const selectedBalance = selectedSource === 'main' ? (balance?.balance || 0) : (balance?.cashbackBalance || 0);
    const hasInsufficientFunds = numericAmount > selectedBalance;

    const estimatedCashback = calculateEstimatedCashback('data', numericAmount, network);

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
                    <Text style={styles.title}>Buy Data</Text>
                    <TouchableOpacity onPress={() => router.push('/vtu/transactions')} style={styles.transactionsLink}>
                        <Text style={styles.transactionsLinkText}>Transactions</Text>
                        <Ionicons name="receipt-outline" size={16} color="#FF9500" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <BeneficiaryTabs
                        serviceIdentifier="data"
                        selectedNumber={phoneNumber}
                        onNumberSelect={setPhoneNumber}
                        onNetworkDetect={setNetwork}
                        onSaveChange={setShouldSaveBeneficiary}
                        onNicknameChange={setBeneficiaryNickname}
                    />

                    {isBeneficiaryVerified && (
                        <View style={styles.formSection}>
                            <View style={styles.plansSection}>
                                <Text style={styles.label}>Data Plan</Text>
                                <TouchableOpacity
                                    style={styles.selectCard}
                                    onPress={() => setIsModalVisible(true)}
                                    disabled={isLoadingVariations || !network}
                                >
                                    <View style={styles.selectCardContent}>
                                        {selectedVariation ? (
                                            <View>
                                                <Text style={styles.selectedPlanName}>{selectedVariation.name}</Text>
                                                <Text style={styles.selectedPlanPrice}>{formatAmount(selectedVariation.variation_amount)}</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.placeholderText}>
                                                {isLoadingVariations ? 'Fetching plans...' : 'Select a data plan'}
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
                    serviceName={`${NETWORKS[network || '']?.name || 'Data'} Plan`}
                    transactionId={initiatedTransactionId}
                    onDismiss={() => {
                        setShowSuccessModal(false);
                        setSelectedVariation(null);
                        fetchBalance();
                    }}
                    onViewTransactions={() => {
                        setShowSuccessModal(false);
                        router.push('/activities');
                    }}
                />

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
                            <Text style={styles.modalTitle}>Select Data Plan</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#8E8E93" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search plans..."
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
                                        selectedVariation?.variation_code === item.variation_code &&
                                        selectedVariation?.variation_amount === item.variation_amount &&
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
                                    {selectedVariation?.variation_code === item.variation_code &&
                                        selectedVariation?.variation_amount === item.variation_amount && (
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
    formSection: {
        marginTop: 12,
    },
    plansSection: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
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
});

