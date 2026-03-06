import React, { useState, useEffect, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    FlatList,
    Modal,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Beneficiary, BeneficiaryService } from '../services/sdk/beneficiary-service';
import { detectNetwork, NETWORKS, NetworkProvider } from '../utils/network-detection';

export type ServiceIdentifier = 'airtime' | 'data' | 'tv-subscription' | 'electricity-bill';

interface BeneficiaryTabsProps {
    serviceIdentifier: ServiceIdentifier;
    onNumberSelect: (phoneNumber: string) => void;
    onNetworkDetect?: (network: NetworkProvider) => void;
    onSaveChange?: (save: boolean) => void;
    onNicknameChange?: (nickname: string) => void;
    onProviderDetect?: (providerId: string) => void;
    providerId?: string;
    selectedNumber?: string;
    showSaveSection?: boolean;
}

const getServiceConfig = (service: ServiceIdentifier) => {
    switch (service) {
        case 'tv-subscription':
            return {
                newTabLabel: 'New SmartCard Number',
                inputLabel: 'Enter SmartCard Number',
                inputPlaceholder: '080########',
                validateRule: 'any' as const,
                maxLength: 20,
            };
        case 'electricity-bill':
            return {
                newTabLabel: 'New Meter Number',
                inputLabel: 'Enter Meter Number',
                inputPlaceholder: '080########',
                validateRule: 'any' as const,
                maxLength: 20,
            };
        case 'data':
        case 'airtime':
        default:
            return {
                newTabLabel: 'New Number',
                inputLabel: 'Enter Phone Number',
                inputPlaceholder: '080########',
                validateRule: 'phone' as const,
                maxLength: 11,
            };
    }
};

export default function BeneficiaryTabs({
    serviceIdentifier,
    onNumberSelect,
    onNetworkDetect,
    onSaveChange,
    onNicknameChange,
    onProviderDetect,
    providerId,
    selectedNumber,
    showSaveSection,
}: BeneficiaryTabsProps) {
    const { newTabLabel, inputLabel, inputPlaceholder, validateRule, maxLength } = getServiceConfig(serviceIdentifier);
    const [activeTab, setActiveTab] = useState<'beneficiaries' | 'new'>('beneficiaries');
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newNumber, setNewNumber] = useState('');
    const [detectedNetwork, setDetectedNetwork] = useState<NetworkProvider>(null);
    const [shouldSave, setShouldSave] = useState(false);
    const [nickname, setNickname] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        if (activeTab === 'beneficiaries') {
            fetchBeneficiaries();
        }
    }, [activeTab]);

    const fetchBeneficiaries = async () => {
        setIsLoading(true);
        try {
            const data = await BeneficiaryService.getBeneficiaries();
            setBeneficiaries(data);
        } catch (error) {
            console.error('Failed to fetch beneficiaries:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Vetted phone numbers are typically 11 digits starting with 0.
    // Also ensuring serviceType contains airtime or data, but to be robust, we'll check the identifier itself.
    // Sometimes providerServiceId or billerCode is the phone number.
    const isPhoneNumber = (text: string) => /^0\d{10}$/.test(text.replace(/[\s-]/g, ''));

    const phoneBeneficiaries = useMemo(() => {
        return beneficiaries.filter(b => {
            // Let's check billerCode first, if not then providerServiceId, maybe nickname. 
            // Usually, billerCode or providerServiceId contains the phone number for VTU.
            const possibleNumbers = [b.billerCode, b.providerServiceId, b.nickname].map(n => n ? n.toString().replace(/[\s-]/g, '') : '');

            if (validateRule === 'phone') {
                // For airtime and data, must be vetted as a valid phone number
                return possibleNumbers.some(isPhoneNumber);
            } else {
                // For tv-subscription and electricity-bill, filter by service type
                const baseWord = serviceIdentifier.split('-')[0];
                const matchesService = b.serviceType && b.serviceType.toLowerCase().includes(baseWord);

                // If providerId is specified, strictly filter by it
                if (providerId) {
                    return matchesService && b.providerServiceId === providerId;
                }

                return matchesService;
            }
        });
    }, [beneficiaries, serviceIdentifier, validateRule, providerId]);

    const getStoredPhoneNumber = (b: Beneficiary) => {
        const possibleNumbers = [b.billerCode, b.providerServiceId, b.nickname].map(n => n ? n.toString().replace(/[\s-]/g, '') : '');
        return possibleNumbers.find(isPhoneNumber) || b.billerCode;
    }

    const handleNewNumberChange = (text: string) => {
        // Strip out non-digits
        const cleaned = text.replace(/\D/g, '');
        setNewNumber(cleaned);

        if (validateRule === 'phone') {
            const network = detectNetwork(cleaned);
            setDetectedNetwork(network);
            onNetworkDetect?.(network);

            // Only notify provider change for phone/airtime/data
            if (network) {
                onProviderDetect?.(network);
            }

            const isValid = cleaned.length === 11 && cleaned.startsWith('0');
            if (isValid) {
                onNumberSelect(cleaned);
            } else if (selectedNumber && selectedNumber !== cleaned) {
                onNumberSelect('');
            }

            // Reset save state if number changes significantly? 
            // Maybe just keep it.
        } else {
            // For 'any', we can just pass the number to the parent and let them validate,
            // or pass it if it's got some length. Let's just pass it up if not empty.
            if (cleaned.length > 0) {
                onNumberSelect(cleaned);
            } else if (selectedNumber) {
                onNumberSelect('');
            }
        }
    };

    const renderBeneficiaryItem = ({ item }: { item: Beneficiary }) => {
        const phoneNumber = getStoredPhoneNumber(item);
        const isSelected = selectedNumber === phoneNumber;

        return (
            <TouchableOpacity
                style={[styles.beneficiaryCard, isSelected && styles.selectedCard]}
                onPress={() => {
                    onNumberSelect(phoneNumber);
                    if (validateRule === 'phone') {
                        const network = detectNetwork(phoneNumber);
                        setDetectedNetwork(network);
                        onNetworkDetect?.(network);
                        if (network) {
                            onProviderDetect?.(network);
                        }
                    }
                    setIsModalVisible(false);
                }}
            >
                <View style={styles.beneficiaryIconContainer}>
                    <Ionicons name="person" size={20} color={isSelected ? "#FF9500" : "#666"} />
                </View>
                <View style={styles.beneficiaryInfo}>
                    <Text style={[styles.beneficiaryName, isSelected && styles.selectedText]}>{item.nickname || item.billerName || 'Unknown'}</Text>
                    <Text style={[styles.beneficiaryNumber, isSelected && styles.selectedText]}>{phoneNumber}</Text>
                </View>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#FF9500" />
                )}
            </TouchableOpacity>
        );
    };

    const handleTabChange = (tab: 'beneficiaries' | 'new') => {
        if (tab === activeTab) return;

        setActiveTab(tab);

        // Reset everything
        setNewNumber('');
        setDetectedNetwork(null);
        setShouldSave(false);
        setNickname('');

        // Notify parent
        onNumberSelect('');
        onNetworkDetect?.(null);
        onSaveChange?.(false);
        onNicknameChange?.('');
    };

    return (
        <View style={styles.container}>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'beneficiaries' && styles.activeTab]}
                    onPress={() => handleTabChange('beneficiaries')}
                >
                    <Text style={[styles.tabText, activeTab === 'beneficiaries' && styles.activeTabText]}>
                        Beneficiaries
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'new' && styles.activeTab]}
                    onPress={() => handleTabChange('new')}
                >
                    <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
                        {newTabLabel}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>
                {activeTab === 'beneficiaries' ? (
                    isLoading ? (
                        <ActivityIndicator style={styles.loader} color="#FF9500" />
                    ) : (
                        <View>
                            {/* Selected Beneficiary or Select Placeholder Card */}
                            {(() => {
                                const selectedB = phoneBeneficiaries.find(b => getStoredPhoneNumber(b) === selectedNumber && selectedNumber !== '');

                                if (selectedB && selectedNumber) {
                                    const isPhone = validateRule === 'phone';
                                    const network = isPhone ? detectNetwork(selectedNumber) : null;

                                    return (
                                        <TouchableOpacity style={styles.selectCard} onPress={() => setIsModalVisible(true)}>
                                            <View style={styles.beneficiaryIconContainer}>
                                                <Ionicons name="person" size={20} color="#FF9500" />
                                            </View>
                                            <View style={styles.beneficiaryInfo}>
                                                <Text style={styles.beneficiaryName}>{selectedB.nickname || selectedB.billerName || 'Unknown'}</Text>
                                                <Text style={styles.beneficiaryNumber}>{selectedNumber}</Text>
                                            </View>
                                            {network && (
                                                <View style={styles.cardNetworkBadge}>
                                                    <Text style={[styles.networkBadgeText, { color: NETWORKS[network].color }]}>
                                                        {NETWORKS[network].name}
                                                    </Text>
                                                </View>
                                            )}
                                            <Ionicons name="chevron-down" size={20} color="#666" />
                                        </TouchableOpacity>
                                    );
                                }

                                return (
                                    <TouchableOpacity style={styles.selectCard} onPress={() => setIsModalVisible(true)}>
                                        <View style={styles.beneficiaryIconContainer}>
                                            <Ionicons name="people" size={20} color="#666" />
                                        </View>
                                        <View style={styles.beneficiaryInfo}>
                                            <Text style={styles.selectCardPlaceholder}>Select a beneficiary</Text>
                                        </View>
                                        <Ionicons name="chevron-down" size={20} color="#666" />
                                    </TouchableOpacity>
                                );
                            })()}
                        </View>
                    )
                ) : (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{inputLabel}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder={inputPlaceholder}
                                keyboardType="phone-pad"
                                value={newNumber}
                                onChangeText={handleNewNumberChange}
                                maxLength={maxLength}
                            />
                            {!!(validateRule === 'phone' && detectedNetwork) && (
                                <View style={styles.networkBadge}>
                                    <Text style={[styles.networkBadgeText, { color: NETWORKS[detectedNetwork].color }]}>
                                        {NETWORKS[detectedNetwork].name}
                                    </Text>
                                </View>
                            )}
                            {!!(validateRule === 'phone' && newNumber.length > 0 && newNumber.length < 11) && (
                                <Text style={styles.inputHint}>Must be 11 digits</Text>
                            )}
                            {!!(validateRule === 'phone' && newNumber.length === 11 && !newNumber.startsWith('0')) && (
                                <Text style={styles.inputHintError}>Must start with 0</Text>
                            )}
                        </View>

                        {/* Save to Beneficiaries Section */}
                        {Boolean(
                            showSaveSection ||
                            (validateRule === 'phone' && newNumber.length === 11 && newNumber.startsWith('0'))
                        ) && (
                                <View style={styles.saveSection}>
                                    <TouchableOpacity
                                        style={styles.checkboxContainer}
                                        onPress={() => {
                                            const newVal = !shouldSave;
                                            setShouldSave(newVal);
                                            onSaveChange?.(newVal);

                                            // Auto-generate nickname if enabled and current nickname is empty
                                            if (newVal && !nickname) {
                                                const provider = detectedNetwork || providerId || 'unknown';
                                                const generatedName = `${serviceIdentifier}#${provider}#${newNumber}`;
                                                setNickname(generatedName);
                                                onNicknameChange?.(generatedName);
                                            }
                                        }}
                                    >
                                        <Ionicons
                                            name={shouldSave ? "checkbox" : "square-outline"}
                                            size={24}
                                            color={shouldSave ? "#FF9500" : "#999"}
                                        />
                                        <Text style={styles.checkboxLabel}>Save to Beneficiaries</Text>
                                    </TouchableOpacity>

                                    {shouldSave && (
                                        <View style={styles.nicknameGroup}>
                                            <Text style={styles.label}>Nickname</Text>
                                            <TextInput
                                                style={[styles.input, !nickname && styles.inputError]}
                                                placeholder="Enter nickname"
                                                value={nickname}
                                                onChangeText={(text) => {
                                                    setNickname(text);
                                                    onNicknameChange?.(text);
                                                }}
                                            />
                                            {!nickname && (
                                                <Text style={styles.inputHintError}>Nickname is required to save</Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}
                    </View>
                )}
            </View>

            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Beneficiary</Text>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#1A1A1A" />
                        </TouchableOpacity>
                    </View>

                    {phoneBeneficiaries.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={48} color="#CCC" />
                            <Text style={styles.emptyStateText}>No saved phone numbers found.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={phoneBeneficiaries}
                            keyExtractor={(item) => item.id}
                            renderItem={renderBeneficiaryItem}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalListContent}
                            initialNumToRender={15}
                            maxToRenderPerBatch={20}
                            windowSize={10}
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F7',
        borderRadius: 12,
        padding: 4,
        marginBottom: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666666',
    },
    activeTabText: {
        color: '#1A1A1A',
    },
    contentContainer: {
        minHeight: 120, // Provides some stable visual height while switching tabs
    },
    loader: {
        marginTop: 40,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        padding: 24,
    },
    emptyStateText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    listContainer: {
        gap: 12,
        paddingBottom: 20,
    },
    selectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        marginBottom: 0,
    },
    selectCardPlaceholder: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    cardNetworkBadge: {
        backgroundColor: '#F5F5F7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#F5F5F7',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalListContent: {
        padding: 16,
        gap: 12,
        paddingBottom: 40,
    },
    beneficiaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9FB',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    selectedCard: {
        borderColor: '#FF9500',
        backgroundColor: '#FFF9F2',
    },
    beneficiaryIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EBEBEB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    beneficiaryInfo: {
        flex: 1,
    },
    beneficiaryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    beneficiaryNumber: {
        fontSize: 14,
        color: '#666',
    },
    selectedText: {
        color: '#CC7A00',
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        backgroundColor: '#F5F5F7',
        height: 60,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingRight: 80, // Space for network badge
        fontSize: 16,
        color: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    inputError: {
        borderColor: '#FF3B30',
        backgroundColor: '#FFF5F5',
    },
    networkBadge: {
        position: 'absolute',
        right: 12,
        top: 15,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    networkBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    inputHint: {
        position: 'absolute',
        bottom: -20,
        left: 4,
        fontSize: 12,
        color: '#666',
    },
    inputHintError: {
        position: 'absolute',
        bottom: -20,
        left: 4,
        fontSize: 12,
        color: '#FF3B30',
    },
    saveSection: {
        marginTop: 12,
        gap: 16,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#1A1A1A',
        fontWeight: '500',
    },
    nicknameGroup: {
        marginTop: 8,
        gap: 8,
    },
});
