import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StatusBar as RNStatusBar
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReportService, ReportListItem } from '@/services/sdk/report-service';
import { ReportCard } from '@/components/reports/ReportCard';
import { FilterModal, FilterState } from '@/components/reports/FilterModal';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { colors, resolvedTheme, triggerHaptic } = useSettings();
  const isDark = resolvedTheme === 'dark';
  const router = useRouter();

  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});

  const fetchReports = useCallback(async (pageNum: number, isRefresh = false, currentFilters = filters) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const response = await ReportService.listReports({
        page: pageNum,
        limit: 10,
        status: 'APPROVED',
        type: currentFilters.type,
        radiusKm: currentFilters.radiusKm,
        // lat/lng could be added here if location is available
      });

      if (isRefresh || pageNum === 1) {
        setReports(response.reports);
      } else {
        setReports(prev => [...prev, ...response.reports]);
      }

      setHasMore(response.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports(1);
  }, [fetchReports]);

  const handleRefresh = () => {
    fetchReports(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchReports(page + 1);
    }
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    fetchReports(1, false, newFilters);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.subtext }]}>Hello,</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{profile?.firstName || 'User'} 👋</Text>
        </View>
        <TouchableOpacity style={[styles.profileButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.subtext} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search reports..."
            placeholderTextColor={colors.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.primary }]}
          onPress={() => { triggerHaptic(); setShowFilter(true); }}
        >
          <Ionicons name="filter" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* <Text style={[styles.sectionTitle, { color: colors.text }]}>Approved Reports</Text> */}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <FlatList
        data={reports}
        renderItem={({ item }) => (
          <ReportCard
            report={item}
            showActions={false}
            onPress={() => router.push({ pathname: '/report-details', params: { id: item.id, fromHome: 'true' } })}
          />
        )}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListFooterComponent={() => (
          loadingMore ? <ActivityIndicator style={{ padding: 20 }} color={colors.primary} /> : null
        )}
        ListEmptyComponent={() => (
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No reports found</Text>
            </View>
          ) : null
        )}
      />

      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    height: 56,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
});
