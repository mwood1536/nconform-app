import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { Pricing } from '../utils/subscription';
import { IronStratosWordmark } from './IronStratosWordmark';
import { QuickActionButton } from './QuickActionButton';

interface Props {
  tier: 'pro' | 'bundle';
  title: string;
  description: string;
  bullets?: string[];
  onUpgrade: () => void;
}

export function FeatureLock({ tier, title, description, bullets = [], onUpgrade }: Props) {
  const plan = Pricing[tier];
  return (
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={26} color={Colors.amber} />
        </View>
        <View style={styles.tierPill}>
          <Text style={styles.tierPillText}>
            {tier === 'bundle' ? 'BUNDLE FEATURE' : 'PRO FEATURE'}
          </Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {bullets.length > 0 ? (
          <View style={styles.bullets}>
            {bullets.map((b) => (
              <View key={b} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.steelBlue} />
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.priceRow}>
          <Text style={styles.price}>{plan.price}</Text>
          <Text style={styles.cadence}>{plan.cadence}</Text>
        </View>

        <QuickActionButton
          label={plan.cta}
          variant="amber"
          icon="arrow-up-circle-outline"
          onPress={onUpgrade}
          fullWidth
        />
        <Text style={styles.note}>{plan.blurb}</Text>
      </View>
      <View style={styles.wordmark}>
        <IronStratosWordmark size="sm" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    gap: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.card,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.amber + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.amber + '14',
    borderColor: Colors.amber + '40',
    borderWidth: 1,
  },
  tierPillText: {
    color: Colors.amber,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
  bullets: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: Colors.bodyText,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: Spacing.sm,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  cadence: {
    fontSize: 13,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 17,
  },
  wordmark: {
    alignItems: 'center',
  },
});
