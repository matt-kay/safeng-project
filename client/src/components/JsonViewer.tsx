import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface JsonViewerProps {
    data: any;
}

export default function JsonViewer({ data }: JsonViewerProps) {
    if (!data || typeof data !== 'object') return null;

    const { resolvedTheme } = useSettings();
    const isDark = resolvedTheme === 'dark';

    return (
        <View style={[styles.rootContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
            {Object.keys(data).map((key) => (
                <JsonNode key={key} nodeKey={key} value={data[key]} level={0} />
            ))}
        </View>
    );
}

interface JsonNodeProps {
    nodeKey: string;
    value: any;
    level: number;
}

function JsonNode({ nodeKey, value, level }: JsonNodeProps) {
    const { colors, resolvedTheme } = useSettings();
    const isDark = resolvedTheme === 'dark';

    // Auto expand the first level by default
    const [isExpanded, setIsExpanded] = useState(level < 1);

    const formatKey = (k: string) => {
        // If it's literally a number string, don't format it as sentence case
        if (!isNaN(Number(k))) return k;
        const noUnderscore = k.replace(/_/g, ' ');
        return noUnderscore.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    };

    const isObject = value !== null && typeof value === 'object';
    const isArray = Array.isArray(value);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    // Rendering primitive value (string, number, boolean)
    if (!isObject) {
        return (
            <View style={styles.primitiveRow}>
                <View style={[styles.bullet, { backgroundColor: colors.border }]} />
                <Text style={[styles.keyText, { color: colors.subtext }]}>{formatKey(nodeKey)}: </Text>
                <Text style={[styles.valueText, { color: colors.text }]}>
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                </Text>
            </View>
        );
    }

    // Filter out null/undefined/empty string items
    const keys = Object.keys(value).filter(k => value[k] !== null && value[k] !== undefined && value[k] !== '');
    if (keys.length === 0) return null; // Hide completely empty objects

    return (
        <View style={styles.nodeWrapper}>
            <TouchableOpacity
                activeOpacity={0.6}
                onPress={toggleExpand}
                style={styles.objectRow}
            >
                <Ionicons
                    name={isExpanded ? (isArray ? "list" : "folder-open") : (isArray ? "list-outline" : "folder")}
                    size={16}
                    color={colors.primary}
                    style={styles.icon}
                />
                <Text style={[styles.objectKeyText, { color: colors.text }]}>
                    {formatKey(nodeKey)}
                </Text>
                <Text style={[styles.itemCountText, { color: colors.subtext }]}>
                    {isArray ? `[${keys.length} items]` : `{${keys.length} keys}`}
                </Text>

                <View style={styles.spacer} />

                <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={colors.subtext}
                    style={{ opacity: 0.5 }}
                />
            </TouchableOpacity>

            {isExpanded && (
                <View style={[
                    styles.childrenContainer,
                    { borderLeftColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }
                ]}>
                    {keys.map((k) => (
                        <JsonNode
                            key={k}
                            nodeKey={isArray ? `Item ${Number(k) + 1}` : k}
                            value={value[k]}
                            level={level + 1}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        width: '100%',
        borderRadius: 16,
        padding: 16,
        paddingVertical: 12,
        overflow: 'hidden',
    },
    nodeWrapper: {
        width: '100%',
        marginTop: 2,
    },
    objectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    primitiveRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 6,
    },
    childrenContainer: {
        borderLeftWidth: 1.5,
        marginLeft: 7,
        paddingLeft: 14,
        marginTop: 2,
        marginBottom: 8,
    },
    icon: {
        marginRight: 8,
    },
    bullet: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 8,
        marginRight: 10,
        marginLeft: 6,
    },
    keyText: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 1,
    },
    objectKeyText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    valueText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        flexWrap: 'wrap',
        marginTop: 1,
    },
    itemCountText: {
        fontSize: 12,
        marginLeft: 8,
        fontWeight: '500',
        opacity: 0.6,
        paddingTop: 1,
    },
    spacer: {
        flex: 1,
    }
});
