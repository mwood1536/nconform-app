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

export type CorrectiveActionStatus =
  | 'Pending'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Implemented'
  | 'Verified';

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
  status: CorrectiveActionStatus;
  createdAt: string;
}

export type NCRApprovalStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Closed';

export interface ApprovalHistoryEntry {
  id: string;
  fromStatus: NCRApprovalStatus | null;
  toStatus: NCRApprovalStatus;
  actor: string;
  timestamp: string;
  note: string;
}

export interface ApprovalComment {
  id: string;
  author: string;
  body: string;
  timestamp: string;
}

export interface NCRApprovalWorkflow {
  status: NCRApprovalStatus;
  history: ApprovalHistoryEntry[];
  comments: ApprovalComment[];
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
  department: string;
  createdAt: string;
  updatedAt: string;
  sharedWithRCA: boolean;
  correctiveAction: CorrectiveAction | null;
  actions: Action[];
  timeline: TimelineEvent[];
  parentAuditId: string | null;
  generatedTrainingIds: string[];
  approvalWorkflow: NCRApprovalWorkflow;
  isSampleData: boolean;
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
  questions: AuditQuestion[];
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
  department: string;
  questions: AuditQuestion[];
  responses: AuditResponse[];
  passRate: number;
  weightedPassRate: number;
  randomizationSeed: number | null;
  parentAuditId: string | null;
  layerLevel: number;
  status: AuditStatus;
  assignedTo: string;
  generatedNcrIds: string[];
  createdAt: string;
  completedAt: string | null;
  isSampleData: boolean;
}

export interface ScheduledAudit {
  id: string;
  templateId: string | null;
  name: string;
  layer: AuditLayer;
  standard: AuditStandard;
  assignedTo: string;
  dueDate: string;
  status: 'Upcoming' | 'Overdue' | 'Completed' | 'Cancelled';
  escalationParentAuditId: string | null;
  notificationId: string | null;
  createdAt: string;
}

export type TrainingMaterialType = 'pdf' | 'url';

export interface TrainingMaterial {
  id: string;
  type: TrainingMaterialType;
  title: string;
  uri: string;
}

export interface TrainingRecurrence {
  frequency: RecurrenceFrequency;
  customIntervalDays: number | null;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface QuizResponse {
  questionId: string;
  selectedIndex: number;
}

export interface TrainingQuiz {
  questions: QuizQuestion[];
  responses: QuizResponse[];
  takenAt: string | null;
  scorePercent: number | null;
  passThreshold: number;
  passed: boolean | null;
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
  parentNcrId: string | null;
  templateId: string | null;
  quiz: TrainingQuiz | null;
  createdAt: string;
  isSampleData: boolean;
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
  destinationTeamId: string | null;
  isSampleData: boolean;
}

export interface DetectedPattern {
  id: string;
  title: string;
  summary: string;
  count: number;
  relatedNcrIds: string[];
  suggestedAction: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface PatternsCache {
  generatedAt: string;
  cachedUntil: string;
  patterns: DetectedPattern[];
  sourceHash: string;
}
