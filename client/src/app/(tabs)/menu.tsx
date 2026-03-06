import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, Image, Alert, Switch, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useConfirmation } from '@/context/ConfirmationContext';
import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';

export default function MenuScreen() {
    const { user, profile, signOut } = useAuth();
    const { theme, setTheme, hapticEnabled, setHapticEnabled, triggerHaptic, resolvedTheme, colors } = useSettings();
    const { confirm } = useConfirmation();
    const router = useRouter();

    const isDark = resolvedTheme === 'dark';

    const handleThemeChange = (value: boolean) => {
        triggerHaptic();
        setTheme(value ? 'dark' : 'light');
    };

    const handleHapticChange = (value: boolean) => {
        if (value) triggerHaptic(); // Trigger only when enabling
        setHapticEnabled(value);
    };

    const handleLogout = () => {
        confirm({
            title: "Logout",
            message: "Are you sure you want to log out?",
            confirmText: "Logout",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await signOut();
                } catch (error) {
                    console.error('Logout failed:', error);
                    Alert.alert("Error", "Failed to log out. Please try again.");
                }
            }
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>Menu</Text>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
                    <View style={styles.profileHeader}>
                        <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#2C2C2E' : colors.buttonBackground }]}>
                            <Image
                                source={{ uri: `https://api.dicebear.com/7.x/avataaars-neutral/png?seed=${user?.uid || 'default'}` }}
                                style={styles.avatarImage}
                            />
                        </View>
                        <View style={styles.nameContainer}>
                            <Text style={[styles.userName, { color: colors.text }]}>
                                {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'Guest User'}
                            </Text>
                            {profile?.role === 'admin' && (
                                <View style={[styles.adminBadge, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.adminBadgeText, { color: colors.primary }]}>ADMIN</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.userPhone, { color: colors.subtext }]}>{user?.phoneNumber || 'No phone number'}</Text>
                        <Text style={[styles.userEmail, { color: colors.subtext }]}>{profile?.email || 'No email set'}</Text>
                    </View>
                </View>

                <View style={styles.profileSection}>
                    <Text style={styles.profileTitle}>Account</Text>
                    <TouchableOpacity
                        style={[styles.profileItem, { backgroundColor: colors.card }]}
                        onPress={() => { triggerHaptic(); router.push('/update-profile'); }}
                    >
                        <Ionicons name="person-outline" size={20} color={colors.icon} style={styles.profileIcon} />
                        <Text style={[styles.profileLabel, { color: colors.text }]}>Update Profile</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.profileItem, { backgroundColor: colors.card }]}
                        onPress={() => { triggerHaptic(); router.push('/change-phone'); }}
                    >
                        <Ionicons name="phone-portrait-outline" size={20} color={colors.icon} style={styles.profileIcon} />
                        <Text style={[styles.profileLabel, { color: colors.text }]}>Change Phone Number</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.profileItem, { backgroundColor: colors.card }]}
                        onPress={() => { triggerHaptic(); router.push('/sos-management'); }}
                    >
                        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={styles.profileIcon} />
                        <Text style={[styles.profileLabel, { color: colors.text }]}>Manage SOS Subscription</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
                    </TouchableOpacity>

                </View>

                <View style={styles.profileSection}>
                    <Text style={styles.profileTitle}>Settings</Text>
                    <View style={[styles.profileItem, { backgroundColor: colors.card }]}>
                        <Ionicons name="moon-outline" size={20} color={colors.icon} style={styles.profileIcon} />
                        <Text style={[styles.profileLabel, { color: colors.text }]}>Dark Mode</Text>
                        <Switch
                            value={theme === 'dark'}
                            onValueChange={handleThemeChange}
                            trackColor={{ false: '#D1D1D6', true: colors.primary }}
                        />
                    </View>
                    <View style={[styles.profileItem, { backgroundColor: colors.card }]}>
                        <Ionicons name="pulse-outline" size={20} color={colors.icon} style={styles.profileIcon} />
                        <Text style={[styles.profileLabel, { color: colors.text }]}>Haptic Feedback</Text>
                        <Switch
                            value={hapticEnabled}
                            onValueChange={handleHapticChange}
                            trackColor={{ false: '#D1D1D6', true: colors.primary }}
                        />
                    </View>
                </View>

                {profile?.role === 'admin' && (
                    <View style={styles.profileSection}>
                        <Text style={styles.profileTitle}>Administrative</Text>
                        <TouchableOpacity
                            style={[styles.profileItem, { backgroundColor: colors.card }]}
                            onPress={() => { triggerHaptic(); router.push('/admin'); }}
                        >
                            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={styles.profileIcon} />
                            <Text style={[styles.profileLabel, { color: colors.text }]}>Admin Menu</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.profileSection}>
                    <Text style={styles.profileTitle}>Support</Text>
                    <TouchableOpacity
                        style={[styles.profileItem, { backgroundColor: colors.card }]}
                        onPress={() => { triggerHaptic(); router.push('/about'); }}
                    >
                        <Ionicons name="information-circle-outline" size={20} color={colors.icon} style={styles.profileIcon} />
                        <Text style={[styles.profileLabel, { color: colors.text }]}>About App</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.profileItem, { backgroundColor: colors.card }]}
                        onPress={() => { triggerHaptic(); router.push('/contact'); }}
                    >
                        <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.profileIcon} />
                        <Text style={[styles.profileLabel, { color: colors.text }]}>Contact Us</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: isDark ? '#FF3B3030' : '#FF3B3015' }]}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={20} color={colors.error} style={styles.logoutIcon} />
                    <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
                </TouchableOpacity>

                <Text style={[styles.versionText, { color: colors.subtext }]}>Version 1.0.0</Text>
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
        paddingBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
    },
    profileCard: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
    },
    profileHeader: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 149, 0, 0.2)',
    },
    avatarImage: {
        width: 100,
        height: 100,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
        textAlign: 'center',
    },
    userPhone: {
        fontSize: 16,
        marginBottom: 2,
        textAlign: 'center',
    },
    userEmail: {
        fontSize: 16,
        textAlign: 'center',
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    adminBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    adminBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    profileSection: {
        marginBottom: 32,
    },
    profileTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
    },
    profileIcon: {
        marginRight: 16,
    },
    profileLabel: {
        flex: 1,
        fontSize: 17,
        fontWeight: '500',
    },

    logoutButton: {
        height: 60,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    logoutIcon: {
        marginRight: 8,
    },
    logoutText: {
        fontSize: 17,
        fontWeight: '600',
    },
    versionText: {
        textAlign: 'center',
        fontSize: 14,
        marginBottom: 40,
    },
});
