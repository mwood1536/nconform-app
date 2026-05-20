import { Colors } from '../constants/colors';
import { TrainingStatus } from '../constants/standards';
import {
  RecurrenceFrequency,
  ScheduledTraining,
  TrainingRecord,
  TrainingRecurrence,
  TrainingTemplate,
} from '../types';

// A record is Complete once digitally signed off. Unsigned records whose
// completion date has passed are Overdue; everything else is Pending.
export function effectiveTrainingStatus(record: TrainingRecord): TrainingStatus {
  if (record.signOffStatement && record.signedAt) return 'Complete';
  if (record.dateCompleted) {
    const due = new Date(record.dateCompleted).getTime();
    if (!Number.isNaN(due) && Date.now() > due) return 'Overdue';
  }
  return 'Pending';
}

export function trainingStatusColor(status: TrainingStatus): string {
  switch (status) {
    case 'Complete':
      return Colors.successGreen;
    case 'Overdue':
      return Colors.errorRed;
    default:
      return Colors.amber;
  }
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (24 * 3600_000));
}

export function expiringBuckets(records: TrainingRecord[]): {
  in30: number;
  in60: number;
  in90: number;
  expired: number;
} {
  let in30 = 0;
  let in60 = 0;
  let in90 = 0;
  let expired = 0;
  for (const r of records) {
    const days = daysUntil(r.certificationExpiresOn);
    if (days === null) continue;
    if (days < 0) expired++;
    else if (days <= 30) in30++;
    else if (days <= 60) in60++;
    else if (days <= 90) in90++;
  }
  return { in30, in60, in90, expired };
}

export function nextRecurrenceDate(rec: TrainingRecurrence, from: Date = new Date()): Date {
  const out = new Date(from);
  switch (rec.frequency) {
    case 'Daily':
      out.setDate(out.getDate() + 1);
      break;
    case 'Weekly':
      out.setDate(out.getDate() + 7);
      break;
    case 'Monthly':
      out.setMonth(out.getMonth() + 1);
      break;
    case 'Quarterly':
      out.setMonth(out.getMonth() + 3);
      break;
    case 'Yearly':
      out.setFullYear(out.getFullYear() + 1);
      break;
    case 'Custom':
      out.setDate(out.getDate() + (rec.customIntervalDays ?? 180));
      break;
  }
  return out;
}

export function scheduledTrainingStatus(
  item: ScheduledTraining,
  nowMs: number = Date.now(),
): ScheduledTraining['status'] {
  if (item.status === 'Completed' || item.status === 'Cancelled') return item.status;
  const due = new Date(item.dueDate).getTime();
  return Number.isFinite(due) && due < nowMs ? 'Overdue' : 'Upcoming';
}

export const RecurrenceOptions: RecurrenceFrequency[] = [
  'Annually' as RecurrenceFrequency, // backwards-compat label aliased below
  'Quarterly',
  'Monthly',
  'Custom',
];

// "Annually" in the spec maps to our shared Yearly recurrence.
export const TrainingRecurrenceLabels: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'Yearly', label: 'Annually' },
  { value: 'Monthly', label: 'Every 6 months — Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Custom', label: 'Custom interval' },
];

// Prebuilt training types from the spec — auto-seeded the first time the
// user opens the templates library.
export const BuiltInTrainingTemplates: Omit<TrainingTemplate, 'id' | 'createdAt'>[] = [
  {
    name: 'Safety Orientation',
    defaultTopic: 'New-hire safety orientation',
    defaultStandardRef: 'OSHA 1910 Subpart D',
    defaultDurationMinutes: 60,
    defaultRecurrence: { frequency: 'Yearly', customIntervalDays: null },
    isBuiltIn: true,
  },
  {
    name: 'Forklift Certification',
    defaultTopic: 'Powered industrial truck operator training',
    defaultStandardRef: 'OSHA 1910.178',
    defaultDurationMinutes: 240,
    defaultRecurrence: { frequency: 'Custom', customIntervalDays: 1095 }, // 3 yrs
    isBuiltIn: true,
  },
  {
    name: 'LOTO (Lockout / Tagout)',
    defaultTopic: 'Hazardous energy control procedure',
    defaultStandardRef: 'OSHA 1910.147',
    defaultDurationMinutes: 90,
    defaultRecurrence: { frequency: 'Yearly', customIntervalDays: null },
    isBuiltIn: true,
  },
  {
    name: 'Confined Space',
    defaultTopic: 'Permit-required confined space entry',
    defaultStandardRef: 'OSHA 1910.146',
    defaultDurationMinutes: 120,
    defaultRecurrence: { frequency: 'Yearly', customIntervalDays: null },
    isBuiltIn: true,
  },
  {
    name: 'Hot Work',
    defaultTopic: 'Hot work permit & fire watch',
    defaultStandardRef: 'OSHA 1910.252',
    defaultDurationMinutes: 60,
    defaultRecurrence: { frequency: 'Yearly', customIntervalDays: null },
    isBuiltIn: true,
  },
  {
    name: 'PPE',
    defaultTopic: 'Personal protective equipment use',
    defaultStandardRef: 'OSHA 1910 Subpart I',
    defaultDurationMinutes: 45,
    defaultRecurrence: { frequency: 'Yearly', customIntervalDays: null },
    isBuiltIn: true,
  },
  {
    name: 'Hazcom',
    defaultTopic: 'Hazard communication & SDS',
    defaultStandardRef: 'OSHA 1910.1200',
    defaultDurationMinutes: 60,
    defaultRecurrence: { frequency: 'Yearly', customIntervalDays: null },
    isBuiltIn: true,
  },
  {
    name: 'Quality System Awareness',
    defaultTopic: 'ISO 9001 awareness refresher',
    defaultStandardRef: 'ISO 9001 §7.2',
    defaultDurationMinutes: 45,
    defaultRecurrence: { frequency: 'Yearly', customIntervalDays: null },
    isBuiltIn: true,
  },
];
