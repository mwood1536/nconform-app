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

export interface UserProfile {
  name: string;
  company: string;
  role: string;
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

export interface AuditQuestion {
  id: string;
  prompt: string;
  requiresPhoto: boolean;
}

export interface AuditResponse {
  questionId: string;
  result: AuditResponseType | null;
  note: string;
  photo: string | null;
}

export interface AuditTemplate {
  id: string;
  name: string;
  layer: AuditLayer;
  standard: AuditStandard;
  questions: AuditQuestion[];
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
  status: AuditStatus;
  assignedTo: string;
  createdAt: string;
  completedAt: string | null;
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
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
}
