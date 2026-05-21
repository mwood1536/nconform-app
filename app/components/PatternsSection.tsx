import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { Audit, DetectedPattern, NCR, PatternsCache } from '../types';
import { hashSource, isCacheFresh, loadCachedPatterns, refreshPatterns } from '../utils/patternDetection';

interface Props {
  ncrs: NCR[];
  audits: Audit[];
  onSelectPattern: (pattern: DetectedPattern) => void;
}

export function PatternsSection({ ncrs, audits, onSelectPattern }: Props) {
  const [cache, setCache] = useState<PatternsCache | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const existing = await loadCachedPatterns();
      if (cancelled) return;
      setCache(existing);
      if (ncrs.length < 3) return;
      const sourceHash = hashSource(ncrs, audits);
      if (isCacheFresh(existing, sourceHash)) return;
      setLoading(true);
      try {
        const refreshed = await refreshPatterns(ncrs, audits);
        if (!cancelled) setCache(refreshed);
      } catch {
        // best-effort: leave whatever cache we had
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ncrs, audits]);

  if (ncrs.length < 3) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Patterns Detected</Text>
        <View style={styles.emptyCard}>
          <Ionicons name="analytics-outline" size={22} color={Colors.steelBlue} />
          <Text style={styles.emptyText}>
            More data needed — patterns appear after 3+ investigations.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Patterns Detected</Text>
        {loading ? <ActivityIndicator color={Colors.steelBlue} /> : null}
      </View>
      {cache && cache.patterns.length > 0 ? (
        <View style={{ gap: Spacing.sm }}>
          {cache.patterns.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onSelectPattern(p)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.severityDot,
                    { backgroundColor: severityColor(p.severity) },
                  ]}
                />
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {p.title}
                </Text>
              </View>
              <Text style={styles.cardBody}>{p.summary}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.countText}>
                  {p.count} related incident{p.count === 1 ? '' : 's'}
                </Text>
                <Text style={styles.viewLink}>View Details →</Text>
              </View>
              {p.suggestedAction ? (
                <View style={styles.actionRow}>
                  <Ionicons name="bulb-outline" size={13} color={Colors.amber} />
                  <Text style={styles.actionText}>{p.suggestedAction}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={22} color={Colors.successGreen} />
          <Text style={styles.emptyText}>
            No recurring patterns found in the last 90 days.
          </Text>
        </View>
      )}
    </View>
  );
}

function severityColor(severity: DetectedPattern['severity']): string {
  switch (severity) {
    case 'High':
      return Colors.errorRed;
    case 'Medium':
      return Colors.amber;
    case 'Low':
      return Colors.steelBlue;
  }
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.2,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
    gap: 6,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    lineHeight: 19,
  },
  cardBody: {
    fontSize: 13,
    color: Colors.bodyText,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  countText: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  viewLink: {
    fontSize: 12,
    color: Colors.steelBlue,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.amber + '10',
    borderRadius: Radii.button,
    padding: Spacing.sm,
    marginTop: 4,
  },
  actionText: {
    flex: 1,
    fontSize: 12,
    color: Colors.bodyText,
    fontWeight: '600',
    lineHeight: 16,
  },
});
