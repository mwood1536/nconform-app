import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { OptionSheet } from '../components/OptionSheet';
import { QuickActionButton } from '../components/QuickActionButton';
import { OfflineBanner } from '../components/OfflineBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useNCRs } from '../hooks/useNCRs';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList } from '../navigation/types';
import { NCR } from '../types';
import { generateExecutiveOnePager } from '../utils/apiHelpers';
import { formatDate } from '../utils/ncrHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'OnePager'>;

const BLOCKS = [
  'Problem Statement',
  'Root Cause',
  'Corrective Action',
  'Preventive Action',
  'Standards Reference',
  'Timeline',
  'Photos',
  'Actions',
  'Assigned Parties',
] as const;

const PRESETS: { key: string; label: string; blocks: string[] }[] = [
  {
    key: 'quick',
    label: 'Quick Summary',
    blocks: ['Problem Statement', 'Corrective Action', 'Standards Reference'],
  },
  { key: 'full', label: 'Full Investigation', blocks: [...BLOCKS] },
  {
    key: 'audit',
    label: 'Audit Ready',
    blocks: ['Corrective Action', 'Standards Reference', 'Timeline', 'Actions'],
  },
];

export function OnePagerScreen({ navigation, route }: Props) {
  const { profile } = useProfile();
  const { ncrs, reload } = useNCRs();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const initialId = route.params?.ncrId;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>(PRESETS[0].blocks);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<View>(null);

  const ncr = useMemo<NCR | null>(
    () => ncrs.find((n) => n.id === selectedId) ?? null,
    [ncrs, selectedId],
  );

  const toggleBlock = (block: string) => {
    setSelectedBlocks((b) =>
      b.includes(block) ? b.filter((x) => x !== block) : [...b, block],
    );
  };

  const onGenerate = async () => {
    if (!ncr) {
      Alert.alert('Select an NCR', 'Choose a nonconformance to build from.');
      return;
    }
    if (selectedBlocks.length === 0) {
      Alert.alert('Select blocks', 'Choose at least one content block.');
      return;
    }
    setLoading(true);
    setSummary('');
    try {
      const text = await generateExecutiveOnePager(
        ncr,
        profile?.standard ?? '',
        selectedBlocks,
      );
      setSummary(text);
    } catch {
      setSummary(
        `${ncr.ncrNumber} — ${ncr.title}\nSeverity: ${ncr.severity}\nStatus: ${ncr.status}\n\n${ncr.description}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!cardRef.current) return;
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photos access required', 'Allow photo library access to save the one-pager.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'One-pager saved to your photo library.');
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="One Pager Builder"
        subtitle="Executive summary for leadership"
        onBack={() => navigation.goBack()}
      />
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Source NCR</Text>
        <Pressable
          onPress={() => {
            if (ncrs.length === 0) {
              Alert.alert('No NCRs', 'Log a nonconformance first.');
              return;
            }
            setPickerOpen(true);
          }}
          style={({ pressed }) => [styles.selector, pressed && { opacity: 0.9 }]}
        >
          <Text style={[styles.selectorText, !ncr && { color: Colors.secondaryText }]}>
            {ncr ? `${ncr.ncrNumber} · ${ncr.title}` : 'Select an NCR'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
        </Pressable>

        <Text style={styles.sectionLabel}>Presets</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((p) => {
            const active =
              p.blocks.length === selectedBlocks.length &&
              p.blocks.every((b) => selectedBlocks.includes(b));
            return (
              <Pressable
                key={p.key}
                onPress={() => setSelectedBlocks(p.blocks)}
                style={({ pressed }) => [
                  styles.preset,
                  active && styles.presetActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Blocks</Text>
        <View style={styles.blockGrid}>
          {BLOCKS.map((b) => {
            const on = selectedBlocks.includes(b);
            return (
              <Pressable
                key={b}
                onPress={() => toggleBlock(b)}
                style={({ pressed }) => [
                  styles.block,
                  on && styles.blockOn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Ionicons
                  name={on ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={on ? Colors.navy : Colors.secondaryText}
                />
                <Text style={[styles.blockLabel, on && styles.blockLabelOn]}>{b}</Text>
              </Pressable>
            );
          })}
        </View>

        <QuickActionButton
          label={loading ? 'Generating…' : 'Generate One Pager'}
          variant="amber"
          icon="sparkles-outline"
          onPress={onGenerate}
          disabled={loading}
          fullWidth
        />

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Colors.navy} />
            <Text style={styles.loadingText}>Drafting executive summary…</Text>
          </View>
        ) : null}

        {summary && ncr ? (
          <>
            <View ref={cardRef} collapsable={false} style={styles.onePager}>
              <View style={styles.brandHeader}>
                <View>
                  <Text style={styles.brandName}>NConform</Text>
                  <Text style={styles.brandTag}>EXECUTIVE ONE PAGER</Text>
                </View>
                <Text style={styles.brandIron}>IRONSTRATOS LLC</Text>
              </View>
              <Text style={styles.opTitle}>
                {ncr.ncrNumber} — {ncr.title}
              </Text>
              <View style={styles.opMetaRow}>
                <Text style={styles.opMeta}>Severity: {ncr.severity}</Text>
                <Text style={styles.opMeta}>Status: {ncr.status}</Text>
                <Text style={styles.opMeta}>Created: {formatDate(ncr.createdAt)}</Text>
              </View>
              <View style={styles.opDivider} />
              <Text style={styles.opBody}>{summary}</Text>
              <Text style={styles.opFooter}>
                IronStratos LLC · Smiths Station, Alabama · {formatDate(new Date().toISOString())}
              </Text>
            </View>
            <QuickActionButton
              label="Save to Gallery"
              variant="primary"
              icon="image-outline"
              onPress={onSave}
              fullWidth
            />
          </>
        ) : null}
      </ScrollView>

      <OptionSheet
        visible={pickerOpen}
        title="Select an NCR"
        options={ncrs.map((n) => `${n.ncrNumber} · ${n.title || 'Untitled'}`)}
        selected={null}
        onSelect={(label) => {
          const number = label.split(' · ')[0];
          const found = ncrs.find((n) => n.ncrNumber === number);
          setSelectedId(found?.id ?? null);
          setSummary('');
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  selectorText: {
    fontSize: 14,
    color: Colors.bodyText,
    fontWeight: '600',
    flex: 1,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  preset: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  presetActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.bodyText,
  },
  presetLabelActive: {
    color: Colors.card,
  },
  blockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  blockOn: {
    borderColor: Colors.navy,
    backgroundColor: Colors.navy + '0E',
  },
  blockLabel: {
    fontSize: 13,
    color: Colors.bodyText,
    fontWeight: '600',
  },
  blockLabelOn: {
    color: Colors.navy,
  },
  loadingCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  onePager: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: Colors.amber,
    paddingBottom: Spacing.sm,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  brandTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.amber,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  brandIron: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondaryText,
    letterSpacing: 1.4,
  },
  opTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: Spacing.sm,
  },
  opMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  opMeta: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  opDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  opBody: {
    fontSize: 14,
    color: Colors.bodyText,
    lineHeight: 22,
  },
  opFooter: {
    marginTop: Spacing.lg,
    fontSize: 10,
    color: Colors.secondaryText,
    letterSpacing: 0.6,
  },
});
