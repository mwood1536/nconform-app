import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';

interface ChartFrameProps {
  title: string;
  subtitle?: string;
  hasData: boolean;
  children: React.ReactNode;
}

export function ChartFrame({ title, subtitle, hasData, children }: ChartFrameProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={styles.chartArea}>
        {hasData ? (
          children
        ) : (
          <View style={styles.emptyArea}>
            <Ionicons name="bar-chart-outline" size={22} color={Colors.secondaryText} />
            <Text style={styles.emptyText}>
              Trends appear after first month of activity
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface BarChartProps {
  values: number[];
  labels: string[];
  color?: string;
  height?: number;
}

export function MiniBarChart({
  values,
  labels,
  color = Colors.navy,
  height = 90,
}: BarChartProps) {
  const max = Math.max(1, ...values);
  const width = 240;
  const barWidth = width / Math.max(1, values.length) - 6;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {values.map((v, i) => {
          const h = (v / max) * (height - 14);
          const x = i * (barWidth + 6) + 3;
          const y = height - h - 14;
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={y} width={barWidth} height={h} rx={3} fill={color} />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={[styles.axisRow, { width }]}>
        {labels.map((l, i) => (
          <Text key={i} style={styles.axisLabel} numberOfLines={1}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

interface LineChartProps {
  values: number[];
  color?: string;
  height?: number;
  yMax?: number;
}

export function MiniLineChart({
  values,
  color = Colors.steelBlue,
  height = 90,
  yMax,
}: LineChartProps) {
  const width = 240;
  const max = yMax ?? Math.max(1, ...values);
  if (values.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center' }}>
        <Text style={styles.axisLabel}>Need at least 2 data points</Text>
      </View>
    );
  }
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - 10 - (v / max) * (height - 20);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={0} x2={width} y1={height - 10} y2={height - 10} stroke={Colors.border} />
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2} />
        {values.map((v, i) => {
          const x = i * step;
          const y = height - 10 - (v / max) * (height - 20);
          return <Circle key={i} cx={x} cy={y} r={2.5} fill={color} />;
        })}
      </Svg>
    </View>
  );
}

interface ComparisonProps {
  current: number;
  previous: number;
  label: string;
}

export function ComparisonCard({ current, previous, label }: ComparisonProps) {
  const delta = current - previous;
  const positive = delta < 0; // for "open actions", down is good
  const color = delta === 0 ? Colors.secondaryText : positive ? Colors.successGreen : Colors.errorRed;
  const arrow = delta === 0 ? '→' : delta > 0 ? '↑' : '↓';
  return (
    <View>
      <Text style={styles.bigNumber}>{current}</Text>
      <Text style={styles.bigSubtitle}>{label}</Text>
      <View style={styles.deltaRow}>
        <Text style={[styles.deltaText, { color }]}>{arrow} {Math.abs(delta)} vs last month</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
    gap: 6,
    ...Shadow.card,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  cardSubtitle: {
    fontSize: 11,
    color: Colors.secondaryText,
  },
  chartArea: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  emptyArea: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
  emptyText: {
    fontSize: 11,
    color: Colors.secondaryText,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  axisLabel: {
    flex: 1,
    fontSize: 9,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  bigNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  bigSubtitle: {
    fontSize: 11,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  deltaRow: {
    marginTop: 6,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
