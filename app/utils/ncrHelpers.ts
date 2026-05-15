import { Colors } from '../constants/colors';
import { NCRStatus, Severity } from '../constants/standards';
import { NCR } from '../types';

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function daysBetween(fromISO: string, toISO: string = nowISO()): number {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function severityColor(severity: Severity): string {
  switch (severity) {
    case 'Low':
      return Colors.severityLow;
    case 'Medium':
      return Colors.severityMedium;
    case 'High':
      return Colors.severityHigh;
    case 'Critical':
      return Colors.severityCritical;
  }
}

export function statusColor(status: NCRStatus): string {
  switch (status) {
    case 'Open':
      return Colors.statusOpen;
    case 'In Progress':
      return Colors.statusInProgress;
    case 'Closed':
      return Colors.statusClosed;
  }
}

export function isOverdue(ncr: NCR): boolean {
  if (ncr.status === 'Closed') return false;
  if (!ncr.dueDate) return false;
  const due = new Date(ncr.dueDate).getTime();
  if (Number.isNaN(due)) return false;
  return Date.now() > due;
}

export function daysOpen(ncr: NCR): number {
  return daysBetween(ncr.createdAt);
}

export function daysOpenColor(days: number): string {
  if (days > 14) return Colors.errorRed;
  if (days > 7) return Colors.amber;
  return Colors.secondaryText;
}

export function ncrSearchMatches(ncr: NCR, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    ncr.ncrNumber.toLowerCase().includes(q) ||
    ncr.title.toLowerCase().includes(q) ||
    ncr.description.toLowerCase().includes(q) ||
    ncr.assignedTo.toLowerCase().includes(q)
  );
}

export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
