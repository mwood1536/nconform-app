// Outbox + sync wire types — PURE module (no expo / react-native imports) so it
// can be imported both by the React Native app and by a plain Node validation
// harness. SyncEngine.ts re-exports these for back-compat with existing imports.

export type SyncOp = 'create' | 'update' | 'delete';

export interface SyncMutation {
  /** Logical entity/collection name, e.g. 'investigation' or 'ncrs'. */
  entity: string;
  op: SyncOp;
  /** Record id, or collection key for whole-collection writes. */
  id: string;
  /** Record/collection snapshot. Omitted for deletes. */
  payload?: unknown;
}

export interface OutboxEntry extends SyncMutation {
  outboxId: string;
  app: 'rootcauseai' | 'nconform';
  queuedAt: string;
  status: 'pending';
  /**
   * Per-event poison counter, keyed by the event's client_id. One outbox entry
   * can expand to many events (NConform writes whole collections), so attempts
   * are tracked per record, not per entry. Bumped ONLY when a client_id comes
   * back in the server's per-event `failed[]`; transient/whole-batch failures
   * (offline, 401/402/5xx) never touch it. Absent == 0.
   */
  failedAttempts?: Record<string, number>;
  /**
   * client_ids dropped as poison after reaching the retry limit. The event
   * mapper skips these so a single un-persistable record can never block the
   * rest of the entry's records (per-event isolation, mirrored client-side).
   */
  droppedClientIds?: string[];
}

/** The two ingest apps, as the server's path + key scope name them. */
export type IngestApp = 'root_cause_ai' | 'nconform';

/** A validated wire event. `type` selects the server's discriminated union; the
 *  rest is the event body. `client_id` is the universal idempotency key. */
export interface IngestEvent {
  type: string;
  client_id?: string;
  [key: string]: unknown;
}
