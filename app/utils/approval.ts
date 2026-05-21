import { Colors } from '../constants/colors';
import {
  ApprovalComment,
  ApprovalHistoryEntry,
  NCR,
  NCRApprovalStatus,
  NCRApprovalWorkflow,
} from '../types';
import { generateId, nowISO } from './ncrHelpers';

export const ApprovalStatuses: NCRApprovalStatus[] = [
  'Draft',
  'Submitted',
  'Under Review',
  'Approved',
  'Closed',
];

export function approvalStatusColor(status: NCRApprovalStatus): string {
  switch (status) {
    case 'Draft':
      return Colors.secondaryText;
    case 'Submitted':
      return Colors.amber;
    case 'Under Review':
      return Colors.steelBlue;
    case 'Approved':
      return Colors.successGreen;
    case 'Closed':
      return Colors.navy;
  }
}

export function nextApprovalStatuses(current: NCRApprovalStatus): NCRApprovalStatus[] {
  switch (current) {
    case 'Draft':
      return ['Submitted'];
    case 'Submitted':
      return ['Under Review', 'Approved'];
    case 'Under Review':
      return ['Approved', 'Draft'];
    case 'Approved':
      return ['Closed'];
    case 'Closed':
      return [];
  }
}

export function transitionApproval(
  workflow: NCRApprovalWorkflow,
  to: NCRApprovalStatus,
  actor: string,
  note: string = '',
): NCRApprovalWorkflow {
  const entry: ApprovalHistoryEntry = {
    id: generateId('apv'),
    fromStatus: workflow.status,
    toStatus: to,
    actor: actor || 'Unknown',
    timestamp: nowISO(),
    note,
  };
  return {
    status: to,
    history: [...workflow.history, entry],
    comments: workflow.comments,
  };
}

export function addApprovalComment(
  workflow: NCRApprovalWorkflow,
  author: string,
  body: string,
): NCRApprovalWorkflow {
  const comment: ApprovalComment = {
    id: generateId('cmt'),
    author: author || 'Anonymous',
    body,
    timestamp: nowISO(),
  };
  return {
    ...workflow,
    comments: [...workflow.comments, comment],
  };
}

// Map approval status to the simpler NCRStatus that drives metrics + filters.
export function ncrStatusFromApproval(approval: NCRApprovalStatus): NCR['status'] {
  switch (approval) {
    case 'Draft':
    case 'Submitted':
      return 'Open';
    case 'Under Review':
    case 'Approved':
      return 'In Progress';
    case 'Closed':
      return 'Closed';
  }
}
