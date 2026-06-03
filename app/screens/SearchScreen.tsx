import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { StandardsLibrary } from '../core/StandardsLibrary';
import { useAudits } from '../hooks/useAudits';
import { useNCRs } from '../hooks/useNCRs';
import { useTraining } from '../hooks/useTraining';
import { RootStackParamList } from '../navigation/types';
import { formatDate } from '../utils/ncrHelpers';
import { Storage } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

type ResultKind =
  | 'NCR'
  | 'Audit'
  | 'Training'
  | 'Safety Observation'
  | 'Procedure'
  | 'Standard';

interface SearchResult {
  kind: ResultKind;
  title: string;
  subtitle: string;
  onOpen: () => void;
  key: string;
}

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle);
}

export function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [observations, setObservations] = useState<
    Array<{ id: string; description: string; createdAt: string }>
  >([]);

  const { ncrs } = useNCRs();
  const { audits, templates } = useAudits();
  const { records } = useTraining();

  useEffect(() => {
    void Storage.getRecentSearches().then(setRecent);
    void Storage.getSafetyObservations().then((list) =>
      setObservations(
        list.map((o) => ({ id: o.id, description: o.description, createdAt: o.createdAt })),
      ),
    );
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim().toLowerCase()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const grouped = useMemo<Record<ResultKind, SearchResult[]>>(() => {
    const out: Record<ResultKind, SearchResult[]> = {
      NCR: [],
      Audit: [],
      Training: [],
      'Safety Observation': [],
      Procedure: [],
      Standard: [],
    };
    if (!debounced) return out;

    for (const n of ncrs) {
      const text = `${n.ncrNumber} ${n.title} ${n.description} ${n.assignedTo} ${n.department}`;
      if (matches(text, debounced)) {
        out.NCR.push({
          kind: 'NCR',
          key: n.id,
          title: `${n.ncrNumber} — ${n.title}`,
          subtitle: `${n.status} · ${n.severity} · ${formatDate(n.createdAt)}`,
          onOpen: () => navigation.replace('NCRDetail', { ncrId: n.id }),
        });
      }
    }

    for (const a of audits) {
      const text = `${a.name} ${a.layer} ${a.standard} ${a.department} ${a.assignedTo}`;
      if (matches(text, debounced)) {
        out.Audit.push({
          kind: 'Audit',
          key: a.id,
          title: a.name,
          subtitle: `${a.layer} · ${a.standard} · ${formatDate(a.createdAt)}`,
          onOpen: () => navigation.replace('AuditExecution', { auditId: a.id }),
        });
      }
    }

    for (const t of templates) {
      const text = `${t.name} ${t.standard} ${t.layer}`;
      if (matches(text, debounced)) {
        out.Audit.push({
          kind: 'Audit',
          key: `tpl-${t.id}`,
          title: `${t.name} (template)`,
          subtitle: `${t.layer} · ${t.standard} · ${t.mode}`,
          onOpen: () => navigation.replace('AuditBuilder', { templateId: t.id }),
        });
      }
    }

    for (const r of records) {
      const text = `${r.employeeName} ${r.topic} ${r.trainerName} ${r.standardRef}`;
      if (matches(text, debounced)) {
        out.Training.push({
          kind: 'Training',
          key: r.id,
          title: `${r.employeeName} — ${r.topic}`,
          subtitle: `${r.trainerName || 'No trainer'} · ${formatDate(r.dateCompleted || r.createdAt)}`,
          onOpen: () => navigation.replace('TrainingForm', { recordId: r.id }),
        });
      }
    }

    for (const o of observations) {
      if (matches(o.description, debounced)) {
        out['Safety Observation'].push({
          kind: 'Safety Observation',
          key: o.id,
          title: o.description.slice(0, 80),
          subtitle: formatDate(o.createdAt),
          onOpen: () => navigation.replace('SafetyObservation'),
        });
      }
    }

    for (const s of StandardsLibrary) {
      const text = `${s.code} ${s.fullName} ${s.description} ${s.whenToReference}`;
      if (matches(text, debounced)) {
        out.Standard.push({
          kind: 'Standard',
          key: s.code,
          title: s.fullName,
          subtitle: s.description.slice(0, 80),
          onOpen: () => navigation.replace('StandardsLibrary'),
        });
      }
    }

    // Procedures = corrective action procedures from the standards library
    // section refs. We surface section refs that match — keeps the spec's
    // "procedures library" slot useful without inventing a separate store.
    for (const s of StandardsLibrary) {
      for (const section of s.keySections) {
        const text = `${s.code} ${section.ref} ${section.title}`;
        if (matches(text, debounced)) {
          out.Procedure.push({
            kind: 'Procedure',
            key: `${s.code}-${section.ref}`,
            title: `${section.ref} — ${section.title}`,
            subtitle: s.code,
            onOpen: () => navigation.replace('StandardsLibrary'),
          });
        }
      }
    }

    return out;
  }, [debounced, ncrs, audits, templates, records, observations, navigation]);

  const totalResults =
    grouped.NCR.length +
    grouped.Audit.length +
    grouped.Training.length +
    grouped['Safety Observation'].length +
    grouped.Standard.length +
    grouped.Procedure.length;

  const commit = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      const next = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, 10);
      setRecent(next);
      await Storage.setRecentSearches(next);
    },
    [recent],
  );

  const onSubmit = () => commit(query);

  const clearRecent = async () => {
    setRecent([]);
    await Storage.setRecentSearches([]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title="Search" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={Colors.secondaryText} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search NCRs, audits, training, observations…"
            placeholderTextColor={Colors.secondaryText}
            style={styles.searchInput}
            returnKeyType="search"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={onSubmit}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={Colors.secondaryText} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!debounced ? (
            recent.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="search-outline" size={28} color={Colors.steelBlue} />
                <Text style={styles.emptyTitle}>Start typing to search</Text>
                <Text style={styles.emptyBody}>
                  Try searching for an NCR number, employee name, or topic.
                </Text>
              </View>
            ) : (
              <View>
                <View style={styles.recentHeader}>
                  <Text style={styles.sectionLabel}>Recent searches</Text>
                  <Pressable onPress={clearRecent}>
                    <Text style={styles.clearLink}>Clear</Text>
                  </Pressable>
                </View>
                <View style={styles.recentList}>
                  {recent.map((term) => (
                    <Pressable
                      key={term}
                      onPress={() => {
                        setQuery(term);
                        setDebounced(term.toLowerCase());
                      }}
                      style={({ pressed }) => [styles.recentPill, pressed && { opacity: 0.85 }]}
                    >
                      <Ionicons name="time-outline" size={14} color={Colors.secondaryText} />
                      <Text style={styles.recentText}>{term}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )
          ) : totalResults === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={28} color={Colors.secondaryText} />
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptyBody}>
                Try a different keyword or check the spelling.
              </Text>
            </View>
          ) : (
            (Object.keys(grouped) as ResultKind[]).map((kind) =>
              grouped[kind].length === 0 ? null : (
                <View key={kind} style={styles.section}>
                  <Text style={styles.sectionLabel}>
                    {kind} · {grouped[kind].length}
                  </Text>
                  <View style={{ gap: Spacing.sm }}>
                    {grouped[kind].map((r) => (
                      <Pressable
                        key={r.key}
                        onPress={() => {
                          void commit(query);
                          r.onOpen();
                        }}
                        style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
                      >
                        <View style={styles.rowIcon}>
                          <Ionicons name={iconForKind(kind)} size={16} color={Colors.steelBlue} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle} numberOfLines={2}>
                            {r.title}
                          </Text>
                          <Text style={styles.rowSubtitle} numberOfLines={1}>
                            {r.subtitle}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.secondaryText} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ),
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function iconForKind(kind: ResultKind): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'NCR':
      return 'clipboard-outline';
    case 'Audit':
      return 'shield-checkmark-outline';
    case 'Training':
      return 'school-outline';
    case 'Safety Observation':
      return 'alert-circle-outline';
    case 'Procedure':
      return 'document-text-outline';
    case 'Standard':
      return 'library-outline';
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchWrap: {
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.md,
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
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
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
    lineHeight: 18,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  clearLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.steelBlue,
  },
  recentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recentText: {
    fontSize: 12,
    color: Colors.bodyText,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
    ...Shadow.card,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.steelBlue + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
});
