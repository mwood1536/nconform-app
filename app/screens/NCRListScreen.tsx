import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdBanner } from '../components/AdBanner';
import { NCRCard } from '../components/NCRCard';
import { NetworkStatusIcon } from '../components/NetworkStatusIcon';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useNCRs } from '../hooks/useNCRs';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { NCR } from '../types';
import { isOverdue, ncrSearchMatches } from '../utils/ncrHelpers';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'NCRs'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Filter = 'All' | 'Open' | 'In Progress' | 'Closed' | 'Overdue';
const FILTERS: Filter[] = ['All', 'Open', 'In Progress', 'Closed', 'Overdue'];

export function NCRListScreen({ navigation }: Props) {
  const { ncrs, reload, loading } = useNCRs();
  const { profile } = useProfile();
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const filtered = useMemo(() => {
    return ncrs.filter((n) => {
      if (filter === 'Overdue' && !isOverdue(n)) return false;
      if (filter !== 'All' && filter !== 'Overdue' && n.status !== filter) return false;
      if (!ncrSearchMatches(n, query)) return false;
      return true;
    });
  }, [ncrs, filter, query]);

  const isFreeTier = (profile?.subscriptionTier ?? 'free') === 'free';

  const renderItem = useCallback(
    ({ item }: { item: NCR }) => (
      <View style={styles.cardSpacer}>
        <NCRCard
          ncr={item}
          onPress={() => navigation.navigate('NCRDetail', { ncrId: item.id })}
        />
      </View>
    ),
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Nonconformances</Text>
        <View style={styles.headerRight}>
          <NetworkStatusIcon />
          <Text style={styles.count}>{filtered.length}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.secondaryText} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by number, title, or owner"
          placeholderTextColor={Colors.secondaryText}
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={Colors.secondaryText} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.pillsRow}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={({ pressed }) => [
                styles.pill,
                active && styles.pillActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>

      <AdBanner visible={isFreeTier} onUpgrade={() => navigation.navigate('Settings')} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="clipboard-outline" size={32} color={Colors.steelBlue} />
            </View>
            <Text style={styles.emptyTitle}>
              {loading
                ? 'Loading…'
                : query || filter !== 'All'
                  ? 'No matching NCRs'
                  : 'No NCRs logged yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {loading
                ? 'Please wait a moment.'
                : query || filter !== 'All'
                  ? 'Try clearing your filter or search.'
                  : 'Tap + to get started.'}
            </Text>
          </View>
        }
      />

      <Pressable
        onPress={() => navigation.navigate('LogNCR')}
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
        accessibilityLabel="Log new NCR"
      >
        <Ionicons name="add" size={28} color={Colors.card} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondaryText,
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchWrap: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.bodyText,
    fontSize: 14,
  },
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  pillLabel: {
    color: Colors.bodyText,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pillLabelActive: {
    color: Colors.card,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 96,
    flexGrow: 1,
  },
  cardSpacer: {
    marginBottom: Spacing.md,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.steelBlue + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.pressed,
  },
});
