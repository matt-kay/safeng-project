import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';

export default function ContactScreen() {
    const router = useRouter();
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const isDark = resolvedTheme === 'dark';

    const openLink = (url: string) => {
        triggerHaptic();
        Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => { triggerHaptic(); router.back(); }} style={styles.backButton}>
                    <Ionicons name="close" size={24} color={colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Us</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.buttonBackground }]}>
                        <Ionicons name="mail" size={40} color={colors.primary} />
                    </View>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>Get In Touch</Text>
                    <Text style={[styles.heroSubtitle, { color: colors.subtext }]}>
                        Our dedicated support team is available around the clock to help you resolve any issues quickly and efficiently.
                    </Text>
                </View>

                <View style={styles.listSection}>
                    <ContactRow
                        icon="call"
                        title="Phone (US)"
                        detail="+1 (351) 218-3397"
                        onPress={() => openLink('tel:+13512183397')}
                        colors={colors}
                    />
                    <ContactRow
                        icon="call"
                        title="Phone (US Secondary)"
                        detail="+1 (781) 888-5782"
                        onPress={() => openLink('tel:+17818885782')}
                        colors={colors}
                    />
                    <ContactRow
                        icon="mail"
                        title="Email"
                        detail="hello@safeme.com"
                        onPress={() => openLink('mailto:hello@safeme.com')}
                        colors={colors}
                    />
                    <ContactRow
                        icon="location"
                        title="Address (US)"
                        detail="160, Alewife Brook Pkwy #1192, Cambridge, MA 02138"
                        onPress={() => openLink('http://maps.apple.com/?q=160,Alewife+Brook+Pkwy+1192,Cambridge,MA+02138')}
                        colors={colors}
                    />
                    <ContactRow
                        icon="location"
                        title="Address (Nigeria)"
                        detail="Plot 607 Toyin Omotosho Cresent, Omole Phase 2, Ikeja, Lagos"
                        onPress={() => openLink('http://maps.apple.com/?q=Plot+607+Toyin+Omotosho+Cresent,Omole+Phase+2,Ikeja,Lagos')}
                        colors={colors}
                    />
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function ContactRow({ icon, title, detail, onPress, colors }: { icon: keyof typeof Ionicons.glyphMap, title: string, detail: string, onPress: () => void, colors: any }) {
    return (
        <TouchableOpacity style={[styles.contactRow, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.rowIconContainer, { backgroundColor: colors.buttonBackground }]}>
                <Ionicons name={icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.subtext }]}>{title}</Text>
                <Text style={[styles.rowDetail, { color: colors.text }]}>{detail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 56,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    content: {
        paddingVertical: 32,
    },
    heroSection: {
        alignItems: 'center',
        paddingHorizontal: 40,
        marginBottom: 32,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    listSection: {
        paddingHorizontal: 20,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    rowIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 13,
        marginBottom: 2,
    },
    rowDetail: {
        fontSize: 16,
        fontWeight: '500',
    },
});
