import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useNCRs } from '../hooks/useNCRs';
import { RootStackParamList } from '../navigation/types';
import { NCR } from '../types';
import { generateAndSharePDF } from '../utils/reports';

type Props = NativeStackScreenProps<RootStackParamList, 'Pareto'>;

const RANGES = ['Last 30', 'Last 60', 'Last 90', 'This Quarter', 'This Year', 'All Time'] as const;
type Range = (typeof RANGES)[number];

function startForRange(range: Range): number {
  const now = new Date();
  switch (range) {
    case 'Last 30':
      return now.getTime() - 30 * 24 * 3600_000;
    case 'Last 60':
      return now.getTime() - 60 * 24 * 3600_000;
    case 'Last 90':
      return now.getTime() - 90 * 24 * 3600_000;
    case 'This Quarter':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
    case 'This Year':
      return new Date(now.getFullYear(), 0, 1).getTime();
    case 'All Time':
      return 0;
  }
}

interface CauseBucket {
  label: string;
  count: number;
  ncrIds: string[];
}

function bucketsFor(ncrs: NCR[], start: number): CauseBucket[] {
  const map = new Map<string, CauseBucket>();
  for (const n of ncrs) {
    if (n.status !== 'Closed') continue;
    if (new Date(n.createdAt).getTime() < start) continue;
    const root = n.correctiveAction?.rootCause?.trim();
    const label = (root && root.length > 0 ? root : 'Unclassified').slice(0, 80);
    const existing = map.get(label);
    if (existing) {
      existing.count += 1;
      existing.ncrIds.push(n.id);
    } else {
      map.set(label, { label, count: 1, ncrIds: [n.id] });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function ParetoAnalysisScreen({ navigation }: Props) {
  const { ncrs } = useNCRs();
  const [range, setRange] = useState<Range>('Last 90');
  const [exporting, setExporting] = useState(false);

  const buckets = useMemo(() => bucketsFor(ncrs, startForRange(range)), [ncrs, range]);
  const total = buckets.reduce((s, b) => s + b.count, 0);

  const top3Pct =
    total === 0
      ? 0
      : Math.round((buckets.slice(0, 3).reduce((s, b) => s + b.count, 0) / total) * 100);

  const onExport = async () => {
    if (buckets.length === 0) {
      Alert.alert('Nothing to export', 'No closed NCRs in this range.');
      return;
    }
    setExporting(true);
    try {
      const rows = buckets
        .map((b, i) => `<tr><td>${i + 1}</td><td>${b.label}</td><td>${b.count}</td></tr>`)
        .join('');
      const html = `
        <html><head><meta charset="utf-8"/>
        <style>body{font-family:-apple-system,Helvetica,sans-serif;padding:24px;color:#1A1A2E;}
        h1{color:#1B2A4A;font-size:22px;margin:0 0 4px;}
        h2{color:#6B7280;font-size:13px;font-weight:600;margin:0 0 16px;}
        table{border-collapse:collapse;width:100%;}
        td,th{border:1px solid #E2E8F0;padding:8px 10px;text-align:left;font-size:12px;}
        th{background:#F8F9FB;color:#1B2A4A;}</style></head>
        <body>
        <h1>Pareto Analysis</h1>
        <h2>${range} · ${total} closed nonconformances</h2>
        <table><thead><tr><th>#</th><th>Root cause</th><th>Count</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p style="margin-top:16px;font-size:12px;color:#6B7280;">
          Top 3 causes account for ${top3Pct}% of all closed nonconformances.
        </p>
        </body></html>`;
      await generateAndSharePDF(html, 'Pareto-Analysis.pdf');
    } catch {
      Alert.alert('Could not export', 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Pareto Analysis"
        subtitle="Root causes by frequency"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pillRow}>
          {RANGES.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={({ pressed }) => [
                styles.pill,
                range === r && styles.pillActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.pillText, range === r && styles.pillTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>

        {buckets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="analytics-outline" size={28} color={Colors.steelBlue} />
            <Text style={styles.emptyTitle}>No closed NCRs in this range</Text>
            <Text style={styles.emptyBody}>
              Pareto builds from closed NCRs with a root cause. Close some investigations or
              widen the date range.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.chartCard}>
              <ParetoChart buckets={buckets} />
            </View>
            <View style={styles.calloutCard}>
              <Ionicons name="trending-up-outline" size={20} color={Colors.amber} />
              <Text style={styles.calloutText}>
                <Text style={styles.calloutEmphasis}>Top 3 causes</Text> account for{' '}
                <Text style={styles.calloutEmphasis}>{top3Pct}%</Text> of all closed
                nonconformances.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Ranking</Text>
            <View style={{ gap: Spacing.sm }}>
              {buckets.map((b, idx) => (
                <Pressable
                  key={b.label}
                  onPress={() =>
                    navigation.navigate('Main', {
                      screen: 'NCRs',
                      params: { filterIds: b.ncrIds, filterTitle: b.label },
                    })
                  }
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
                >
                  <View style={styles.rank}>
                    <Text style={styles.rankText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel} numberOfLines={2}>
                      {b.label}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {b.count} of {total} closed NCR{total === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.secondaryText} />
                </Pressable>
              ))}
            </View>

            <QuickActionButton
              label={exporting ? 'Exporting…' : 'Export as PDF'}
              variant="outline"
              icon="document-outline"
              onPress={onExport}
              disabled={exporting}
              fullWidth
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ChartProps {
  buckets: CauseBucket[];
}

function ParetoChart({ buckets }: ChartProps) {
  const top = buckets.slice(0, 8);
  const width = 300;
  const height = 160;
  const max = Math.max(1, ...top.map((b) => b.count));
  const total = top.reduce((s, b) => s + b.count, 0);
  const barW = width / top.length - 6;
  const cumulative: number[] = [];
  let acc = 0;
  for (const b of top) {
    acc += b.count;
    cumulative.push(acc);
  }
  const linePoints = cumulative
    .map((v, i) => {
      const x = i * (barW + 6) + barW / 2 + 3;
      const y = height - 14 - (total === 0 ? 0 : (v / total) * (height - 24));
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {top.map((b, i) => {
          const h = (b.count / max) * (height - 24);
          const x = i * (barW + 6) + 3;
          const y = height - h - 14;
          return <Rect key={i} x={x} y={y} width={barW} height={h} rx={3} fill={Colors.navy} />;
        })}
        <Line
          x1={0}
          x2={width}
          y1={height - 14}
          y2={height - 14}
          stroke={Colors.border}
        />
        <Polyline
          points={linePoints}
          fill="none"
          stroke={Colors.amber}
          strokeWidth={2}
        />
        {cumulative.map((v, i) => {
          const x = i * (barW + 6) + barW / 2 + 3;
          const y = height - 14 - (total === 0 ? 0 : (v / total) * (height - 24));
          return <Circle key={i} cx={x} cy={y} r={3} fill={Colors.amber} />;
        })}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width }}>
        {top.map((_, i) => (
          <Text
            key={i}
            style={{ flex: 1, fontSize: 9, color: Colors.secondaryText, textAlign: 'center' }}
          >
            {i + 1}
          </Text>
        ))}
      </View>
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
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
  pillText: {
    color: Colors.bodyText,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
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
    lineHeight: 18,
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadow.card,
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.amber + '10',
    borderRadius: Radii.button,
    padding: Spacing.md,
  },
  calloutText: {
    flex: 1,
    fontSize: 13,
    color: Colors.bodyText,
    lineHeight: 18,
  },
  calloutEmphasis: {
    fontWeight: '700',
    color: Colors.navy,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
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
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: Colors.card,
    fontSize: 13,
    fontWeight: '700',
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  rowMeta: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
});
