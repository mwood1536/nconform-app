import {
  ActionStatus,
  Challenge,
  DetectionPoint,
  Industry,
  NCRStatus,
  QualityStandard,
  Severity,
  StandardReference,
  TeamSize,
} from '../constants/standards';

export type SubscriptionTier = 'free' | 'pro' | 'team';

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
