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
import { RootStackParamList, TabParamList } from '../navigation/types';
import { NCR } from '../types';
import { isOverdue, ncrSearchMatches } from '../utils/ncrHelpers';
import { Alert } from 'react-native';
import { buildNCRSummaryHTML, generateAndSharePDF } from '../utils/reports';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'NCRs'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Filter = 'All' | 'Open' | 'In Progress' | 'Closed' | 'Overdue';
const FILTERS: Filter[] = ['All', 'Open', 'In Progress', 'Closed', 'Overdue'];

export function NCRListScreen({ navigation, route }: Props) {
  const { ncrs, reload, loading, setStatus, deleteNCR, updateNCR } = useNCRs();
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const filterIds = route.params?.filterIds;
  const filterTitle = route.params?.filterTitle;
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const filtered = useMemo(() => {
    return ncrs.filter((n) => {
      if (filterIds && filterIds.length > 0) {
        if (!filterIds.includes(n.id) && !filterIds.includes(n.ncrNumber)) return false;
      }
      if (filter === 'Overdue' && !isOverdue(n)) return false;
      if (filter !== 'All' && filter !== 'Overdue' && n.status !== filter) return false;
      if (!ncrSearchMatches(n, query)) return false;
      return true;
    });
  }, [ncrs, filter, query, filterIds]);

  const clearFilter = () => {
    navigation.setParams({ filterIds: undefined, filterTitle: undefined });
  };

  const toggleOne = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: NCR }) => (
      <View style={styles.cardSpacer}>
        <Pressable
          onPress={() =>
            selectMode
              ? toggleOne(item.id)
              : navigation.navigate('NCRDetail', { ncrId: item.id })
          }
          onLongPress={() => {
            setSelectMode(true);
            toggleOne(item.id);
          }}
          style={({ pressed }) => [pressed && { opacity: 0.95 }]}
        >
          <View style={styles.cardRow}>
            {selectMode ? (
              <View
                style={[
                  styles.selectBox,
                  selected.has(item.id) && styles.selectBoxActive,
                ]}
              >
                {selected.has(item.id) ? (
                  <Ionicons name="checkmark" size={14} color={Colors.card} />
                ) : null}
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <NCRCard
                ncr={item}
                onPress={() =>
                  selectMode
                    ? toggleOne(item.id)
                    : navigation.navigate('NCRDetail', { ncrId: item.id })
                }
              />
            </View>
          </View>
        </Pressable>
      </View>
    ),
    [navigation, selectMode, selected, toggleOne],
  );

  const selectedNCRs = useMemo(
    () => ncrs.filter((n) => selected.has(n.id)),
    [ncrs, selected],
  );

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const bulkClose = () => {
    if (selected.size === 0) return;
    Alert.alert('Close selected?', `Close ${selected.size} NCR(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        onPress: async () => {
          for (const id of selected) await setStatus(id, 'Closed');
          exitSelectMode();
        },
      },
    ]);
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    Alert.alert(
      'Delete selected?',
      `Permanently delete ${selected.size} NCR(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const id of selected) await deleteNCR(id);
            exitSelectMode();
          },
        },
      ],
    );
  };

  const bulkExport = async () => {
    if (selectedNCRs.length === 0) return;
    try {
      const html = buildNCRSummaryHTML(selectedNCRs, { status: 'All', severity: 'All' });
      await generateAndSharePDF(html, 'NCR-Selected.pdf');
    } catch {
      Alert.alert('Could not export', 'Please try again.');
    }
  };

  const bulkChangeSeverity = () => {
    if (selected.size === 0) return;
    Alert.alert('Change severity for selected', '', [
      { text: 'Cancel', style: 'cancel' },
      ...(['Low', 'Medium', 'High', 'Critical'] as const).map((s) => ({
        text: s,
        onPress: async () => {
          for (const id of selected) await updateNCR(id, { severity: s });
          exitSelectMode();
        },
      })),
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Nonconformances</Text>
        <View style={styles.headerRight}>
          <NetworkStatusIcon />
          <Pressable
            onPress={() => navigation.navigate('Search')}
            hitSlop={8}
            accessibilityLabel="Search"
          >
            <Ionicons name="search-outline" size={20} color={Colors.navy} />
          </Pressable>
          <Pressable
            onPress={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            hitSlop={8}
            accessibilityLabel="Toggle select"
          >
            <Text style={[styles.selectToggle, selectMode && styles.selectToggleActive]}>
              {selectMode ? 'Done' : 'Select'}
            </Text>
          </Pressable>
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

      {filterIds && filterIds.length > 0 ? (
        <View style={styles.filterBanner}>
          <Ionicons name="analytics-outline" size={14} color={Colors.amber} />
          <Text style={styles.filterBannerText} numberOfLines={1}>
            Filtered: {filterTitle || `${filterIds.length} item${filterIds.length === 1 ? '' : 's'}`}
          </Text>
          <Pressable onPress={clearFilter} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={Colors.secondaryText} />
          </Pressable>
        </View>
      ) : null}

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

      {selectMode && selected.size > 0 ? (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>{selected.size} selected</Text>
          <View style={styles.bulkActions}>
            <Pressable onPress={bulkClose} style={styles.bulkBtn}>
              <Ionicons name="checkmark-done-outline" size={16} color={Colors.card} />
              <Text style={styles.bulkBtnText}>Close</Text>
            </Pressable>
            <Pressable onPress={bulkChangeSeverity} style={styles.bulkBtn}>
              <Ionicons name="alert-outline" size={16} color={Colors.card} />
              <Text style={styles.bulkBtnText}>Severity</Text>
            </Pressable>
            <Pressable onPress={bulkExport} style={styles.bulkBtn}>
              <Ionicons name="document-outline" size={16} color={Colors.card} />
              <Text style={styles.bulkBtnText}>Export</Text>
            </Pressable>
            <Pressable onPress={bulkDelete} style={[styles.bulkBtn, styles.bulkDanger]}>
              <Ionicons name="trash-outline" size={16} color={Colors.card} />
              <Text style={styles.bulkBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <AdBanner />

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
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.button,
    backgroundColor: Colors.amber + '14',
  },
  filterBannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.bodyText,
    fontWeight: '600',
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
  selectToggle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.steelBlue,
  },
  selectToggleActive: {
    color: Colors.amber,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    marginLeft: 2,
  },
  selectBoxActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  bulkBar: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  bulkCount: {
    color: Colors.card,
    fontSize: 13,
    fontWeight: '700',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Colors.steelBlue,
    borderRadius: Radii.button,
  },
  bulkDanger: {
    backgroundColor: Colors.errorRed,
  },
  bulkBtnText: {
    color: Colors.card,
    fontSize: 11,
    fontWeight: '700',
  },
});
