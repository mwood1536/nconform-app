import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AssigneeField } from '../components/AssigneeField';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { TimelineItem } from '../components/TimelineItem';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useNCRs } from '../hooks/useNCRs';
import { RootStackParamList } from '../navigation/types';
import { Action } from '../types';
import { formatDate, isOverdue } from '../utils/ncrHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'NCRDetail'>;

export function NCRDetailScreen({ navigation, route }: Props) {
  const { ncrId } = route.params;
  const { ncrs, reload, setStatus, addAction, toggleAction, setRCAShared, deleteNCR } =
    useNCRs();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const ncr = useMemo(() => ncrs.find((n) => n.id === ncrId) ?? null, [ncrs, ncrId]);
  const [addingAction, setAddingAction] = useState(false);
  const [actionDescription, setActionDescription] = useState('');
  const [actionAssignee, setActionAssignee] = useState('');
  const [actionDueDate, setActionDueDate] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);

  if (!ncr) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScreenHeader title="NCR" onBack={() => navigation.goBack()} />
        <View style={styles.missingWrap}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.secondaryText} />
          <Text style={styles.missingText}>This NCR could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const overdue = isOverdue(ncr);
  const canClose = ncr.status !== 'Closed';
  const canMarkInProgress = ncr.status === 'Open';

  const onAdvanceStatus = async (next: 'In Progress' | 'Closed') => {
    await setStatus(ncr.id, next);
  };

  const onSubmitAction = async () => {
    if (!actionDescription.trim()) {
      Alert.alert('Description required', 'Please describe the action.');
      return;
    }
    await addAction(ncr.id, {
      description: actionDescription.trim(),
      assignedTo: actionAssignee.trim(),
      dueDate: actionDueDate ? actionDueDate.toISOString() : '',
      status: 'Pending',
      completedAt: null,
    });
    setActionDescription('');
    setActionAssignee('');
    setActionDueDate(null);
    setAddingAction(false);
  };

  const onChangeDate = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (selected) setActionDueDate(selected);
  };

  const onDelete = () => {
    Alert.alert(
      'Delete NCR?',
      `${ncr.ncrNumber} and its corrective action will be removed permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNCR(ncr.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title={ncr.ncrNumber}
        onBack={() => navigation.goBack()}
        rightIcon="trash-outline"
        onRightPress={onDelete}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <StatusBadge status={overdue ? 'Overdue' : ncr.status} />
            <SeverityBadge severity={ncr.severity} />
          </View>
          {ncr.sharedWithRCA ? (
            <View style={styles.sharedBadge}>
              <Ionicons name="git-network-outline" size={12} color={Colors.steelBlue} />
              <Text style={styles.sharedBadgeText}>SHARED WITH ROOT CAUSE AI</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{ncr.title}</Text>

          <View style={styles.metaGrid}>
            <MetaItem label="Detection" value={ncr.detectionPoint} />
            <MetaItem label="Standard" value={ncr.standardRef} />
            <MetaItem label="Owner" value={ncr.assignedTo || '—'} />
            <MetaItem
              label="Due"
              value={ncr.dueDate ? formatDate(ncr.dueDate) : '—'}
              accent={overdue ? Colors.errorRed : undefined}
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.body}>{ncr.description}</Text>

          {ncr.standardClauses.length > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Referenced Standards</Text>
              {ncr.standardClauses.map((c) => (
                <View key={c} style={styles.clauseRow}>
                  <Ionicons name="library-outline" size={14} color={Colors.steelBlue} />
                  <Text style={styles.clauseText}>{c}</Text>
                </View>
              ))}
            </>
          ) : null}

          {ncr.containmentAction ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Containment Action</Text>
              <Text style={styles.body}>{ncr.containmentAction}</Text>
            </>
          ) : null}

          {ncr.photos.length > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Photo Evidence</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
                {ncr.photos.map((p) => (
                  <Image key={p.uri} source={{ uri: p.uri }} style={styles.photoThumb} />
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>

        <View style={styles.rcaCard}>
          <View style={styles.rcaRow}>
            <View style={styles.rcaIcon}>
              <Ionicons name="git-network-outline" size={18} color={Colors.steelBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rcaTitle}>Share with Root Cause AI</Text>
              <Text style={styles.rcaSub}>
                Flag this NCR for the Root Cause AI workspace.
              </Text>
            </View>
            <Switch
              value={ncr.sharedWithRCA}
              onValueChange={(v) => setRCAShared(ncr.id, v)}
              trackColor={{ false: Colors.border, true: Colors.steelBlue }}
              thumbColor={Colors.card}
            />
          </View>
          {ncr.sharedWithRCA ? (
            <View style={styles.rcaNote}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.steelBlue} />
              <Text style={styles.rcaNoteText}>
                When connected, this NCR will appear in Root Cause AI.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Corrective Action</Text>
          {ncr.correctiveAction ? (
            <Pressable
              onPress={() => navigation.navigate('AICorrectiveAction', { ncrId: ncr.id })}
              style={({ pressed }) => [styles.caCard, pressed && { opacity: 0.95 }]}
            >
              <View style={styles.caHeader}>
                <View style={styles.caBadge}>
                  <Ionicons name="document-text" size={14} color={Colors.successGreen} />
                  <Text style={styles.caBadgeLabel}>{ncr.correctiveAction.status}</Text>
                </View>
                <Text style={styles.caRef}>{ncr.correctiveAction.standardReference}</Text>
              </View>
              <Text style={styles.caTitle}>Problem Statement</Text>
              <Text style={styles.caBody} numberOfLines={3}>
                {ncr.correctiveAction.problemStatement}
              </Text>
              <View style={styles.caFooter}>
                <Text style={styles.caFooterLink}>View full corrective action</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.steelBlue} />
              </View>
            </Pressable>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              <QuickActionButton
                label="Write Corrective Action with AI"
                variant="primary"
                icon="sparkles-outline"
                onPress={() => navigation.navigate('AICorrectiveAction', { ncrId: ncr.id })}
                fullWidth
              />
              <QuickActionButton
                label="Write Manually"
                variant="ghost"
                icon="create-outline"
                onPress={() => navigation.navigate('AICorrectiveAction', { ncrId: ncr.id })}
                fullWidth
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.actionsHeader}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <Pressable onPress={() => setAddingAction(true)} hitSlop={8}>
              <Text style={styles.addLink}>+ Add Action</Text>
            </Pressable>
          </View>
          {ncr.actions.length === 0 ? (
            <Text style={styles.emptyInline}>No actions assigned yet.</Text>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {ncr.actions.map((a) => (
                <ActionRow
                  key={a.id}
                  action={a}
                  onToggle={() => toggleAction(ncr.id, a.id)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View>
            {ncr.timeline.map((t, idx) => (
              <TimelineItem
                key={t.id}
                event={t}
                isLast={idx === ncr.timeline.length - 1}
              />
            ))}
          </View>
        </View>

        <View style={styles.statusActions}>
          {canMarkInProgress ? (
            <QuickActionButton
              label="Mark In Progress"
              variant="outline"
              icon="play-circle-outline"
              onPress={() => onAdvanceStatus('In Progress')}
              fullWidth
            />
          ) : null}
          {canClose ? (
            <QuickActionButton
              label="Mark Closed"
              variant="primary"
              icon="checkmark-circle-outline"
              onPress={() => onAdvanceStatus('Closed')}
              fullWidth
            />
          ) : (
            <Text style={styles.closedNote}>
              This NCR is closed. Reopen by editing details.
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={addingAction}
        animationType="slide"
        transparent
        onRequestClose={() => setAddingAction(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalFill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <Pressable style={styles.modalBackdrop} onPress={() => setAddingAction(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Action</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={actionDescription}
              onChangeText={setActionDescription}
              placeholder="What needs to be done?"
              placeholderTextColor={Colors.secondaryText}
              multiline
            />
            <AssigneeField
              value={actionAssignee}
              onChange={setActionAssignee}
              placeholder="Assign to"
            />
            <Pressable
              onPress={() => setShowDate(true)}
              style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.dropdownText, !actionDueDate && { color: Colors.secondaryText }]}>
                {actionDueDate ? formatDate(actionDueDate.toISOString()) : 'Due date (optional)'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={Colors.secondaryText} />
            </Pressable>
            {showDate ? (
              <DateTimePicker
                mode="date"
                value={actionDueDate ?? new Date()}
                onChange={onChangeDate}
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
              />
            ) : null}
            <View style={styles.modalActions}>
              <QuickActionButton
                label="Cancel"
                variant="ghost"
                onPress={() => setAddingAction(false)}
              />
              <QuickActionButton
                label="Save Action"
                variant="primary"
                onPress={onSubmitAction}
              />
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

interface MetaItemProps {
  label: string;
  value: string;
  accent?: string;
}

function MetaItem({ label, value, accent }: MetaItemProps) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, accent ? { color: accent } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

interface ActionRowProps {
  action: Action;
  onToggle: () => void;
}

function ActionRow({ action, onToggle }: ActionRowProps) {
  const completed = action.status === 'Completed';
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.checkbox, completed && styles.checkboxOn]}>
        {completed ? <Ionicons name="checkmark" size={14} color={Colors.card} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionText, completed && styles.actionTextDone]}>
          {action.description}
        </Text>
        <Text style={styles.actionMeta}>
          {action.assignedTo || 'Unassigned'}
          {action.dueDate ? ` · Due ${formatDate(action.dueDate)}` : ''}
        </Text>
      </View>
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
    gap: Spacing.lg,
  },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  missingText: {
    color: Colors.secondaryText,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.2,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  metaItem: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.secondaryText,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    color: Colors.bodyText,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    color: Colors.secondaryText,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: Colors.bodyText,
    lineHeight: 21,
  },
  photoStrip: {
    paddingTop: 4,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: Radii.button,
    backgroundColor: Colors.border,
    marginRight: 8,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.2,
  },
  caCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: 6,
    ...Shadow.card,
  },
  caHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  caBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successGreen + '14',
    borderColor: Colors.successGreen + '40',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  caBadgeLabel: {
    color: Colors.successGreen,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  caRef: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  caTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: Spacing.sm,
  },
  caBody: {
    fontSize: 13,
    color: Colors.bodyText,
    lineHeight: 18,
  },
  caFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  caFooterLink: {
    color: Colors.steelBlue,
    fontSize: 13,
    fontWeight: '600',
  },
  actionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addLink: {
    color: Colors.steelBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyInline: {
    color: Colors.secondaryText,
    fontSize: 13,
    paddingVertical: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.successGreen,
    borderColor: Colors.successGreen,
  },
  actionText: {
    fontSize: 14,
    color: Colors.bodyText,
    fontWeight: '500',
  },
  actionTextDone: {
    color: Colors.secondaryText,
    textDecorationLine: 'line-through',
  },
  actionMeta: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  statusActions: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  closedNote: {
    color: Colors.secondaryText,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: Spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.steelBlue + '14',
    borderColor: Colors.steelBlue + '40',
    borderWidth: 1,
  },
  sharedBadgeText: {
    color: Colors.steelBlue,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  rcaCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  rcaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rcaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.steelBlue + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rcaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  rcaSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  rcaNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.steelBlue + '10',
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  rcaNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.steelBlue,
    fontWeight: '600',
    lineHeight: 17,
  },
  clauseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 3,
  },
  clauseText: {
    flex: 1,
    fontSize: 13,
    color: Colors.bodyText,
    lineHeight: 18,
  },
  modalFill: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#1B2A4AB3',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    color: Colors.bodyText,
    fontSize: 14,
    minHeight: 44,
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.bodyText,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
