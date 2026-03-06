import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { Beneficiary, BeneficiaryService } from '@/services/sdk/beneficiary-service';
import { StatusBar } from 'expo-status-bar';

const FILTER_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'Airtime', value: 'airtime' },
    { label: 'Data', value: 'data' },
    { label: 'Electricity', value: 'electricity' },
    { label: 'Cable TV', value: 'tv' },
];

const SERVICE_CONFIG: Record<string, { icon: any; component: any; color: string }> = {
    airtime: { icon: 'cellphone', component: MaterialCommunityIcons, color: '#FF3B30' },
    data: { icon: 'signal-cellular-4-bar', component: MaterialIcons, color: '#007AFF' },
    electricity: { icon: 'lightbulb', component: MaterialCommunityIcons, color: '#FFCC00' },
    tv: { icon: 'television', component: MaterialCommunityIcons, color: '#5856D6' },
};

export default function BeneficiariesScreen() {
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const router = useRouter();
    const isDark = resolvedTheme === 'dark';

    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const fetchBeneficiaries = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const data = await BeneficiaryService.getBeneficiaries();
            setBeneficiaries(data);
        } catch (error) {
            console.error('Failed to fetch beneficiaries:', error);
            Alert.alert('Error', 'Failed to load beneficiaries. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBeneficiaries();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBeneficiaries(false);
    };

    const toggleFavorite = async (beneficiary: Beneficiary) => {
        triggerHaptic();
        try {
            const updated = await BeneficiaryService.updateBeneficiary(beneficiary.id, {
                isFavorite: !beneficiary.isFavorite
            });
            setBeneficiaries(prev => prev.map(b => b.id === updated.id ? updated : b));
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            Alert.alert('Error', 'Failed to update favorite status.');
        }
    };

    const deleteBeneficiary = async (id: string) => {
        triggerHaptic();
        Alert.alert(
            'Delete Beneficiary',
            'Are you sure you want to remove this beneficiary?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await BeneficiaryService.deleteBeneficiary(id);
                            setBeneficiaries(prev => prev.filter(b => b.id !== id));
                        } catch (error) {
                            console.error('Failed to delete beneficiary:', error);
                            Alert.alert('Error', 'Failed to delete beneficiary.');
                        }
                    }
                }
            ]
        );
    };

    const filteredBeneficiaries = useMemo(() => {
        return beneficiaries
            .filter(b => {
                const matchesSearch = b.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    b.providerServiceId.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesFilter = filter === 'all' || b.serviceType.toLowerCase() === filter;
                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => {
                // Favorites first
                if (a.isFavorite && !b.isFavorite) return -1;
                if (!a.isFavorite && b.isFavorite) return 1;
                // Then alphabetical
                return a.nickname.localeCompare(b.nickname);
            });
    }, [beneficiaries, searchQuery, filter]);

    const renderBeneficiaryCard = (beneficiary: Beneficiary) => {
        const config = SERVICE_CONFIG[beneficiary.serviceType.toLowerCase()] || {
            icon: 'person',
            component: Ionicons,
            color: colors.primary
        };
        const IconComponent = config.component;

        return (
            <View key={beneficiary.id} style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={[styles.iconWrapper, { backgroundColor: config.color + '15' }]}>
                    <IconComponent name={config.icon} size={24} color={config.color} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={[styles.nickname, { color: colors.text }]} numberOfLines={1}>
                        {beneficiary.nickname}
                    </Text>
                    <Text style={[styles.identifier, { color: colors.subtext }]} numberOfLines={1}>
                        {beneficiary.billerName} • {beneficiary.providerServiceId}
                    </Text>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => toggleFavorite(beneficiary)} style={styles.actionButton}>
                        <Ionicons
                            name={beneficiary.isFavorite ? "star" : "star-outline"}
                            size={22}
                            color={beneficiary.isFavorite ? "#FFCC00" : colors.icon}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteBeneficiary(beneficiary.id)} style={styles.actionButton}>
                        <Ionicons name="trash-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Beneficiaries</Text>
                </View>

                <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                    <Ionicons name="search" size={20} color={colors.subtext} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search nickname or number"
                        placeholderTextColor={colors.subtext}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={colors.subtext} />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContainer}
                >
                    {FILTER_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            onPress={() => { triggerHaptic(); setFilter(opt.value); }}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: filter === opt.value
                                        ? (isDark ? colors.primary : colors.primary)
                                        : (isDark ? '#2C2C2E' : '#E5E5EA')
                                }
                            ]}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: filter === opt.value ? '#FFFFFF' : colors.text }
                            ]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : filteredBeneficiaries.length > 0 ? (
                    filteredBeneficiaries.map(renderBeneficiaryCard)
                ) : (
                    <View style={styles.centerContainer}>
                        <Ionicons name="people-outline" size={64} color={colors.border} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No beneficiaries found</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                            {searchQuery || filter !== 'all'
                                ? "Try adjusting your search or filter"
                                : "Your saved beneficiaries will appear here"}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        marginRight: 12,
        marginLeft: -8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    filterContainer: {
        paddingRight: 20,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        padding: 20,
        flexGrow: 1,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardInfo: {
        flex: 1,
    },
    nickname: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    identifier: {
        fontSize: 14,
    },
    cardActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 240,
    },
});
