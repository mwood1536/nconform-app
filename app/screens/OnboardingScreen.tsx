import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IronStratosWordmark } from '../components/IronStratosWordmark';
import { QuickActionButton } from '../components/QuickActionButton';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import {
  Challenge,
  Challenges,
  Industries,
  Industry,
  QualityStandard,
  QualityStandards,
  TeamSize,
  TeamSizes,
} from '../constants/standards';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList } from '../navigation/types';
import { UserProfile } from '../types';
import { nowISO } from '../utils/ncrHelpers';
import { loadSampleData } from '../utils/sampleData';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const TOTAL_STEPS = 5;

interface DraftAnswers {
  industry: Industry | '';
  standard: QualityStandard | '';
  teamSize: TeamSize | '';
  challenge: Challenge | '';
}

export function OnboardingScreen({ navigation }: Props) {
  const { save } = useProfile();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftAnswers>({
    industry: '',
    standard: '',
    teamSize: '',
    challenge: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => (step + 1) / TOTAL_STEPS, [step]);

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const completeOnboarding = async (withDemo: boolean) => {
    setSubmitting(true);
    try {
      const profile: UserProfile = {
        name: '',
        company: '',
        role: '',
        permissionRole: 'admin',
        industry: draft.industry,
        standard: draft.standard,
        teamSize: draft.teamSize,
        challenge: draft.challenge,
        subscriptionTier: 'free',
        notificationsEnabled: true,
        rcaConnected: false,
        onboardedAt: nowISO(),
      };
      await save(profile);
      if (withDemo) {
        try {
          await loadSampleData();
        } catch {
          // Demo data is best-effort — never block onboarding completion.
        }
      }
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } finally {
      setSubmitting(false);
    }
  };

  const isFinalStep = step === TOTAL_STEPS - 1;

  return (
    <View style={[styles.root, isFinalStep && { backgroundColor: Colors.navy }]}>
      <StatusBar barStyle={isFinalStep ? 'light-content' : 'dark-content'} />
      <SafeAreaView
        style={[
          styles.safe,
          { backgroundColor: isFinalStep ? Colors.navy : Colors.background },
        ]}
        edges={isFinalStep ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
      >
        {!isFinalStep ? (
          <>
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <Pressable onPress={goBack} disabled={step === 0} hitSlop={8}>
                  <Text style={[styles.backLink, step === 0 && { opacity: 0.3 }]}>
                    Back
                  </Text>
                </Pressable>
                <Text style={styles.progressLabel}>
                  Step {step + 1} of {TOTAL_STEPS}
                </Text>
              </View>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {step === 0 ? (
                <Question
                  prompt="Welcome to NConform."
                  question="What industry are you in?"
                  options={Industries}
                  selected={draft.industry}
                  onSelect={(v) => {
                    setDraft({ ...draft, industry: v as Industry });
                    setTimeout(goNext, 220);
                  }}
                />
              ) : null}

              {step === 1 ? (
                <Question
                  prompt="Quality framework"
                  question="What quality standard do you work to?"
                  options={QualityStandards}
                  selected={draft.standard}
                  onSelect={(v) => {
                    setDraft({ ...draft, standard: v as QualityStandard });
                    setTimeout(goNext, 220);
                  }}
                />
              ) : null}

              {step === 2 ? (
                <Question
                  prompt="Your team"
                  question="How large is your quality team?"
                  options={TeamSizes}
                  selected={draft.teamSize}
                  onSelect={(v) => {
                    setDraft({ ...draft, teamSize: v as TeamSize });
                    setTimeout(goNext, 220);
                  }}
                />
              ) : null}

              {step === 3 ? (
                <Question
                  prompt="What we'll focus on"
                  question="What's your biggest quality challenge right now?"
                  options={Challenges}
                  selected={draft.challenge}
                  onSelect={(v) => {
                    setDraft({ ...draft, challenge: v as Challenge });
                    setTimeout(goNext, 220);
                  }}
                />
              ) : null}
            </ScrollView>
          </>
        ) : (
          <View style={styles.finalRoot}>
            <View style={styles.finalContent}>
              <View style={styles.logoMark}>
                <Ionicons name="shield-checkmark" size={56} color={Colors.amber} />
              </View>
              <Text style={styles.finalTitle}>NConform is ready for you.</Text>
              <Text style={styles.finalSubtitle}>
                Audit-ready nonconformance and corrective action management for your team.
              </Text>
            </View>

            <View style={styles.finalFooter}>
              <QuickActionButton
                label={submitting ? 'Setting up…' : 'Start with Demo Data'}
                variant="amber"
                onPress={() => completeOnboarding(true)}
                disabled={submitting}
                fullWidth
                icon="sparkles"
              />
              <QuickActionButton
                label={submitting ? 'Setting up…' : 'Start Fresh'}
                variant="outline"
                onPress={() => completeOnboarding(false)}
                disabled={submitting}
                fullWidth
                icon="arrow-forward"
              />
              <View style={styles.wordmarkWrap}>
                <IronStratosWordmark light size="md" />
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

interface QuestionProps {
  prompt: string;
  question: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
}

function Question({ prompt, question, options, selected, onSelect }: QuestionProps) {
  return (
    <View style={styles.questionWrap}>
      <Text style={styles.eyebrow}>{prompt}</Text>
      <Text style={styles.questionText}>{question}</Text>
      <View style={styles.optionsCol}>
        {options.map((opt) => {
          const active = selected === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={({ pressed }) => [
                styles.optionCard,
                active && styles.optionCardActive,
                pressed && { opacity: 0.92 },
              ]}
            >
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {opt}
              </Text>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  progressWrap: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.amber,
    borderRadius: 4,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backLink: {
    color: Colors.steelBlue,
    fontWeight: '600',
    fontSize: 13,
  },
  progressLabel: {
    color: Colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  questionWrap: {
    gap: Spacing.lg,
  },
  eyebrow: {
    color: Colors.amber,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  optionsCol: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  optionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.card,
  },
  optionCardActive: {
    borderColor: Colors.navy,
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.bodyText,
    flex: 1,
  },
  optionLabelActive: {
    color: Colors.navy,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.navy,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.amber,
  },
  finalRoot: {
    flex: 1,
    backgroundColor: Colors.navy,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  finalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  logoMark: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.card + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  finalTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.card,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  finalSubtitle: {
    fontSize: 15,
    color: Colors.card + 'B0',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  finalFooter: {
    gap: Spacing.lg,
  },
  wordmarkWrap: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
});
