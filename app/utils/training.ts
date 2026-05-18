import { Colors } from '../constants/colors';
import { TrainingStatus } from '../constants/standards';
import { TrainingRecord } from '../types';

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
