import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useNCRs } from '../hooks/useNCRs';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { NCR } from '../types';
import { generateOnePagerSummary } from '../utils/apiHelpers';
import { formatDate } from '../utils/ncrHelpers';
import {
  buildCorrectiveActionHTML,
  buildNCRSummaryHTML,
  generateAndSharePDF,
} from '../utils/reports';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Reports'>,
  NativeStackScreenProps<RootStackParamList>
>;

type StatusFilter = 'All' | 'Open' | 'In Progress' | 'Closed';
type SeverityFilter = 'All' | 'Low' | 'Medium' | 'High' | 'Critical';

const STATUS_FILTERS: StatusFilter[] = ['All', 'Open', 'In Progress', 'Closed'];
const SEVERITY_FILTERS: SeverityFilter[] = ['All', 'Low', 'Medium', 'High', 'Critical'];

export function ReportsScreen({ navigation }: Props) {
  const { ncrs, reload } = useNCRs();
  const { profile } = useProfile();
  const isPro = (profile?.subscriptionTier ?? 'free') !== 'free';

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');
  const [generating, setGenerating] = useState<string | null>(null);

  // One Pager state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedNCR, setSelectedNCR] = useState<NCR | null>(null);
  const [onePagerVisible, setOnePagerVisible] = useState(false);
  const [onePagerText, setOnePagerText] = useState('');
  const [onePagerLoading, setOnePagerLoading] = useState(false);
  const onePagerRef = useRef<View>(null);

  const requireProGate = (): boolean => {
    if (isPro) return true;
    Alert.alert(
      'NConform Pro Required',
      'Unlock PDF exports and AI one-pagers with NConform Pro for $4.99.',
      [
        { text: 'Maybe later', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Settings') },
      ],
    );
    return false;
  };

  const onGenerateNCRSummary = async () => {
    if (!requireProGate()) return;
    setGenerating('summary');
    try {
      const html = buildNCRSummaryHTML(ncrs, { status: statusFilter, severity: severityFilter });
      await generateAndSharePDF(html, 'NCR-Summary.pdf');
    } catch (err) {
      Alert.alert('Could not generate report', 'Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  const onGenerateCAStatus = async () => {
    if (!requireProGate()) return;
    setGenerating('ca');
    try {
      const html = buildCorrectiveActionHTML(ncrs);
      await generateAndSharePDF(html, 'Corrective-Actions.pdf');
    } catch (err) {
      Alert.alert('Could not generate report', 'Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  const onSelectOnePager = () => {
    if (!requireProGate()) return;
    if (ncrs.length === 0) {
      Alert.alert('No NCRs available', 'Log at least one nonconformance to generate a one-pager.');
      return;
    }
    setPickerOpen(true);
  };

  const onPickNCRForOnePager = async (ncrNumber: string) => {
    setPickerOpen(false);
    const ncr = ncrs.find((n) => n.ncrNumber === ncrNumber) ?? null;
    setSelectedNCR(ncr);
    if (!ncr) return;
    setOnePagerVisible(true);
    setOnePagerLoading(true);
    setOnePagerText('');
    try {
      const text = await generateOnePagerSummary(ncr, profile?.standard ?? '');
      setOnePagerText(text);
    } catch (err) {
      setOnePagerText(
        `${ncr.ncrNumber} — ${ncr.title}\nSeverity: ${ncr.severity}\nStatus: ${ncr.status}\n\n${ncr.description}`,
      );
    } finally {
      setOnePagerLoading(false);
    }
  };

  const onSaveOnePagerImage = async () => {
    if (!onePagerRef.current) return;
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photos access required', 'Allow photo library access to save the one-pager.');
        return;
      }
      const uri = await captureRef(onePagerRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'One-pager saved to your photo library.');
    } catch (err) {
      Alert.alert('Could not save', 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Reports" subtitle="Audit-ready exports" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ReportCard
          icon="document-text-outline"
          title="NCR Summary Report"
          description="Filterable list of nonconformances with severity, status, and ownership."
          locked={!isPro}
        >
          <Text style={styles.smallLabel}>Status</Text>
          <View style={styles.pillsRow}>
            {STATUS_FILTERS.map((s) => (
              <FilterPill
                key={s}
                label={s}
                active={statusFilter === s}
                onPress={() => setStatusFilter(s)}
              />
            ))}
          </View>
          <Text style={[styles.smallLabel, { marginTop: Spacing.sm }]}>Severity</Text>
          <View style={styles.pillsRow}>
            {SEVERITY_FILTERS.map((s) => (
              <FilterPill
                key={s}
                label={s}
                active={severityFilter === s}
                onPress={() => setSeverityFilter(s)}
              />
            ))}
          </View>
          <View style={{ marginTop: Spacing.md }}>
            <QuickActionButton
              label={generating === 'summary' ? 'Generating…' : 'Generate PDF'}
              variant="primary"
              icon="document-outline"
              onPress={onGenerateNCRSummary}
              disabled={generating === 'summary'}
              fullWidth
            />
          </View>
        </ReportCard>

        <ReportCard
          icon="checkmark-done-outline"
          title="Corrective Action Status"
          description="All open and closed corrective actions with target dates and overdue flags."
          locked={!isPro}
        >
          <View>
            <QuickActionButton
              label={generating === 'ca' ? 'Generating…' : 'Generate PDF'}
              variant="primary"
              icon="document-outline"
              onPress={onGenerateCAStatus}
              disabled={generating === 'ca'}
              fullWidth
            />
          </View>
        </ReportCard>

        <ReportCard
          icon="newspaper-outline"
          title="One Pager"
          description="AI-generated executive summary saved as an image — perfect for leadership review."
          locked={!isPro}
        >
          <View>
            <QuickActionButton
              label="Generate One Pager"
              variant="amber"
              icon="sparkles-outline"
              onPress={onSelectOnePager}
              fullWidth
            />
          </View>
        </ReportCard>

        {!isPro ? (
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={({ pressed }) => [styles.proCta, pressed && { opacity: 0.95 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.proCtaTitle}>Unlock NConform Pro</Text>
              <Text style={styles.proCtaBody}>
                PDF exports, AI one-pagers, and ad-free experience for $4.99.
              </Text>
            </View>
            <Ionicons name="lock-closed" size={20} color={Colors.amber} />
          </Pressable>
        ) : null}
      </ScrollView>

      <OptionSheet
        visible={pickerOpen}
        title="Select an NCR"
        options={ncrs.map((n) => `${n.ncrNumber} · ${n.title || 'Untitled'}`)}
        selected={null}
        onSelect={(label) => {
          const number = label.split(' · ')[0];
          void onPickNCRForOnePager(number);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <Modal
        visible={onePagerVisible}
        animationType="slide"
        onRequestClose={() => setOnePagerVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'left', 'right']}>
          <ScreenHeader
            title="One Pager"
            subtitle={selectedNCR?.ncrNumber ?? ''}
            onBack={() => setOnePagerVisible(false)}
          />
          <ScrollView contentContainerStyle={styles.modalContent}>
            {onePagerLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={Colors.navy} />
                <Text style={styles.modalLoadingText}>Drafting executive summary…</Text>
              </View>
            ) : null}
            <View
              ref={onePagerRef}
              collapsable={false}
              style={styles.onePager}
            >
              <Text style={styles.onePagerEyebrow}>NCONFORM · EXECUTIVE SUMMARY</Text>
              <Text style={styles.onePagerTitle}>
                {selectedNCR?.ncrNumber} — {selectedNCR?.title}
              </Text>
              <View style={styles.onePagerMetaRow}>
                <Text style={styles.onePagerMeta}>Severity: {selectedNCR?.severity}</Text>
                <Text style={styles.onePagerMeta}>Status: {selectedNCR?.status}</Text>
                <Text style={styles.onePagerMeta}>
                  Created: {selectedNCR ? formatDate(selectedNCR.createdAt) : ''}
                </Text>
              </View>
              <View style={styles.onePagerDivider} />
              <Text style={styles.onePagerBody}>
                {onePagerText || (onePagerLoading ? '' : 'No summary generated.')}
              </Text>
              <Text style={styles.onePagerFooter}>IRONSTRATOS LLC</Text>
            </View>
            {!onePagerLoading ? (
              <View style={styles.modalActions}>
                <QuickActionButton
                  label="Save to Photos"
                  variant="primary"
                  icon="image-outline"
                  onPress={onSaveOnePagerImage}
                  fullWidth
                />
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

interface ReportCardProps {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  title: string;
  description: string;
  locked: boolean;
  children: React.ReactNode;
}

function ReportCard({ icon, title, description, locked, children }: ReportCardProps) {
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportIconWrap}>
          <Ionicons name={icon} size={20} color={Colors.navy} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.reportTitleRow}>
            <Text style={styles.reportTitle}>{title}</Text>
            {locked ? (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={12} color={Colors.amber} />
                <Text style={styles.lockBadgeLabel}>PRO</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.reportDesc}>{description}</Text>
        </View>
      </View>
      <View style={styles.reportBody}>{children}</View>
    </View>
  );
}

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function FilterPill({ label, active, onPress }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
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
  reportCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  reportHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.navy + '0E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
    flex: 1,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    backgroundColor: Colors.amber + '14',
    borderColor: Colors.amber + '40',
    borderWidth: 1,
  },
  lockBadgeLabel: {
    color: Colors.amber,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  reportDesc: {
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 18,
    marginTop: 2,
  },
  reportBody: {
    gap: Spacing.sm,
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: Colors.background,
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
  proCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.navy,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  proCtaTitle: {
    color: Colors.card,
    fontSize: 15,
    fontWeight: '700',
  },
  proCtaBody: {
    color: Colors.card + 'C0',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  modalLoadingText: {
    color: Colors.secondaryText,
    fontSize: 13,
  },
  onePager: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    minHeight: 480,
  },
  onePagerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.amber,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  onePagerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  onePagerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  onePagerMeta: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  onePagerDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  onePagerBody: {
    fontSize: 14,
    color: Colors.bodyText,
    lineHeight: 22,
  },
  onePagerFooter: {
    marginTop: Spacing.xl,
    fontSize: 11,
    color: Colors.secondaryText,
    letterSpacing: 1.4,
  },
  modalActions: {
    paddingTop: Spacing.md,
  },
});
