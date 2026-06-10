// runFlush — the full, PURE flush pipeline: anonymous/no-key gate, read outbox,
// upload, persist the remaining outbox. SyncEngine.flush() is a thin RN adapter
// that calls this with secure-store + file-outbox providers; the validation
// harness calls it with in-memory providers against the LIVE endpoint. Both run
// the identical logic, so the harness validates exactly what ships.

import type { OutboxEntry, IngestApp, IngestEvent } from './types';
import { uploadOutbox, type UploadStatus } from './uploader';

export interface FlushDeps {
  app: IngestApp;
  endpointBase: string;
  /** The signed-in identity is anonymous/local — must NEVER sync. */
  isAnonymous: boolean;
  /** Securely-stored ingest key, or null when none has been provisioned. */
  getApiKey: () => Promise<string | null>;
  readOutbox: () => Promise<OutboxEntry[]>;
  writeOutbox: (entries: OutboxEntry[]) => Promise<void>;
  fetchFn: typeof fetch;
  mapEvents: (entry: OutboxEntry) => IngestEvent[];
  maxBatch?: number;
  maxRetries?: number;
}

export type FlushStatus =
  | 'anonymous' // gated: anonymous identity, never posts
  | 'no_key' // gated: no provisioned key, never posts
  | 'empty' // nothing queued
  | UploadStatus; // 'ok' | 'no_events' | 'transient'

export interface FlushResult {
  uploaded: number;
  status: FlushStatus;
  /** Pending entries left in the outbox after this flush. */
  pending: number;
  droppedPoison: number;
  /** True if a network/401/402/5xx forced us to keep the outbox for later. */
  transient: boolean;
}

/**
 * Pure gate: only a signed-in (non-anonymous) identity that holds a provisioned
 * key may sync. Free/anonymous users return false and never reach the network.
 */
export function shouldSync(input: {
  isAnonymous: boolean;
  apiKey: string | null;
}): boolean {
  return !input.isAnonymous && !!input.apiKey;
}

export async function runFlush(deps: FlushDeps): Promise<FlushResult> {
  if (deps.isAnonymous) {
    return { uploaded: 0, status: 'anonymous', pending: 0, droppedPoison: 0, transient: false };
  }

  const apiKey = await deps.getApiKey();
  if (!shouldSync({ isAnonymous: deps.isAnonymous, apiKey })) {
    return { uploaded: 0, status: 'no_key', pending: 0, droppedPoison: 0, transient: false };
  }

  const entries = await deps.readOutbox();
  if (entries.length === 0) {
    return { uploaded: 0, status: 'empty', pending: 0, droppedPoison: 0, transient: false };
  }

  const outcome = await uploadOutbox(entries, {
    app: deps.app,
    endpointBase: deps.endpointBase,
    apiKey: apiKey as string,
    fetchFn: deps.fetchFn,
    mapEvents: deps.mapEvents,
    maxBatch: deps.maxBatch,
    maxRetries: deps.maxRetries,
  });

  await deps.writeOutbox(outcome.remaining);

  return {
    uploaded: outcome.uploaded,
    status: outcome.status,
    pending: outcome.remaining.length,
    droppedPoison: outcome.droppedPoison.length,
    transient: outcome.transientFailure,
  };
}
