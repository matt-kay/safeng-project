import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Platform,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { ReportType } from '@/services/sdk/report-service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    initialFilters: FilterState;
}

export interface FilterState {
    type?: ReportType;
    radiusKm?: number;
    location?: string;
}

const REPORT_TYPES = [
    { label: 'All Types', value: undefined },
    { label: 'Unsafe Driving', value: ReportType.UNSAFE_DRIVING },
    { label: 'Driver Misconduct', value: ReportType.DRIVER_MISCONDUCT },
    { label: 'Overcharging', value: ReportType.OVERCHARGING },
    { label: 'Route Deviation', value: ReportType.ROUTE_DEVIATION },
    { label: 'Vehicle Issue', value: ReportType.VEHICLE_ISSUE },
    { label: 'Harassment', value: ReportType.HARASSMENT },
    { label: 'Theft/Robbery', value: ReportType.THEFT_ROBBERY },
    { label: 'Other', value: ReportType.OTHER },
];

const RADIUS_OPTIONS = [
    { label: '1 km', value: 1 },
    { label: '5 km', value: 5 },
    { label: '10 km', value: 10 },
    { label: '25 km', value: 25 },
    { label: '50 km', value: 50 },
    { label: 'Anywhere', value: undefined },
];

export const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, onApply, initialFilters }) => {
    const { colors, triggerHaptic } = useSettings();
    const [filters, setFilters] = useState<FilterState>(initialFilters);

    const handleApply = () => {
        triggerHaptic();
        onApply(filters);
        onClose();
    };

    const handleReset = () => {
        triggerHaptic();
        setFilters({});
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.background} onPress={onClose} activeOpacity={1} />
                <View style={[styles.content, { backgroundColor: colors.card }]}>
                    <SafeAreaView>
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.text }]}>Filters</Text>
                            <TouchableOpacity onPress={handleReset}>
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>Reset</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Report Type</Text>
                            <View style={styles.chipContainer}>
                                {REPORT_TYPES.map((item) => (
                                    <TouchableOpacity
                                        key={item.label}
                                        style={[
                                            styles.chip,
                                            { borderColor: colors.border },
                                            filters.type === item.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setFilters({ ...filters, type: item.value })}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            { color: colors.text },
                                            filters.type === item.value && { color: '#FFF' }
                                        ]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Radius (within km)</Text>
                            <View style={styles.chipContainer}>
                                {RADIUS_OPTIONS.map((item) => (
                                    <TouchableOpacity
                                        key={item.label}
                                        style={[
                                            styles.chip,
                                            { borderColor: colors.border },
                                            filters.radiusKm === item.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setFilters({ ...filters, radiusKm: item.value })}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            { color: colors.text },
                                            filters.radiusKm === item.value && { color: '#FFF' }
                                        ]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={{ height: 100 }} />
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.applyButton, { backgroundColor: colors.primary }]}
                                onPress={handleApply}
                            >
                                <Text style={styles.applyButtonText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        paddingTop: 24,
        maxHeight: SCREEN_HEIGHT * 0.8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    scroll: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        paddingBottom: Platform.OS === 'ios' ? 20 : 40,
    },
    applyButton: {
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
