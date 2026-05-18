export const Industries = [
  'Automotive Manufacturing',
  'Aerospace',
  'General Manufacturing',
  'Food & Beverage',
  'Medical Devices',
  'Other',
] as const;

export const QualityStandards = [
  'ISO 9001',
  'IATF 16949',
  'AS9100',
  'Multiple Standards',
  'None / Just Getting Started',
] as const;

export const TeamSizes = [
  'Just me',
  '2-5 people',
  '6-20 people',
  '20+ people',
] as const;

export const Challenges = [
  'Audit preparation',
  'Corrective action backlog',
  'Recurring defects',
  'Documentation gaps',
  'All of the above',
] as const;

export const DetectionPoints = [
  'Incoming Inspection',
  'In-Process',
  'Final Inspection',
  'Customer Return',
  'Internal Audit',
  'Other',
] as const;

export const Severities = ['Low', 'Medium', 'High', 'Critical'] as const;

export const StandardReferences = [
  'ISO 9001 Clause',
  'IATF Requirement',
  'AS9100 Clause',
  'N/A',
] as const;

export const NCRStatuses = ['Open', 'In Progress', 'Closed'] as const;
export const ActionStatuses = ['Pending', 'In Progress', 'Completed'] as const;

export const AuditLayers = [
  'Layer 1 — Operator',
  'Layer 2 — Supervisor',
  'Layer 3 — Manager',
] as const;

export const AuditStandards = [
  'ISO 9001',
  'IATF 16949',
  'AS9100',
  'OSHA',
] as const;

export const AuditResponseTypes = ['Pass', 'Fail', 'N/A'] as const;

export const AuditStatuses = ['Scheduled', 'In Progress', 'Completed'] as const;

export const TrainingStatuses = ['Pending', 'Complete', 'Overdue'] as const;

export type Industry = (typeof Industries)[number];
export type QualityStandard = (typeof QualityStandards)[number];
export type TeamSize = (typeof TeamSizes)[number];
export type Challenge = (typeof Challenges)[number];
export type DetectionPoint = (typeof DetectionPoints)[number];
export type Severity = (typeof Severities)[number];
export type StandardReference = (typeof StandardReferences)[number];
export type NCRStatus = (typeof NCRStatuses)[number];
export type ActionStatus = (typeof ActionStatuses)[number];
export type AuditLayer = (typeof AuditLayers)[number];
export type AuditStandard = (typeof AuditStandards)[number];
export type AuditResponseType = (typeof AuditResponseTypes)[number];
export type AuditStatus = (typeof AuditStatuses)[number];
export type TrainingStatus = (typeof TrainingStatuses)[number];
