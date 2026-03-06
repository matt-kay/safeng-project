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
                    <Ionicons name="shield-checkmark" size={60} color={colors.primary} style={styles.brandIcon} />
                    <Text style={[styles.appName, { color: colors.text }]}>SafeMe</Text>
                    <Text style={[styles.tagline, { color: colors.subtext }]}>Crowdsourced + Predictive Safety Intelligence</Text>
                    <Text style={[styles.version, { color: colors.subtext }]}>{versionString}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Ultimate Safety Companion.</Text>
                    <Text style={[styles.sectionText, { color: colors.subtext }]}>
                        SafeMe is a revolutionary crowdsourced + predictive safety intelligence platform designed to keep you and your community informed and secure.{"\n\n"}
                        Our platform leverages real-time data from users like you combined with advanced predictive analytics to provide actionable safety insights. Whether it's identifying high-risk areas, reporting incidents, or receiving early warnings, SafeMe empowers you with the knowledge to stay safe.
                    </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Core Features</Text>
                    <ServiceRow
                        title="Crowdsourced Reporting"
                        description="Report and view safety incidents in real-time. Your contributions help build a safer environment for everyone by providing up-to-the-minute information on local safety conditions."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Predictive Analytics"
                        description="Stay one step ahead with our predictive models that analyze historical and real-time data to forecast potential safety risks in your area."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Safety Intelligence"
                        description="Access detailed safety insights and heatmaps to understand the security landscape of any location, helping you make informed decisions about your travel and activities."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Community Alerts"
                        description="Receive instant notifications about safety concerns near you. SafeMe ensures you're never caught off guard by providing timely alerts based on verified reports."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Emergency Assistance"
                        description="Quickly access emergency services and share your live location with trusted contacts when you need help the most."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="24/7 Monitoring"
                        description="Our platform works around the clock to process safety data, ensuring that you always have access to the latest security intelligence."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Community Empowerment</Text>
                    <ServiceRow
                        title="Safety Scores"
                        description="Check the safety score of neighborhoods and venues before you visit. We aggregate user feedback and incident data to give you a clear picture of local safety."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Trusted Circles"
                        description="Create private groups with family and friends to share safety status and location updates in a secure, controlled environment."
                        textColor={colors.text}
                        subTextColor={colors.subtext}
                    />
                    <ServiceRow
                        title="Impact Rewards"
                        description="SafeMe rewards active contributors who help keep the community safe. Earn recognition and benefits for your commitment to collective safety."
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
