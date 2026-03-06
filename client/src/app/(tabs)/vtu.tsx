import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { StatusBar } from 'expo-status-bar';

const BILL_CATEGORIES = [
    {
        title: 'Airtime Recharge',
        iconName: 'cellphone' as const,
        component: MaterialCommunityIcons,
        color: '#FF3B30',
        route: '/vtu/airtime' as const
    },
    {
        title: 'Data Services',
        iconName: 'signal-cellular-4-bar' as const,
        component: MaterialIcons,
        color: '#007AFF',
        route: '/vtu/data' as const
    },
    {
        title: 'Electricity Bill',
        iconName: 'lightbulb' as const,
        component: MaterialCommunityIcons,
        color: '#FFCC00',
        route: '/vtu/electricity-bill' as const
    },
    {
        title: 'TV Subscription',
        iconName: 'television' as const,
        component: MaterialCommunityIcons,
        color: '#5856D6',
        route: '/vtu/tv-subscription' as const
    },
];

export default function VTUScreen() {
    const router = useRouter();
    const { colors, resolvedTheme, triggerHaptic } = useSettings();

    const isDark = resolvedTheme === 'dark';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>VTU Services</Text>
                <Text style={[styles.subtitle, { color: colors.subtext }]}>Fast and secure payments</Text>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.grid}>
                    {BILL_CATEGORIES.map((cat, index) => {
                        const IconComponent = cat.component as any;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.categoryItem, { backgroundColor: colors.card }]}
                                onPress={() => { triggerHaptic(); router.push(cat.route); }}
                            >
                                <View style={[styles.iconWrapper, { backgroundColor: cat.color + '15' }]}>
                                    <IconComponent name={cat.iconName} size={30} color={cat.color} />
                                </View>
                                <Text style={[styles.categoryTitle, { color: colors.text }]}>{cat.title}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.section}>
                    <TouchableOpacity
                        style={[styles.linkItem, { backgroundColor: colors.card }]}
                        onPress={() => { triggerHaptic(); router.push('/beneficiaries'); }}
                    >
                        <Ionicons name="people-outline" size={20} color={colors.icon} style={styles.linkIcon} />
                        <Text style={[styles.linkLabel, { color: colors.text }]}>Beneficiaries</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
    },
    content: {
        padding: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    categoryItem: {
        width: '47%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 24,
    },
    linkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
    },
    linkIcon: {
        marginRight: 16,
    },
    linkLabel: {
        flex: 1,
        fontSize: 17,
        fontWeight: '500',
    },
});
