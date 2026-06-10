// uploadOutbox — the REAL upload core, shared by the app's flush() and the
// validation harness. PURE (no expo / react-native): it takes the outbox, an
// event mapper, a fetch impl, and the target endpoint, and returns the new
// outbox state plus stats. The app persists `remaining`; the harness asserts on
// the returned stats.
//
// One outbox entry maps to ZERO OR MORE wire events (mapEvents): RCAI queues
// per-record (1 event), NConform queues whole collections (N events). Poison is
// tracked PER client_id on the entry, so one un-persistable record never drops
// the good records beside it (per-event isolation, mirrored on the client).
//
// Contract (server: POST /api/ingest/{root-cause,nconform}):
//   request  : { batch_id?, events: IngestEvent[] }   (1..maxBatch events)
//   200 body : { ok, received, persisted, failed: [{ index, reason }] }
//              `index` is 0-based WITHIN this batch's events array.
//   401/402  : invalid key / inactive subscription   -> transient (keep outbox)
//   5xx/throw: server or network failure             -> transient (keep outbox)
//
// Idempotency: every event carries client_id (the record's local id). The server
// upserts on (org_id, client_id), so re-sending UPDATES rather than duplicates —
// safe to retry, and safe for NConform to re-send a whole collection each flush.

import type { OutboxEntry, IngestApp, IngestEvent } from './types';

const INGEST_PATH: Record<IngestApp, string> = {
  root_cause_ai: 'root-cause',
  nconform: 'nconform',
};

export const DEFAULT_MAX_BATCH = 500;
export const DEFAULT_MAX_RETRIES = 5;

export interface UploaderDeps {
  app: IngestApp;
  /** Origin only, e.g. https://app.ironstratos.com (trailing slash tolerated). */
  endpointBase: string;
  /** Bearer key. Caller guarantees non-empty (the anonymous gate is upstream). */
  apiKey: string;
  /** Injected so the harness can point at global fetch / a spy. */
  fetchFn: typeof fetch;
  /** entry -> wire events (already excluding droppedClientIds + local-only). */
  mapEvents: (entry: OutboxEntry) => IngestEvent[];
  maxBatch?: number;
  /** Drop a poison client_id once its attempts reach this (default 5). */
  maxRetries?: number;
}

export type UploadStatus = 'ok' | 'no_events' | 'transient';

export interface UploadOutcome {
  /** Count of events the server confirmed persisted this flush. */
  uploaded: number;
  /** New outbox to persist (original order preserved). */
  remaining: OutboxEntry[];
  /** Poison client_ids dropped after maxRetries. */
  droppedPoison: { outboxId: string; clientId: string; reason: string }[];
  /** Entries that currently map to no events (deletes / local-only / all-dropped). */
  droppedUnsyncable: OutboxEntry[];
  transientFailure: boolean;
  status: UploadStatus;
  transientHttpStatus?: number;
}

interface BatchResponse {
  ok?: boolean;
  received?: number;
  persisted?: number;
  failed?: { index: number; reason: string }[];
}

/** A whole-batch failure is global (bad key, dead subscription, server down) —
 *  keep the data and retry later; never blame individual events. */
function isTransientStatus(status: number): boolean {
  // 400 included: a well-formed batch should never 400, so treat it as transient
  // rather than silently discarding real local data.
  return status === 400 || status === 401 || status === 402 || status === 429 || status >= 500;
}

interface Unit {
  entry: OutboxEntry;
  event: IngestEvent;
}

/** Mutable per-entry tally accumulated across batches. */
interface EntryState {
  entry: OutboxEntry;
  totalUnits: number;
  okClientIds: Set<string>;
  failedAttempts: Record<string, number>;
  droppedClientIds: Set<string>;
  retryPending: number; // poison events still under the retry limit
  touchedTransient: boolean; // had a unit in/after the transient stop point
}

export async function uploadOutbox(
  entries: OutboxEntry[],
  deps: UploaderDeps,
): Promise<UploadOutcome> {
  const maxBatch = deps.maxBatch ?? DEFAULT_MAX_BATCH;
  const maxRetries = deps.maxRetries ?? DEFAULT_MAX_RETRIES;
  const url = `${deps.endpointBase.replace(/\/$/, '')}/api/ingest/${INGEST_PATH[deps.app]}`;

  // Expand entries to ordered units; entries mapping to no events are dropped.
  const units: Unit[] = [];
  const state = new Map<string, EntryState>();
  const droppedUnsyncable: OutboxEntry[] = [];
  for (const entry of entries) {
    const events = deps.mapEvents(entry);
    if (events.length === 0) {
      droppedUnsyncable.push(entry);
      continue;
    }
    state.set(entry.outboxId, {
      entry,
      totalUnits: events.length,
      okClientIds: new Set(),
      failedAttempts: { ...(entry.failedAttempts ?? {}) },
      droppedClientIds: new Set(entry.droppedClientIds ?? []),
      retryPending: 0,
      touchedTransient: false,
    });
    for (const event of events) units.push({ entry, event });
  }

  if (units.length === 0) {
    return {
      uploaded: 0,
      remaining: [],
      droppedPoison: [],
      droppedUnsyncable,
      transientFailure: false,
      status: 'no_events',
    };
  }

  let uploaded = 0;
  const droppedPoison: { outboxId: string; clientId: string; reason: string }[] = [];
  let transientFailure = false;
  let transientHttpStatus: number | undefined;
  let stopUnitIndex = units.length; // first unprocessed unit if we stop early

  for (let start = 0; start < units.length && !transientFailure; start += maxBatch) {
    const batch = units.slice(start, start + maxBatch);
    const body = JSON.stringify({
      batch_id: `${deps.app}-${batch[0].entry.outboxId}-${start}`,
      events: batch.map((u) => u.event),
    });

    let res: Response;
    try {
      res = await deps.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deps.apiKey}`,
        },
        body,
      });
    } catch {
      transientFailure = true;
      stopUnitIndex = start;
      break;
    }

    if (isTransientStatus(res.status)) {
      transientFailure = true;
      transientHttpStatus = res.status;
      stopUnitIndex = start;
      break;
    }

    let parsed: BatchResponse = {};
    try {
      parsed = (await res.json()) as BatchResponse;
    } catch {
      transientFailure = true;
      transientHttpStatus = res.status;
      stopUnitIndex = start;
      break;
    }

    const failedIdx = new Map<number, string>();
    for (const f of parsed.failed ?? []) failedIdx.set(f.index, f.reason);

    batch.forEach((unit, i) => {
      const st = state.get(unit.entry.outboxId)!;
      const clientId = String(unit.event.client_id ?? '');
      const reason = failedIdx.get(i);
      if (reason === undefined) {
        uploaded += 1;
        st.okClientIds.add(clientId);
        return;
      }
      const attempts = (st.failedAttempts[clientId] ?? 0) + 1;
      st.failedAttempts[clientId] = attempts;
      if (attempts >= maxRetries) {
        st.droppedClientIds.add(clientId);
        droppedPoison.push({ outboxId: unit.entry.outboxId, clientId, reason });
      } else {
        st.retryPending += 1;
      }
    });
  }

  // Mark every entry that had a unit at/after the stop point as transient-touched
  // so we keep it untouched and re-send next flush (idempotent).
  if (transientFailure) {
    for (let i = stopUnitIndex; i < units.length; i += 1) {
      state.get(units[i].entry.outboxId)!.touchedTransient = true;
    }
  }

  // Decide each entry's fate, preserving original order.
  const remaining: OutboxEntry[] = [];
  for (const entry of entries) {
    const st = state.get(entry.outboxId);
    if (!st) continue; // was unsyncable -> dropped

    if (st.touchedTransient) {
      // Some/all of its events weren't processed — keep verbatim, retry later.
      remaining.push(entry);
      continue;
    }

    if (st.retryPending > 0) {
      // Still has poison events under the retry limit — keep with bumped counters.
      remaining.push({
        ...entry,
        failedAttempts: st.failedAttempts,
        droppedClientIds: Array.from(st.droppedClientIds),
      });
      continue;
    }

    // Every event resolved this flush (persisted or permanently dropped) -> done.
  }

  return {
    uploaded,
    remaining,
    droppedPoison,
    droppedUnsyncable,
    transientFailure,
    status: transientFailure ? 'transient' : 'ok',
    transientHttpStatus,
  };
}
