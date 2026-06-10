// events.ts (NConform) — maps outbox entries to nconform wire events. PURE
// (no expo). NConform's outbox is per-COLLECTION (the whole array is the
// payload), so one entry expands to MANY events — one per record — each keyed by
// its own client_id (the record id) for idempotent upserts. Records flagged
// isSampleData stay local (demo data never pollutes the cloud org), and records
// whose client_id was dropped as poison are skipped.
//
// Syncable collections -> wire type:
//   ncrs -> ncr   audits -> audit   trainingRecords -> training_record
//   safetyObservations -> safety_observation
// Everything else (profile, actions, templates, schedules, prefs, …) is local-only.

import type { OutboxEntry, IngestEvent } from './types';

type Rec = Record<string, unknown>;

const asRec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : []);
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;
const nonEmpty = (v: unknown, fallback: string): string => str(v) ?? fallback;

const SEVERITY = new Set(['low', 'medium', 'high', 'critical']);
function severity(v: unknown, fallback: string): string {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  return SEVERITY.has(s) ? s : fallback;
}

/** Full ISO datetime -> YYYY-MM-DD (the wire's isoDate). */
function isoDate(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length < 10) return undefined;
  const d = v.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
}

const NCR_STATUS: Record<string, string> = {
  Open: 'open',
  'In Progress': 'investigating',
  Closed: 'closed',
};
const AUDIT_STATUS: Record<string, string> = {
  Scheduled: 'scheduled',
  'In Progress': 'in_progress',
  Completed: 'completed',
};
const AUDIT_STANDARD: Record<string, string> = {
  'ISO 9001': 'iso9001',
  'IATF 16949': 'iatf16949',
  AS9100: 'as9100',
};

function ncrEvent(r: Rec): IngestEvent {
  const status = NCR_STATUS[String(r.status)] ?? 'open';
  return {
    type: 'ncr',
    client_id: String(r.id),
    ncr_number: nonEmpty(r.ncrNumber, String(r.id)),
    title: nonEmpty(r.title, 'Untitled NCR'),
    ...(str(r.description) ? { description: str(r.description) } : {}),
    severity: severity(r.severity, 'medium'),
    status,
    ...(status === 'closed' && str(r.updatedAt) ? { closed_at: str(r.updatedAt) } : {}),
  };
}

function auditEvent(r: Rec): IngestEvent {
  const standard = AUDIT_STANDARD[String(r.standard)];
  const completed = isoDate(r.completedAt);
  return {
    type: 'audit',
    client_id: String(r.id),
    audit_number: String(r.id),
    audit_type: 'lpa', // NConform's audit module is layered process audits
    title: nonEmpty(r.name, 'Untitled audit'),
    ...(standard ? { standard } : {}),
    status: AUDIT_STATUS[String(r.status)] ?? 'scheduled',
    ...(completed ? { completed_date: completed } : {}),
    ...(typeof r.weightedPassRate === 'number'
      ? { score: r.weightedPassRate }
      : typeof r.passRate === 'number'
        ? { score: r.passRate }
        : {}),
  };
}

function trainingEvent(r: Rec): IngestEvent {
  const completed = isoDate(r.dateCompleted);
  const expires = isoDate(r.certificationExpiresOn);
  return {
    type: 'training_record',
    client_id: String(r.id),
    course_name: nonEmpty(r.topic, 'Training'),
    status: String(r.status) === 'Overdue' ? 'expired' : 'current',
    ...(completed ? { completed_date: completed } : {}),
    ...(expires ? { expires_date: expires } : {}),
  };
}

function safetyEvent(r: Rec): IngestEvent {
  return {
    type: 'safety_observation',
    client_id: String(r.id),
    observation_number: String(r.id),
    title: nonEmpty(r.description, 'Safety observation'),
    ...(str(r.description) ? { description: str(r.description) } : {}),
    severity: 'medium',
    status: 'open',
    ...(str(r.location) ? { location: str(r.location) } : {}),
  };
}

const COLLECTION: Record<string, (r: Rec) => IngestEvent> = {
  ncrs: ncrEvent,
  audits: auditEvent,
  trainingRecords: trainingEvent,
  safetyObservations: safetyEvent,
};

/**
 * Outbox entry -> wire events. Expands a collection write to one event per
 * record, skipping demo records, deletes, dropped-poison client_ids, and any
 * record without a stable id. Non-syncable collections return [].
 */
export function toIngestEvents(entry: OutboxEntry): IngestEvent[] {
  if (entry.op === 'delete') return []; // server is upsert-only
  const make = COLLECTION[entry.entity];
  if (!make) return []; // local-only collection
  const dropped = new Set(entry.droppedClientIds ?? []);
  return arr(entry.payload)
    .filter((r) => str(r.id) && r.isSampleData !== true && !dropped.has(String(r.id)))
    .map((r) => make(r));
}
