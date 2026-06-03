// SyncEngine — single write path with a local outbox.
//
// Contract is identical across Root Cause AI and NConform. Every local write
// goes through write(): it persists locally FIRST (offline-first source of
// truth) and then appends a pending outbox entry.
//
// This NConform implementation persists the outbox in AsyncStorage (matching
// the data store). RCAI's copy persists it as a JSON file (expo-file-system).
// Same interface, app-appropriate backend.
//
// NOTE: NConform's data store writes whole collections (e.g. setNCRs(array)),
// so outbox granularity here is per-collection-write (op 'update', id = the
// collection key), whereas RCAI queues per-record. Both go through this one
// interface.
//
// DEFERRED NEXT STEP: implement flush() to upload pending entries to the Pro
// Web Supabase ingest endpoint and mark them synced. Today flush() is a no-op.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppId, APP_ID } from './types';

export type SyncOp = 'create' | 'update' | 'delete';

export interface SyncMutation {
  /** Logical entity/collection name, e.g. 'ncrs' or 'userProfile'. */
  entity: string;
  op: SyncOp;
  /** Record id, or collection key for whole-collection writes. */
  id: string;
  /** Record/collection snapshot. Omitted for deletes. */
  payload?: unknown;
}

export interface OutboxEntry extends SyncMutation {
  outboxId: string;
  app: AppId;
  queuedAt: string;
  status: 'pending';
}

export interface SyncEngine {
  readonly app: AppId;
  /** Persist locally via `persist`, then queue a pending outbox entry. */
  write(mutation: SyncMutation, persist: () => Promise<void>): Promise<void>;
  getOutbox(): Promise<OutboxEntry[]>;
  pendingCount(): Promise<number>;
  /** Upload pending entries. No-op today (cloud sync is deferred). */
  flush(): Promise<{ uploaded: number }>;
  clearOutbox(): Promise<void>;
  subscribe(listener: (pendingCount: number) => void): () => void;
}

const OUTBOX_KEY = 'sync_outbox';

let counter = 0;
const newOutboxId = (): string => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

class LocalSyncEngine implements SyncEngine {
  readonly app: AppId = APP_ID;
  private listeners = new Set<(pendingCount: number) => void>();

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
    } catch (e) {
      // Outbox is best-effort; a failure here must never break a local write.
      console.log('SyncEngine append error', e);
    }
  }

  async pendingCount(): Promise<number> {
    return (await this.getOutbox()).length;
  }

  async flush(): Promise<{ uploaded: number }> {
    // No upload yet — cloud sync to the Pro Web Supabase is a deferred step.
    return { uploaded: 0 };
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
