import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useNCRs } from '../hooks/useNCRs';
import { RootStackParamList } from '../navigation/types';
import {
  buildCorrectiveActionHTML,
  buildNCRSummaryHTML,
  generateAndSharePDF,
} from '../utils/reports';

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

type StatusFilter = 'All' | 'Open' | 'In Progress' | 'Closed';
type SeverityFilter = 'All' | 'Low' | 'Medium' | 'High' | 'Critical';

const STATUS_FILTERS: StatusFilter[] = ['All', 'Open', 'In Progress', 'Closed'];
const SEVERITY_FILTERS: SeverityFilter[] = ['All', 'Low', 'Medium', 'High', 'Critical'];

export function ReportsScreen({ navigation }: Props) {
  const { ncrs, reload } = useNCRs();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');
  const [generating, setGenerating] = useState<string | null>(null);

  const onGenerateNCRSummary = async () => {
    setGenerating('summary');
    try {
      const html = buildNCRSummaryHTML(ncrs, { status: statusFilter, severity: severityFilter });
      await generateAndSharePDF(html, 'NCR-Summary.pdf');
    } catch {
      Alert.alert('Could not generate report', 'Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  const onGenerateCAStatus = async () => {
    setGenerating('ca');
    try {
      const html = buildCorrectiveActionHTML(ncrs);
      await generateAndSharePDF(html, 'Corrective-Actions.pdf');
    } catch {
      Alert.alert('Could not generate report', 'Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Reports"
        subtitle="Audit-ready exports"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ReportCard
          icon="document-text-outline"
          title="NCR Summary Report"
          description="Filterable list of nonconformances with severity, status, and ownership."
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
        >
          <QuickActionButton
            label={generating === 'ca' ? 'Generating…' : 'Generate PDF'}
            variant="primary"
            icon="document-outline"
            onPress={onGenerateCAStatus}
            disabled={generating === 'ca'}
            fullWidth
          />
        </ReportCard>

        <ReportCard
          icon="newspaper-outline"
          title="One Pager Builder"
          description="Pick the blocks, let AI write an executive summary, and save a branded card."
        >
          <QuickActionButton
            label="Open One Pager Builder"
            variant="amber"
            icon="sparkles-outline"
            onPress={() => navigation.navigate('OnePager')}
            fullWidth
          />
        </ReportCard>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ReportCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  children: React.ReactNode;
}

function ReportCard({ icon, title, description, children }: ReportCardProps) {
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportIconWrap}>
          <Ionicons name={icon} size={20} color={Colors.navy} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>{title}</Text>
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
      style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && { opacity: 0.85 }]}
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
});
