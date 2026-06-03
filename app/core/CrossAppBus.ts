// CrossAppBus — emit/receive cross-app signals between Root Cause AI and
// NConform (e.g. a safety issue escalated from RCAI into an NConform NCR, a
// 5-Why assignment handed from NConform to RCAI and returned, or a mutual
// data reference).
//
// Contract is identical across both apps. The local implementation is a no-op
// stub for cross-process routing: emit() logs and delivers to in-process
// listeners only, so same-app wiring can be built now. Nothing crosses the app
// boundary yet.
//
// DEFERRED NEXT STEP: route signals through deep links / the Pro Web backend so
// they actually reach the other app.

import { AppId, APP_ID } from './types';

export type CrossAppSignalType =
  | 'safetyIssueEscalated'
  | 'fiveWhyAssigned'
  | 'dataReferenced';

export interface CrossAppSignal<T = unknown> {
  id: string;
  type: CrossAppSignalType;
  source: AppId;
  target: AppId;
  payload: T;
  createdAt: string;
}

export interface CrossAppBus {
  readonly app: AppId;
  emit<T = unknown>(signal: {
    type: CrossAppSignalType;
    target: AppId;
    payload: T;
  }): Promise<CrossAppSignal<T>>;
  on(type: CrossAppSignalType, handler: (signal: CrossAppSignal) => void): () => void;
  subscribe(handler: (signal: CrossAppSignal) => void): () => void;
}

let counter = 0;
const newSignalId = (): string => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

class LocalCrossAppBus implements CrossAppBus {
  readonly app: AppId = APP_ID;
  private all = new Set<(signal: CrossAppSignal) => void>();
  private byType = new Map<CrossAppSignalType, Set<(signal: CrossAppSignal) => void>>();

  async emit<T = unknown>(signal: {
    type: CrossAppSignalType;
    target: AppId;
    payload: T;
  }): Promise<CrossAppSignal<T>> {
    const full: CrossAppSignal<T> = {
      id: newSignalId(),
      source: this.app,
      createdAt: new Date().toISOString(),
      type: signal.type,
      target: signal.target,
      payload: signal.payload,
    };
    // Local no-op routing: cross-app delivery (deep link / cloud) is deferred.
    // Deliver to in-process listeners so wiring can be developed now.
    this.all.forEach((h) => {
      try {
        h(full as CrossAppSignal);
      } catch (e) {
        console.log('CrossAppBus listener error', e);
      }
    });
    this.byType.get(full.type)?.forEach((h) => {
      try {
        h(full as CrossAppSignal);
      } catch (e) {
        console.log('CrossAppBus typed listener error', e);
      }
    });
    console.log(`[CrossAppBus] emit (local stub) ${full.type} -> ${full.target}`);
    return full;
  }

  on(type: CrossAppSignalType, handler: (signal: CrossAppSignal) => void): () => void {
    let set = this.byType.get(type);
    if (!set) {
      set = new Set();
      this.byType.set(type, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  subscribe(handler: (signal: CrossAppSignal) => void): () => void {
    this.all.add(handler);
    return () => {
      this.all.delete(handler);
    };
  }
}

export const crossAppBus: CrossAppBus = new LocalCrossAppBus();
