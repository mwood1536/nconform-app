import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useNCRs } from '../hooks/useNCRs';
import { RootStackParamList } from '../navigation/types';
import { Action, NCR } from '../types';
import { formatDate } from '../utils/ncrHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'Actions'>;

type ActionFilter = 'All' | 'Open' | 'Overdue' | 'Completed';
const FILTERS: ActionFilter[] = ['All', 'Open', 'Overdue', 'Completed'];

interface ActionWithNCR {
  action: Action;
  ncr: NCR;
}

export function ActionsScreen({ navigation }: Props) {
  const { ncrs, reload, toggleAction } = useNCRs();
  const [filter, setFilter] = useState<ActionFilter>('All');

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const allActions = useMemo<ActionWithNCR[]>(() => {
    const out: ActionWithNCR[] = [];
    for (const n of ncrs) {
      for (const a of n.actions) out.push({ action: a, ncr: n });
    }
    return out.sort((a, b) => {
      const ad = a.action.dueDate || a.action.createdAt;
      const bd = b.action.dueDate || b.action.createdAt;
      return ad < bd ? -1 : 1;
    });
  }, [ncrs]);

  const filtered = useMemo(() => {
    return allActions.filter(({ action }) => {
      const overdue =
        action.status !== 'Completed' &&
        action.dueDate &&
        new Date(action.dueDate).getTime() < Date.now();
      if (filter === 'Open') return action.status !== 'Completed';
      if (filter === 'Completed') return action.status === 'Completed';
      if (filter === 'Overdue') return Boolean(overdue);
      return true;
    });
  }, [allActions, filter]);

  const counts = useMemo(() => {
    let open = 0;
    let overdue = 0;
    let completed = 0;
    for (const { action } of allActions) {
      if (action.status === 'Completed') completed += 1;
      else {
        open += 1;
        if (action.dueDate && new Date(action.dueDate).getTime() < Date.now()) overdue += 1;
      }
    }
    return { open, overdue, completed };
  }, [allActions]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Action Tracker"
        subtitle="All assignments across nonconformances"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <SummaryChip label="Open" value={counts.open} color={Colors.steelBlue} />
          <SummaryChip label="Overdue" value={counts.overdue} color={Colors.errorRed} />
          <SummaryChip label="Done" value={counts.completed} color={Colors.successGreen} />
        </View>

        <View style={styles.filterRow}>
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

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="flash-outline" size={28} color={Colors.steelBlue} />
            <Text style={styles.emptyTitle}>
              {allActions.length === 0 ? 'No actions assigned yet' : 'No actions in this view'}
            </Text>
            <Text style={styles.emptyBody}>
              {allActions.length === 0
                ? 'Assign actions to an NCR from its detail screen.'
                : 'Switch filters above to see other actions.'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {filtered.map(({ action, ncr }) => {
              const overdue =
                action.status !== 'Completed' &&
                action.dueDate &&
                new Date(action.dueDate).getTime() < Date.now();
              const completed = action.status === 'Completed';
              return (
                <Pressable
                  key={action.id}
                  onPress={() => navigation.navigate('NCRDetail', { ncrId: ncr.id })}
                  style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.95 }]}
                >
                  <Pressable
                    onPress={() => toggleAction(ncr.id, action.id)}
                    hitSlop={10}
                    style={[styles.checkbox, completed && styles.checkboxOn]}
                  >
                    {completed ? (
                      <Ionicons name="checkmark" size={14} color={Colors.card} />
                    ) : null}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.actionText, completed && styles.actionTextDone]}
                      numberOfLines={2}
                    >
                      {action.description}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>{ncr.ncrNumber}</Text>
                      {action.assignedTo ? (
                        <>
                          <Text style={styles.metaDot}>·</Text>
                          <Text style={styles.metaText}>{action.assignedTo}</Text>
                        </>
                      ) : null}
                      {action.dueDate ? (
                        <>
                          <Text style={styles.metaDot}>·</Text>
                          <Text
                            style={[
                              styles.metaText,
                              overdue && { color: Colors.errorRed, fontWeight: '700' },
                            ]}
                          >
                            {overdue ? 'Overdue' : 'Due'} {formatDate(action.dueDate)}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface SummaryChipProps {
  label: string;
  value: number;
  color: string;
}

function SummaryChip({ label, value, color }: SummaryChipProps) {
  return (
    <View style={[styles.chip, { borderColor: color + '40' }]}>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  chipValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  chipLabel: {
    fontSize: 11,
    color: Colors.secondaryText,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.sm,
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
  },
  pillLabelActive: {
    color: Colors.card,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  actionCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.card,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.successGreen,
    borderColor: Colors.successGreen,
  },
  actionText: {
    fontSize: 14,
    color: Colors.bodyText,
    fontWeight: '500',
  },
  actionTextDone: {
    color: Colors.secondaryText,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
});
