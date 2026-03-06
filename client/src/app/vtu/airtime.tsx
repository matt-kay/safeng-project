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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BeneficiaryTabs from '../../components/BeneficiaryTabs';
import AmountInput from '../../components/AmountInput';
import PaymentSourceSelector from '../../components/PaymentSourceSelector';
import VTUProcessingModal from '../../components/VTUProcessingModal';
import { NetworkProvider, NETWORKS, toVTPassServiceId } from '../../utils/network-detection';
import { WalletService, WalletBalance } from '../../services/sdk/wallet-service';
import { calculateEstimatedCashback } from '../../utils/cashback';
import { VTUService } from '../../services/sdk/vtu-service';
import { BeneficiaryService } from '../../services/sdk/beneficiary-service';
import { Alert } from 'react-native';

export default function AirtimeScreen() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [network, setNetwork] = useState<NetworkProvider>(null);
    const [shouldSaveBeneficiary, setShouldSaveBeneficiary] = useState(false);
    const [beneficiaryNickname, setBeneficiaryNickname] = useState('');
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

    const handlePurchase = async () => {
        setIsPurchasing(true);
        try {
            const numericAmount = parseInt(amount, 10);

            // 1. Save Beneficiary if requested
            if (shouldSaveBeneficiary && beneficiaryNickname) {
                try {
                    await BeneficiaryService.createBeneficiary({
                        serviceType: 'airtime',
                        providerServiceId: network || '',
                        billerCode: phoneNumber,
                        billerName: NETWORKS[network || '']?.name || 'Airtime',
                        nickname: beneficiaryNickname,
                    });
                } catch (error) {
                    // Log but don't block purchase if saving beneficiary fails
                    console.error('Failed to save beneficiary:', error);
                }
            }

            // 2. Initiate Transaction
            const response = await VTUService.initiateTransaction({
                serviceID: toVTPassServiceId(network, 'airtime'),
                billersCode: phoneNumber,
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
    const numericAmount = parseInt(amount, 10) || 0;
    const isAmountValid = amount !== '' && numericAmount >= 50 && numericAmount <= 500000;

    const selectedBalance = selectedSource === 'main' ? (balance?.balance || 0) : (balance?.cashbackBalance || 0);
    const hasInsufficientFunds = numericAmount > selectedBalance;

    const estimatedCashback = calculateEstimatedCashback('airtime', numericAmount, network);

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
                    <Text style={styles.title}>Buy Airtime</Text>
                    <TouchableOpacity onPress={() => router.push('/vtu/transactions')} style={styles.transactionsLink}>
                        <Text style={styles.transactionsLinkText}>Transactions</Text>
                        <Ionicons name="receipt-outline" size={16} color="#FF9500" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <BeneficiaryTabs
                        serviceIdentifier="airtime"
                        selectedNumber={phoneNumber}
                        onNumberSelect={setPhoneNumber}
                        onNetworkDetect={setNetwork}
                        onSaveChange={setShouldSaveBeneficiary}
                        onNicknameChange={setBeneficiaryNickname}
                    />

                    {isBeneficiaryVerified && (
                        <View style={styles.formSection}>
                            <AmountInput
                                value={amount}
                                onChange={setAmount}
                                min={50}
                                max={500000}
                                presets={[50, 100, 200, 500, 1000, 2000, 5000]}
                            />

                            {isAmountValid && (
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
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.continueButton,
                                    (!isAmountValid || hasInsufficientFunds || isPurchasing) && styles.disabledButton
                                ]}
                                disabled={!isAmountValid || hasInsufficientFunds || isPurchasing}
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
                </ScrollView>

                <VTUProcessingModal
                    isVisible={showSuccessModal}
                    amount={initiatedAmount}
                    serviceName={`${NETWORKS[network || '']?.name || 'Airtime'} Recharge`}
                    transactionId={initiatedTransactionId}
                    onDismiss={() => {
                        setShowSuccessModal(false);
                        setAmount('');
                        fetchBalance();
                    }}
                    onViewTransactions={() => {
                        setShowSuccessModal(false);
                        router.push('/activities');
                    }}
                />
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
