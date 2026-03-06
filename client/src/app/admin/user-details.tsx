import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { AdminUserService, UserListItem } from '@/services/sdk/admin-user-service';
import { WalletBalance, PaymentCard } from '@/services/sdk/wallet-service';

export default function AdminUserDetailsScreen() {
    const { colors, triggerHaptic } = useSettings();
    const router = useRouter();
    const { uid } = useLocalSearchParams<{ uid: string }>();

    const [user, setUser] = useState<UserListItem | null>(null);
    const [wallet, setWallet] = useState<WalletBalance | null>(null);
    const [cards, setCards] = useState<PaymentCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (uid) {
            fetchUser(uid);
        }
    }, [uid]);

    const fetchUser = async (userUid: string) => {
        setLoading(true);
        try {
            const [userData, walletData, cardsData] = await Promise.all([
                AdminUserService.getUser(userUid),
                AdminUserService.getUserWallet(userUid),
                AdminUserService.getUserCards(userUid)
            ]);
            setUser(userData);
            setWallet(walletData);
            setCards(cardsData);
        } catch (error) {
            console.error('Failed to load user details:', error);
            Alert.alert('Error', 'Failed to load user details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'User Details', headerShown: true }} />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'User Details', headerShown: true }} />
                <View style={styles.centered}>
                    <Text style={{ color: colors.text }}>User not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'User Details',
                headerShown: true,
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>
                            {user.first_name?.[0]}{user.last_name?.[0]}
                        </Text>
                    </View>

                    <Text style={[styles.name, { color: colors.text }]}>{user.first_name} {user.last_name}</Text>
                    <Text style={[styles.email, { color: colors.subtext }]}>{user.email}</Text>

                    <View style={[styles.badge, { backgroundColor: getStatusColor(user.status) + '22' }]}>
                        <Text style={[styles.badgeText, { color: getStatusColor(user.status) }]}>
                            {user.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <InfoRow label="Phone" value={user.phone_number || 'N/A'} icon="call-outline" color={colors.text} subColor={colors.subtext} />
                    <InfoRow label="Role" value={user.role} icon="shield-outline" color={colors.text} subColor={colors.subtext} />
                    <InfoRow label="Joined" value={new Date(user.created_at).toLocaleDateString()} icon="calendar-outline" color={colors.text} subColor={colors.subtext} />
                    <InfoRow label="UID" value={user.uid} icon="finger-print-outline" color={colors.text} subColor={colors.subtext} />
                </View>

                <View style={styles.walletSection}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Wallet Overview</Text>
                    <View style={[styles.walletCard, { backgroundColor: colors.card }]}>
                        <View style={styles.balanceContainer}>
                            <View style={styles.balanceItem}>
                                <Text style={[styles.balanceLabel, { color: colors.subtext }]}>Main Balance</Text>
                                <Text style={[styles.balanceValue, { color: colors.text }]}>
                                    {wallet?.currency || 'NGN'} {wallet?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Text>
                            </View>
                            <View style={[styles.verticalSeparator, { backgroundColor: colors.border }]} />
                            <View style={styles.balanceItem}>
                                <Text style={[styles.balanceLabel, { color: colors.subtext }]}>Cashback</Text>
                                <Text style={[styles.balanceValue, { color: colors.primary }]}>
                                    {wallet?.currency || 'NGN'} {wallet?.cashbackBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.cardsSection}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Saved Cards</Text>
                    <View style={[styles.cardsContainer, { backgroundColor: colors.card }]}>
                        {cards.length > 0 ? (
                            cards.map((card, index) => (
                                <View key={card.id}>
                                    <View style={styles.cardItem}>
                                        <View style={styles.cardInfo}>
                                            <View style={[styles.cardIconWrap, { backgroundColor: colors.primary + '10' }]}>
                                                <Ionicons
                                                    name={card.brand?.toLowerCase().includes('visa') ? 'book' : 'card-outline'}
                                                    size={20}
                                                    color={colors.primary}
                                                />
                                            </View>
                                            <View>
                                                <Text style={[styles.cardTitle, { color: colors.text }]}>
                                                    {card.brand.toUpperCase()} •••• {card.last4}
                                                </Text>
                                                <Text style={[styles.cardExpiry, { color: colors.subtext }]}>
                                                    Expires {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear}
                                                </Text>
                                            </View>
                                        </View>
                                        {card.isDefault && (
                                            <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '20' }]}>
                                                <Text style={[styles.defaultBadgeText, { color: colors.primary }]}>DEFAULT</Text>
                                            </View>
                                        )}
                                    </View>
                                    {index < cards.length - 1 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyCards}>
                                <Ionicons name="card-outline" size={32} color={colors.subtext + '50'} />
                                <Text style={[styles.emptyCardsText, { color: colors.subtext }]}>No saved cards found</Text>
                            </View>
                        )}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

function InfoRow({ label, value, icon, color, subColor }: { label: string, value: string, icon: any, color: string, subColor: string }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
                <Ionicons name={icon} size={20} color={subColor} style={{ marginRight: 12 }} />
                <Text style={[styles.infoLabel, { color: subColor }]}>{label}</Text>
            </View>
            <Text style={[styles.infoValue, { color: color }]}>{value}</Text>
        </View>
    );
}

function LinkRow({ title, icon, onPress, colors }: { title: string, icon: any, onPress: () => void, colors: any }) {
    return (
        <TouchableOpacity style={styles.linkRow} onPress={onPress}>
            <View style={styles.linkRowLeft}>
                <View style={[styles.linkIconWrap, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={icon} size={20} color={colors.primary} />
                </View>
                <Text style={[styles.linkTitle, { color: colors.text }]}>{title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
        </TouchableOpacity>
    );
}

const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'active': return '#10B981';
        case 'suspended': return '#EF4444';
        case 'inactive': return '#F59E0B';
        default: return '#6B7280';
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        gap: 20,
    },
    card: {
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '700',
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
    },
    email: {
        fontSize: 16,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    section: {
        padding: 16,
        borderRadius: 20,
        gap: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    linksSection: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    linksContainer: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    linkRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    linkIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    linkTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 64,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    walletSection: {
        marginTop: 4,
    },
    walletCard: {
        borderRadius: 20,
        padding: 20,
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceItem: {
        flex: 1,
        gap: 4,
    },
    balanceLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    balanceValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    verticalSeparator: {
        width: 1,
        height: 30,
        marginHorizontal: 20,
    },
    cardsSection: {
        marginTop: 4,
    },
    cardsContainer: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    cardExpiry: {
        fontSize: 12,
    },
    defaultBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    defaultBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    emptyCards: {
        padding: 32,
        alignItems: 'center',
        gap: 8,
    },
    emptyCardsText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
