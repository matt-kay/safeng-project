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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BeneficiaryTabs from '../../components/BeneficiaryTabs';
import PaymentSourceSelector from '../../components/PaymentSourceSelector';
import VTUProcessingModal from '../../components/VTUProcessingModal';
import { WalletService, WalletBalance } from '../../services/sdk/wallet-service';
import { calculateEstimatedCashback } from '../../utils/cashback';
import { VTUService } from '../../services/sdk/vtu-service';
import { BeneficiaryService } from '../../services/sdk/beneficiary-service';

const PROVIDERS = [
    { id: 'ikeja-electric', name: 'IKEDC (Ikeja)', color: '#E10613', icon: 'flash' },
    { id: 'eko-electric', name: 'EKEDC (Eko)', color: '#0067A3', icon: 'flash' },
    { id: 'kano-electric', name: 'KEDCO (Kano)', color: '#1EB04B', icon: 'flash' },
    { id: 'portharcourt-electric', name: 'PHED (Port Harcourt)', color: '#FF9500', icon: 'flash' },
    { id: 'jos-electric', name: 'JED (Jos)', color: '#000000', icon: 'flash' },
    { id: 'ibadan-electric', name: 'IBEDC (Ibadan)', color: '#E10613', icon: 'flash' },
    { id: 'kaduna-electric', name: 'KAEDCO (Kaduna)', color: '#0067A3', icon: 'flash' },
    { id: 'abuja-electric', name: 'AEDC (Abuja)', color: '#1EB04B', icon: 'flash' },
    { id: 'enugu-electric', name: 'EEDC (Enugu)', color: '#FF9500', icon: 'flash' },
    { id: 'benin-electric', name: 'BEDC (Benin)', color: '#000000', icon: 'flash' },
    { id: 'aba-electric', name: 'ABA (Aba)', color: '#E10613', icon: 'flash' },
    { id: 'yola-electric', name: 'YEDC (Yola)', color: '#0067A3', icon: 'flash' },
];


/**
 * SandBox Test Meter Numbers:
 * Prepaid: 1111111111111
 * Postpaid: 1010101010101
 */
const METER_TYPES = [
    { id: 'prepaid', name: 'Prepaid', description: 'Pay before consumption' },
    { id: 'postpaid', name: 'Postpaid', description: 'Pay after consumption' },
];

export default function ElectricityBillScreen() {
    const [meterNumber, setMeterNumber] = useState('');
    const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0]);
    const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
    const [amount, setAmount] = useState('');
    const [shouldSaveBeneficiary, setShouldSaveBeneficiary] = useState(false);
    const [beneficiaryNickname, setBeneficiaryNickname] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifiedName, setVerifiedName] = useState('');
    const [verifiedData, setVerifiedData] = useState<any>(null);
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

    const handleVerify = async () => {
        if (!meterNumber) return;
        setIsVerifying(true);
        setVerifiedName('');
        setVerifiedData(null);
        try {
            const data = await VTUService.verifyMerchant(
                meterNumber,
                selectedProvider.id,
                meterType
            );
            if (data.Customer_Name) {
                setVerifiedName(data.Customer_Name);
                setVerifiedData(data);
            } else {
                setVerifiedName('Verified');
                setVerifiedData(data);
            }
        } catch (error: any) {
            console.error('Verification Error:', error);
            Alert.alert('Verification Failed', 'Could not verify meter number. Please check the number and provider.');
            setVerifiedName('');
            setVerifiedData(null);
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePurchase = async () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount < 500) {
            Alert.alert('Invalid Amount', 'Minimum amount is ₦500');
            return;
        }

        setIsPurchasing(true);
        try {
            // 1. Save Beneficiary if requested
            if (shouldSaveBeneficiary && beneficiaryNickname) {
                try {
                    await BeneficiaryService.createBeneficiary({
                        serviceType: 'electricity-bill',
                        providerServiceId: selectedProvider.id,
                        billerCode: meterNumber,
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
                billersCode: meterNumber,
                variation_code: meterType,
                amount: numericAmount * 100, // to Kobo
                phone: '08000000000', // Placeholder
                subscription_type: meterType,
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

    const isBeneficiaryVerified = !!verifiedName;
    const numericAmount = parseFloat(amount) || 0;
    const selectedBalance = selectedSource === 'main' ? (balance?.balance || 0) : (balance?.cashbackBalance || 0);
    const hasInsufficientFunds = numericAmount > selectedBalance;

    const estimatedCashback = calculateEstimatedCashback('electricity-bill' as any, numericAmount, selectedProvider.id as any);

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
                    <Text style={styles.title}>Electricity Bill</Text>
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

                    {/* Meter Type Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Meter Type</Text>
                        <View style={styles.subTypeGrid}>
                            {METER_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.subTypeCard,
                                        meterType === type.id && styles.selectedSubType
                                    ]}
                                    onPress={() => {
                                        setMeterType(type.id as any);
                                        setVerifiedName('');
                                    }}
                                >
                                    <Text style={[styles.subTypeName, meterType === type.id && styles.selectedSubTypeText]}>{type.name}</Text>
                                    <Text style={styles.subTypeDesc}>{type.description}</Text>
                                    {meterType === type.id && (
                                        <View style={styles.subTypeCheck}>
                                            <Ionicons name="checkmark-circle" size={16} color="#FF9500" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <BeneficiaryTabs
                        serviceIdentifier="electricity-bill"
                        selectedNumber={meterNumber}
                        onNumberSelect={(val) => {
                            setMeterNumber(val);
                            setVerifiedName('');
                        }}
                        providerId={selectedProvider.id}
                        showSaveSection={isBeneficiaryVerified}
                        onSaveChange={setShouldSaveBeneficiary}
                        onNicknameChange={setBeneficiaryNickname}
                    />

                    {meterNumber.length > 0 && !verifiedName && (
                        <TouchableOpacity
                            style={[styles.verifyButton, isVerifying && styles.disabledButton]}
                            onPress={handleVerify}
                            disabled={isVerifying}
                        >
                            {isVerifying ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.verifyButtonText}>Verify Meter Number</Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {!!verifiedName && (
                        <View style={styles.verifiedBox}>
                            <View style={styles.verifiedIconWrap}>
                                <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
                            </View>
                            <View style={styles.verifiedContent}>
                                <Text style={styles.verifiedText}>{verifiedName}</Text>
                                {!!verifiedData?.Address && (
                                    <Text style={styles.verifiedSubText}>{verifiedData.Address}</Text>
                                )}
                                {!!verifiedData?.Customer_Arrears && parseFloat(verifiedData.Customer_Arrears) > 0 && (
                                    <Text style={styles.arrearsText}>Arrears: ₦{verifiedData.Customer_Arrears}</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {isBeneficiaryVerified && (
                        <View style={styles.formSection}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Amount (₦)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Min ₦500"
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                />
                            </View>

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
                                        (hasInsufficientFunds || isPurchasing || numericAmount < 500) && styles.disabledButton
                                    ]}
                                    disabled={hasInsufficientFunds || isPurchasing || numericAmount < 500}
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
                        </View>
                    )}
                </ScrollView>

                <VTUProcessingModal
                    isVisible={showSuccessModal}
                    amount={initiatedAmount}
                    serviceName={`${selectedProvider.name} - ${meterType.toUpperCase()}`}
                    transactionId={initiatedTransactionId}
                    onDismiss={() => {
                        setShowSuccessModal(false);
                        setAmount('');
                        setVerifiedName('');
                        setMeterNumber('');
                        fetchBalance();
                    }}
                    onViewTransactions={() => {
                        setShowSuccessModal(false);
                        router.push('/vtu/transactions');
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
                                        setVerifiedName('');
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
    selectedProviderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    providerIconSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedProviderName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
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
    disabledButton: {
        backgroundColor: '#FFCC80',
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
    verifiedIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedContent: {
        flex: 1,
        gap: 2,
    },
    verifiedText: {
        color: '#2E7D32',
        fontWeight: '700',
        fontSize: 16,
    },
    verifiedSubText: {
        color: '#2E7D32',
        fontSize: 13,
        opacity: 0.8,
    },
    arrearsText: {
        color: '#D32F2F',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 4,
    },
    formSection: {
        marginTop: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    input: {
        backgroundColor: '#F5F5F7',
        height: 56,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    paymentSection: {
        gap: 12,
    },
    continueButton: {
        backgroundColor: '#FF9500',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
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
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalList: {
        padding: 24,
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
    },
});
