import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { Storage } from '../utils/storage';

interface Step {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  highlight: 'header' | 'metrics' | 'patterns' | 'quickActions' | 'tabBar';
}

const STEPS: Step[] = [
  {
    title: 'Welcome to NConform',
    body: 'Quick tour — 4 stops. The settings and search icons live up here.',
    icon: 'sparkles-outline',
    highlight: 'header',
  },
  {
    title: 'Metrics & Trends',
    body: 'Your at-a-glance numbers and 30-day trend charts live here.',
    icon: 'bar-chart-outline',
    highlight: 'metrics',
  },
  {
    title: 'AI Pattern Detection',
    body: 'AI scans your last 90 days for recurring issues and surfaces them as cards.',
    icon: 'analytics-outline',
    highlight: 'patterns',
  },
  {
    title: 'Quick Actions',
    body: 'Log NCRs, start audits, and report safety observations without hunting.',
    icon: 'flash-outline',
    highlight: 'quickActions',
  },
  {
    title: 'Bottom Tabs',
    body: 'NCRs, Audits, Training, and More — your full workflow is one tap away.',
    icon: 'apps-outline',
    highlight: 'tabBar',
  },
];

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function TutorialOverlay({ visible, onDone }: Props) {
  const [step, setStep] = useState(0);
  const screen = Dimensions.get('window');

  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  const next = async () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else {
      await Storage.setTutorialCompleted(true);
      onDone();
    }
  };

  const skip = async () => {
    await Storage.setTutorialCompleted(true);
    onDone();
  };

  if (!visible) return null;
  const current = STEPS[step];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={skip}>
      <View style={[styles.backdrop, { width: screen.width, height: screen.height }]}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={current.icon} size={28} color={Colors.amber} />
          </View>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === step && styles.dotActive]}
              />
            ))}
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={skip}
              style={({ pressed }) => [styles.skip, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.skipText}>Skip Tutorial</Text>
            </Pressable>
            <Pressable
              onPress={next}
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.ctaText}>
                {step === STEPS.length - 1 ? 'Done' : 'Next'}
              </Text>
              <Ionicons
                name={step === STEPS.length - 1 ? 'checkmark' : 'arrow-forward'}
                size={16}
                color={Colors.card}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#1B2A4ACC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    gap: Spacing.md,
    alignItems: 'center',
    ...Shadow.pressed,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.amber + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: Colors.bodyText,
    lineHeight: 20,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.navy,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
  },
  skip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  skipText: {
    color: Colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.navy,
    borderRadius: Radii.button,
  },
  ctaText: {
    color: Colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
});
