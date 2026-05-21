import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { StandardsLibrary } from '../constants/standardsLibrary';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StandardsLibrary'>;

export function StandardsLibraryScreen({ navigation }: Props) {
  const [expanded, setExpanded] = useState<string | null>(StandardsLibrary[0]?.code ?? null);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Standards Library"
        subtitle="Reference guide"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Quick reference for the standards NConform supports. Use these to cite the right
          clause when documenting a nonconformance or corrective action.
        </Text>

        {StandardsLibrary.map((entry) => {
          const open = expanded === entry.code;
          return (
            <View key={entry.code} style={styles.card}>
              <Pressable
                onPress={() => setExpanded(open ? null : entry.code)}
                style={({ pressed }) => [styles.cardHead, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.codeBadge}>
                  <Text style={styles.codeBadgeText}>{entry.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{entry.fullName}</Text>
                  <Text style={styles.cardVersion}>{entry.version}</Text>
                </View>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.secondaryText}
                />
              </Pressable>

              {open ? (
                <View style={styles.cardBody}>
                  <Text style={styles.sectionLabel}>Overview</Text>
                  <Text style={styles.bodyText}>{entry.description}</Text>

                  <Text style={styles.sectionLabel}>Applies To</Text>
                  <Text style={styles.bodyText}>{entry.appliesTo}</Text>

                  <Text style={styles.sectionLabel}>Key Sections for Nonconformances</Text>
                  {entry.keySections.map((s) => (
                    <View key={s.ref} style={styles.clauseRow}>
                      <Text style={styles.clauseRef}>{s.ref}</Text>
                      <Text style={styles.clauseTitle}>{s.title}</Text>
                    </View>
                  ))}

                  <Text style={styles.sectionLabel}>Common Audit Findings</Text>
                  {entry.commonFindings.map((f) => (
                    <View key={f} style={styles.bulletRow}>
                      <Ionicons
                        name="ellipse"
                        size={6}
                        color={Colors.steelBlue}
                        style={{ marginTop: 7 }}
                      />
                      <Text style={styles.bulletText}>{f}</Text>
                    </View>
                  ))}

                  <Text style={styles.sectionLabel}>Example NCR Scenarios</Text>
                  {entry.exampleScenarios.map((s) => (
                    <View key={s} style={styles.bulletRow}>
                      <Ionicons
                        name="ellipse"
                        size={6}
                        color={Colors.amber}
                        style={{ marginTop: 7 }}
                      />
                      <Text style={styles.bulletText}>{s}</Text>
                    </View>
                  ))}

                  <Text style={styles.sectionLabel}>When to Reference</Text>
                  <Text style={styles.bodyText}>{entry.whenToReference}</Text>

                  <Pressable
                    onPress={() => Linking.openURL(entry.externalLink).catch(() => undefined)}
                    style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="open-outline" size={14} color={Colors.steelBlue} />
                    <Text style={styles.linkText}>Open official source</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}

        <Text style={styles.disclaimer}>
          Educational summary only. Always consult the official published standard for
          authoritative requirements.
        </Text>
      </ScrollView>
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
  intro: {
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 19,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    overflow: 'hidden',
    ...Shadow.card,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  codeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.navy,
  },
  codeBadgeText: {
    color: Colors.card,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  cardVersion: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  cardBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
  },
  bodyText: {
    fontSize: 14,
    color: Colors.bodyText,
    lineHeight: 21,
  },
  clauseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  clauseRef: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.steelBlue,
    minWidth: 110,
  },
  clauseTitle: {
    flex: 1,
    fontSize: 13,
    color: Colors.bodyText,
    lineHeight: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: Colors.bodyText,
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  linkText: {
    fontSize: 13,
    color: Colors.steelBlue,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontStyle: 'italic',
    lineHeight: 17,
    marginTop: Spacing.sm,
  },
});
