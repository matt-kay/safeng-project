import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { AdminUserService } from '@/services/sdk/admin-user-service';
import { Beneficiary } from '@/services/sdk/beneficiary-service';

const SERVICE_CONFIG: Record<string, { icon: any; component: any; color: string }> = {
    airtime: { icon: 'cellphone', component: MaterialCommunityIcons, color: '#FF3B30' },
    data: { icon: 'signal-cellular-4-bar', component: MaterialIcons, color: '#007AFF' },
    electricity: { icon: 'lightbulb', component: MaterialCommunityIcons, color: '#FFCC00' },
    tv: { icon: 'television', component: MaterialCommunityIcons, color: '#5856D6' },
};

export default function AdminUserBeneficiariesScreen() {
    const { colors, triggerHaptic } = useSettings();
    const router = useRouter();
    const { uid } = useLocalSearchParams<{ uid: string }>();

    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (uid) {
            fetchBeneficiaries();
        }
    }, [uid]);

    const fetchBeneficiaries = async () => {
        setLoading(true);
        try {
            const data = await AdminUserService.getUserBeneficiaries(uid);
            setBeneficiaries(data);
        } catch (error) {
            console.error('Failed to load beneficiaries:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchBeneficiaries();
    };

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
                {beneficiary.isFavorite && (
                    <Ionicons name="star" size={18} color="#FFCC00" />
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'User Beneficiaries',
                headerShown: true,
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {loading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : beneficiaries.length > 0 ? (
                    beneficiaries.map(renderBeneficiaryCard)
                ) : (
                    <View style={styles.centered}>
                        <Ionicons name="people-outline" size={64} color={colors.border} />
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>No beneficiaries found</Text>
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
    content: {
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
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    identifier: {
        fontSize: 13,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
});
