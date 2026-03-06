import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';

export default function AdminScreen() {
    const { colors, triggerHaptic } = useSettings();
    const router = useRouter();

    const menuItems = [
        { id: 'users', label: 'Manage Users', icon: 'people-outline' as const },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <TouchableOpacity
                    onPress={() => { triggerHaptic(); router.back(); }}
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Admin Menu</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dashboard</Text>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.menuItem, { backgroundColor: colors.card }]}
                            onPress={() => {
                                triggerHaptic();
                                if (item.id === 'users') {
                                    router.push('/admin/users');
                                }
                            }}
                        >
                            <Ionicons name={item.icon} size={20} color={colors.icon} style={styles.menuIcon} />
                            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
                        </TouchableOpacity>
                    ))}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
    },
    menuIcon: {
        marginRight: 16,
    },
    menuLabel: {
        flex: 1,
        fontSize: 17,
        fontWeight: '500',
    },
});
