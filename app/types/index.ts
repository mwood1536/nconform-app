import {
  ActionStatus,
  AuditLayer,
  AuditResponseType,
  AuditStandard,
  AuditStatus,
  Challenge,
  DetectionPoint,
  Industry,
  NCRStatus,
  QualityStandard,
  Severity,
  StandardReference,
  TeamSize,
  TrainingStatus,
} from '../constants/standards';

export type SubscriptionTier = 'free' | 'pro' | 'bundle';

export type UserRole = 'admin' | 'standard' | 'viewer';

export interface UserProfile {
  name: string;
  company: string;
  role: string;
  permissionRole: UserRole;
  industry: Industry | '';
  standard: QualityStandard | '';
  teamSize: TeamSize | '';
  challenge: Challenge | '';
  subscriptionTier: SubscriptionTier;
  notificationsEnabled: boolean;
  rcaConnected: boolean;
  onboardedAt: string;
}

export interface NCRPhoto {
  uri: string;
  capturedAt: string;
}

export interface TimelineEvent {
  id: string;
  label: string;
  detail?: string;
  timestamp: string;
}

export interface Action {
  id: string;
  ncrId: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: ActionStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface CorrectiveAction {
  id: string;
  ncrId: string;
  problemStatement: string;
  containmentAction: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  standardReference: string;
  verificationMethod: string;
  responsibleParty: string;
  targetDate: string;
  status: 'Draft' | 'Active' | 'Verified' | 'Closed';
  createdAt: string;
}

export interface NCR {
  id: string;
  ncrNumber: string;
  title: string;
  detectionPoint: DetectionPoint;
  severity: Severity;
  standardRef: StandardReference;
  description: string;
  standardClauses: string[];
  photos: NCRPhoto[];
  containmentAction: string;
  assignedTo: string;
  dueDate: string;
  status: NCRStatus;
  createdAt: string;
  updatedAt: string;
  sharedWithRCA: boolean;
  correctiveAction: CorrectiveAction | null;
  actions: Action[];
  timeline: TimelineEvent[];
}

export interface AIcorrectiveActionResponse {
  problemStatement: string;
  containmentAction: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  standardReference: string;
  verificationMethod: string;
}

export interface ConditionalFollowup {
  // When the parent question is marked Fail, this follow-up applies.
  prompt: string;
  requirePhoto: boolean;
  requireNote: boolean;
}

export interface AuditQuestion {
  id: string;
  prompt: string;
  requiresPhoto: boolean;
  weight: number;
  followUpOnFail: ConditionalFollowup | null;
}

export interface AuditResponse {
  questionId: string;
  result: AuditResponseType | null;
  note: string;
  photo: string | null;
  followUpAnswer: string;
  followUpPhoto: string | null;
}

export type AuditTemplateMode = 'fixed' | 'random';

export type RecurrenceFrequency =
  | 'Daily'
  | 'Weekly'
  | 'Monthly'
  | 'Quarterly'
  | 'Yearly'
  | 'Custom';

export interface AuditRecurrence {
  frequency: RecurrenceFrequency;
  // For Weekly: 0=Sun..6=Sat; for Monthly: 1-28; for Custom: customIntervalDays.
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  customIntervalDays: number | null;
  reminderHoursBefore: number;
  autoAssignedTo: string;
}

export interface AuditTemplate {
  id: string;
  name: string;
  layer: AuditLayer;
  standard: AuditStandard;
  mode: AuditTemplateMode;
  // For fixed mode the audit always uses these questions in order.
  questions: AuditQuestion[];
  // For random mode the audit draws sampleSize from questionBank.
  questionBank: AuditQuestion[];
  sampleSize: number;
  recurrence: AuditRecurrence | null;
  createdAt: string;
}

export interface Audit {
  id: string;
  templateId: string | null;
  name: string;
  layer: AuditLayer;
  standard: AuditStandard;
  questions: AuditQuestion[];
  responses: AuditResponse[];
  passRate: number;
  weightedPassRate: number;
  randomizationSeed: number | null;
  parentAuditId: string | null;
  layerLevel: number;
  status: AuditStatus;
  assignedTo: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ScheduledAudit {
  id: string;
  templateId: string | null;
  // Pre-resolved label so the schedule list works even after a template rename.
  name: string;
  layer: AuditLayer;
  standard: AuditStandard;
  assignedTo: string;
  dueDate: string;
  status: 'Upcoming' | 'Overdue' | 'Completed' | 'Cancelled';
  // Set when this schedule was generated automatically by escalation.
  escalationParentAuditId: string | null;
  notificationId: string | null;
  createdAt: string;
}

export type TrainingMaterialType = 'pdf' | 'url';

export interface TrainingMaterial {
  id: string;
  type: TrainingMaterialType;
  title: string;
  // For PDFs this is the cached file URI; for URLs the link.
  uri: string;
}

export interface TrainingRecurrence {
  frequency: RecurrenceFrequency;
  customIntervalDays: number | null;
}

export interface TrainingRecord {
  id: string;
  employeeName: string;
  topic: string;
  standardRef: string;
  trainerName: string;
  dateCompleted: string;
  notes: string;
  photo: string | null;
  signOffStatement: string | null;
  signedAt: string | null;
  status: TrainingStatus;
  materials: TrainingMaterial[];
  certificationExpiresOn: string | null;
  recurrence: TrainingRecurrence | null;
  parentRecordId: string | null;
  templateId: string | null;
  createdAt: string;
}

export interface ScheduledTraining {
  id: string;
  templateId: string | null;
  topic: string;
  employeeName: string;
  dueDate: string;
  status: 'Upcoming' | 'Overdue' | 'Completed' | 'Cancelled';
  parentRecordId: string | null;
  notificationId: string | null;
  createdAt: string;
}

export interface TrainingTemplate {
  id: string;
  name: string;
  defaultTopic: string;
  defaultStandardRef: string;
  defaultDurationMinutes: number;
  defaultRecurrence: TrainingRecurrence | null;
  isBuiltIn: boolean;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  permissionRole: UserRole;
}

export interface SafetyObservation {
  id: string;
  description: string;
  photo: string | null;
  location: string;
  createdAt: string;
  syncedToTeam: boolean;
  // Optional Bundle/Pro Web hook — destination workspace, set when sync wires up.
  destinationTeamId: string | null;
}
