// SyncEngine — single write path with a local outbox.
//
// Contract is identical across Root Cause AI and NConform. Every local write
// goes through write(): it persists locally FIRST (offline-first source of
// truth) and then appends a pending outbox entry.
//
// This NConform implementation persists the outbox in AsyncStorage (matching
// the data store). RCAI's copy persists it as a JSON file (expo-file-system).
//
// NConform's data store writes whole collections (e.g. setNCRs(array)), so
// outbox granularity here is per-collection-write; the event mapper expands each
// collection entry to one wire event per record (see sync/events.ts).
//
// flush() now uploads the outbox to the Pro Web Supabase ingest endpoint via the
// pure runFlush() pipeline (core/sync/*): gated to signed-in, non-anonymous users
// holding a provisioned key, retrying transient failures with exponential backoff
// and dropping poison events so they can never block the queue. The upload logic
// lives in core/sync/uploader + flush so the validation harness exercises the
// exact same code path.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_ID } from './types';
import type { OutboxEntry } from './sync/types';
import { runFlush, type FlushResult } from './sync/flush';
import { toIngestEvents } from './sync/events';
import { getIngestApiKey } from './sync/keyStore';
import { authProvider } from './AuthProvider';
import {
  INGEST_BASE_URL,
  MAX_BATCH,
  MAX_RETRIES,
  WRITE_DEBOUNCE_MS,
  BACKOFF_MIN_MS,
  BACKOFF_MAX_MS,
} from './sync/config';

// Re-export the (now pure) outbox types so existing imports keep working.
export type { SyncOp, SyncMutation, OutboxEntry } from './sync/types';
import type { SyncMutation } from './sync/types';

export interface SyncEngine {
  readonly app: typeof APP_ID;
  write(mutation: SyncMutation, persist: () => Promise<void>): Promise<void>;
  getOutbox(): Promise<OutboxEntry[]>;
  pendingCount(): Promise<number>;
  flush(): Promise<{ uploaded: number }>;
  clearOutbox(): Promise<void>;
  subscribe(listener: (pendingCount: number) => void): () => void;
}

const OUTBOX_KEY = 'sync_outbox';

let counter = 0;
const newOutboxId = (): string => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

class LocalSyncEngine implements SyncEngine {
  readonly app = APP_ID;
  private listeners = new Set<(pendingCount: number) => void>();
  private flushing: Promise<{ uploaded: number }> | null = null;
  private backoffMs = BACKOFF_MIN_MS;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

  async getOutbox(): Promise<OutboxEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(OUTBOX_KEY);
      return raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
    } catch (e) {
      console.log('SyncEngine getOutbox error', e);
      return [];
    }
  }

  private async writeOutbox(entries: OutboxEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
    } catch (e) {
      console.log('SyncEngine writeOutbox error', e);
    }
  }

  private notify(pendingCount: number): void {
    this.listeners.forEach((l) => {
      try {
        l(pendingCount);
      } catch (e) {
        console.log('SyncEngine listener error', e);
      }
    });
  }

  async write(mutation: SyncMutation, persist: () => Promise<void>): Promise<void> {
    // Local persistence is the source of truth — always runs, even offline.
    await persist();
    try {
      const entries = await this.getOutbox();
      entries.push({
        ...mutation,
        outboxId: newOutboxId(),
        app: this.app,
        queuedAt: new Date().toISOString(),
        status: 'pending',
      });
      await this.writeOutbox(entries);
      this.notify(entries.length);
      this.scheduleWriteFlush();
    } catch (e) {
      // Outbox is best-effort; a failure here must never break a local write.
      console.log('SyncEngine append error', e);
    }
  }

  async pendingCount(): Promise<number> {
    return (await this.getOutbox()).length;
  }

  /** Public flush — dedupes concurrent callers (foreground + post-write races). */
  async flush(): Promise<{ uploaded: number }> {
    if (this.flushing) return this.flushing;
    this.flushing = this.doFlush().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async doFlush(): Promise<{ uploaded: number }> {
    let result: FlushResult;
    try {
      result = await runFlush({
        app: 'nconform',
        endpointBase: INGEST_BASE_URL,
        isAnonymous: authProvider.currentUser()?.isAnonymous ?? true,
        getApiKey: getIngestApiKey,
        readOutbox: () => this.getOutbox(),
        writeOutbox: (e) => this.writeOutbox(e),
        fetchFn: fetch,
        mapEvents: toIngestEvents,
        maxBatch: MAX_BATCH,
        maxRetries: MAX_RETRIES,
      });
    } catch (e) {
      console.log('SyncEngine flush error', e);
      this.scheduleRetry();
      return { uploaded: 0 };
    }

    this.notify(result.pending);

    if (result.transient) {
      this.scheduleRetry();
    } else {
      this.backoffMs = BACKOFF_MIN_MS;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
    }
    return { uploaded: result.uploaded };
  }

  private scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const delay = this.backoffMs;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush();
    }, delay);
    this.backoffMs = Math.min(this.backoffMs * 2, BACKOFF_MAX_MS);
  }

  private scheduleWriteFlush(): void {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      void this.flush();
    }, WRITE_DEBOUNCE_MS);
  }

  async clearOutbox(): Promise<void> {
    await this.writeOutbox([]);
    this.notify(0);
  }

  subscribe(listener: (pendingCount: number) => void): () => void {
    this.listeners.add(listener);
    void this.pendingCount().then((n) => listener(n));
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const syncEngine: SyncEngine = new LocalSyncEngine();
