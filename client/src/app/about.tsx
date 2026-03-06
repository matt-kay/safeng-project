import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';

export default function AboutScreen() {
    const router = useRouter();
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const isDark = resolvedTheme === 'dark';
    const versionString = "Version 1.0.0 (Build 1)";

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => { triggerHaptic(); router.back(); }} style={styles.backButton}>
                    <Ionicons name="close" size={24} color={colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>About App</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.brandingSection}>
                    <Ionicons name="flash" size={60} color={colors.primary} style={styles.brandIcon} />
                    <Text style={[styles.appName, { color: colors.text }]}>BriskVTU</Text>
                    <Text style={[styles.tagline, { color: colors.subtext }]}>Maximize your Virtual Top-ups</Text>
                    <Text style={[styles.version, { color: colors.subtext }]}>{versionString}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>We Are Outspoken About Our Success and Position.</Text>
                    <Text style={[styles.sectionText, { color: colors.subtext }]}>
                        Seamless Transactions, Exceptional Benefits, and Unmatched Convenience—All in One App!{"\n\n"}
                        Our app is designed to make your life easier with seamless transactions, unbeatable convenience, and rewards at every step. Whether it’s airtime, data, utility bills, our app has got you covered with top-notch features and support.
                    </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Our Core Services</Text>
                    <ServiceRow
                        title="Airtime & Data Top-Up"
                        description="Stay connected with seamless airtime and data purchases. Whether it’s for MTN, Glo, Airtel, or 9mobile, BriskVTU ensures quick, secure, and affordable top-ups at competitive rates."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Electricity Token Purchase"
                        description="Buying electricity tokens has never been easier. Whether your family or business uses a prepaid or postpaid meter, BriskVTU makes it simple to keep the lights on."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Cashback and Rewards"
                        description="Enjoy cashback and rewards on every top-up and bill payment, adding value to your transactions."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Cable TV Subscriptions"
                        description="Renew your DSTV, GOTV, or Startimes subscriptions instantly. With BriskVTU, you don’t have to worry about missing your favorite TV shows, sports, or news updates."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Expense Management"
                        description="Keep an eye on your spending with detailed transaction history and analytics."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="24/7 Support"
                        description="Get assistance anytime, anywhere with our dedicated support team available around the clock to help you resolve any issues quickly and efficiently."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Special Features</Text>
                    <ServiceRow
                        title="Coupons"
                        description="Create and distribute utility coupons to multiple people at once. Perfect for birthdays, anniversaries, or simply helping out family and friends."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Gifting"
                        description="BriskVTU Gifting Feature allows users to send airtime, data, or services via gift codes. It ensures flexibility, control, and secure gifting within the app."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Referral Program"
                        description="BriskVTU rewards users for spreading the word! You get 5% cashback on their transactions for the first month, and they receive 5% cashback as a welcome bonus!"
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function ServiceRow({ title, description, textColor, subTextColor }: { title: string, description: string, textColor: string, subTextColor: string }) {
    return (
        <View style={styles.serviceRow}>
            <Text style={[styles.serviceTitle, { color: textColor }]}>{title}</Text>
            <Text style={[styles.serviceDescription, { color: subTextColor }]}>{description}</Text>
        </View>
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
        paddingHorizontal: 20,
    },
    brandingSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    brandIcon: {
        marginBottom: 12,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    tagline: {
        fontSize: 17,
        marginTop: 4,
    },
    version: {
        fontSize: 12,
        marginTop: 8,
    },
    section: {
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    sectionText: {
        fontSize: 15,
        lineHeight: 22,
    },
    divider: {
        height: 1,
        marginVertical: 8,
    },
    serviceRow: {
        marginBottom: 16,
    },
    serviceTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    serviceDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
});
