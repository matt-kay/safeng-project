import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WalletService, Transaction } from '@/services/sdk/wallet-service';
import { formatCurrency } from '@/utils/format';
import { ActivityIndicator } from 'react-native';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const { colors, resolvedTheme, triggerHaptic } = useSettings();
  const router = useRouter();

  const isDark = resolvedTheme === 'dark';

  const handleActionPress = (path: string) => {
    triggerHaptic();
    router.push(path as any);
  };

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchRecentTransactions = async () => {
      try {
        const data = await WalletService.getTransactions(1, 5);
        setTransactions(data);
      } catch (error) {
        console.error('Failed to fetch recent transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTransactions();
  }, [user]);

  const renderTransactionItem = (item: Transaction) => {
    const isCredit = item.direction === 'CREDIT';
    const statusColor = item.status === 'success' ? '#34C759' : item.status === 'failed' ? '#FF3B30' : '#FF9500';

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.transactionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          triggerHaptic();
          router.push({
            pathname: '/transaction-details',
            params: { id: item.id, data: JSON.stringify(item) }
          });
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: isCredit ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)' }]}>
          <Ionicons
            name={isCredit ? "arrow-down" : "arrow-up"}
            size={18}
            color={isCredit ? '#34C759' : '#FF9500'}
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={[styles.transactionDescription, { color: colors.text }]} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={[styles.transactionDate, { color: colors.subtext }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.transactionAmountContainer}>
          <Text style={[styles.transactionAmount, { color: isCredit ? '#34C759' : colors.text }]}>
            {formatCurrency(item.amount, 'NGN', { showSign: true, direction: item.direction })}
          </Text>
          <Text style={[styles.transactionStatus, { color: statusColor }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.subtext }]}>Hello,</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{profile?.firstName || 'User'} 👋</Text>
        </View>
        <TouchableOpacity
          style={[styles.notifButton, { backgroundColor: colors.buttonBackground }]}
          onPress={() => triggerHaptic()}
        >
          <Ionicons name="notifications" size={24} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => handleActionPress('/coupons')}>
          <LinearGradient
            colors={['#5856D6', '#8E5FF7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}
          >
            <View style={styles.promoLabel}>
              <Text style={styles.promoLabelText}>NEW FEATURE</Text>
            </View>
            <Text style={styles.promoTitle}>Create & Share Coupons! <Ionicons name="gift" size={22} color="#FFFFFF" /></Text>
            <Text style={styles.promoSubtitle}>Generate custom discount coupons for your customers and friends.</Text>
            <View style={styles.promoAction}>
              <Text style={[styles.promoActionText, { color: '#5856D6' }]}>Create Now <Ionicons name="arrow-forward" size={14} color="#5856D6" /></Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            <TouchableOpacity onPress={() => handleActionPress('/(tabs)/vtu')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionsGrid}>
            <ActionItem
              title="Airtime Recharge"
              icon={<MaterialCommunityIcons name="cellphone" size={28} color={colors.error} />}
              color={colors.error}
              onPress={() => handleActionPress('/vtu/airtime')}
              isDark={isDark}
              textColor={colors.text}
            />
            <ActionItem
              title="Data Services"
              icon={<MaterialIcons name="signal-cellular-4-bar" size={28} color="#007AFF" />}
              color="#007AFF"
              onPress={() => handleActionPress('/vtu/data')}
              isDark={isDark}
              textColor={colors.text}
            />
            <ActionItem
              title="Electricity Bill"
              icon={<MaterialCommunityIcons name="lightbulb" size={28} color={colors.warning} />}
              color={colors.warning}
              onPress={() => handleActionPress('/vtu/electricity-bill')}
              isDark={isDark}
              textColor={colors.text}
            />
            <ActionItem
              title="TV Subscription"
              icon={<MaterialCommunityIcons name="television" size={28} color={colors.secondary} />}
              color={colors.secondary}
              onPress={() => handleActionPress('/vtu/tv-subscription')}
              isDark={isDark}
              textColor={colors.text}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent transactions</Text>
            <TouchableOpacity onPress={() => handleActionPress('/transactions')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : transactions.length === 0 ? (
            <View style={[styles.emptyActivity, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#2C2C2E' : colors.background }]}>
                <Ionicons name="folder-open" size={32} color={colors.subtext} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>Your transactions will appear here once you start using the app.</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map(renderTransactionItem)}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionItem({ title, icon, color, onPress, isDark, textColor }: { title: string, icon: React.ReactNode, color: string, onPress: () => void, isDark: boolean, textColor: string }) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={[styles.actionIconWrapper, { backgroundColor: color + '15', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        {icon}
      </View>
      <Text style={[styles.actionTitle, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  notifButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingTop: 0,
  },
  promoCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  promoLabel: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  promoLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  promoSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
    marginBottom: 20,
  },
  promoAction: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  promoActionText: {
    color: '#FF9500',
    fontWeight: 'bold',
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAll: {
    fontWeight: '600',
    fontSize: 14,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '22%',
    alignItems: 'center',
  },
  actionIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyActivity: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
