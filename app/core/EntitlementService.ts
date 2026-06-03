// EntitlementService — single, app-aware tier/feature gate.
//
// Contract is identical across Root Cause AI and NConform. This is the ONLY
// place gating decisions are made; scattered local checks call these methods.
//
// IMPORTANT: this implementation only CENTRALIZES the existing logic — it reads
// the same source (UserProfile.subscriptionTier) via the same pure helpers in
// utils/subscription.ts and returns the same answers as before. It does NOT
// change what is gated or enable any new enforcement. (Features documented but
// NOT enforced today — One Pager, Audits, Training — stay ungated.)
//
// The cached profile is kept in lock-step with what screens see: useProfile()
// feeds setProfileSnapshot() whenever it loads/saves/updates/clears the profile.
//
// DEFERRED NEXT STEP: back this with server-side, cross-app entitlements from
// the Pro Web Supabase (spanning both apps + the 'proweb' tier).

import { AppId, APP_ID, Tier } from './types';
import { UserProfile } from '../types';
import { Storage } from '../utils/storage';
import { adsEnabled as adsEnabledFor, isBundle as isBundleFor, isProOrBundle } from '../utils/subscription';

export interface EntitlementSnapshot {
  app: AppId;
  tier: Tier;
}

export interface EntitlementService {
  readonly app: AppId;
  getTier(): Promise<Tier>;
  getTierSync(): Tier;
  isPro(): Promise<boolean>;
  isProSync(): boolean;
  isBundle(): Promise<boolean>;
  isBundleSync(): boolean;
  /** True when ads should be shown (free tier only). */
  adsEnabled(): boolean;
  hasFeature(feature: string): Promise<boolean>;
  hasFeatureSync(feature: string): boolean;
  /** App-specific numeric limit; null = unlimited/unknown. */
  getLimit(key: string): number | null;
  refresh(): Promise<Tier>;
  subscribe(listener: (snapshot: EntitlementSnapshot) => void): () => void;
}

class LocalEntitlementService implements EntitlementService {
  readonly app: AppId = APP_ID;
  private profile: UserProfile | null = null;
  private listeners = new Set<(snapshot: EntitlementSnapshot) => void>();

  constructor() {
    void this.refresh();
  }

  private tierOf(): Tier {
    return (this.profile?.subscriptionTier ?? 'free') as Tier;
  }

  private notify(): void {
    const tier = this.tierOf();
    this.listeners.forEach((l) => {
      try {
        l({ app: this.app, tier });
      } catch (e) {
        console.log('EntitlementService listener error', e);
      }
    });
  }

  async getTier(): Promise<Tier> {
    return this.refresh();
  }

  getTierSync(): Tier {
    return this.tierOf();
  }

  async isPro(): Promise<boolean> {
    await this.refresh();
    return this.isProSync();
  }

  isProSync(): boolean {
    return isProOrBundle(this.profile);
  }

  async isBundle(): Promise<boolean> {
    await this.refresh();
    return this.isBundleSync();
  }

  isBundleSync(): boolean {
    return isBundleFor(this.profile);
  }

  adsEnabled(): boolean {
    return adsEnabledFor(this.profile);
  }

  async hasFeature(feature: string): Promise<boolean> {
    await this.refresh();
    return this.hasFeatureSync(feature);
  }

  hasFeatureSync(feature: string): boolean {
    switch (feature) {
      case 'remove_ads':
        return isProOrBundle(this.profile);
      // Currently-enforced Bundle gates.
      case 'user_directory':
      case 'team_sync':
      case 'rca_connection':
        return isBundleFor(this.profile);
      // Everything else (one_pager, audits, training, ...) is ungated today —
      // return true so we never introduce a new gate.
      default:
        return true;
    }
  }

  getLimit(_key: string): number | null {
    return null;
  }

  async refresh(): Promise<Tier> {
    this.profile = await Storage.getProfile();
    const tier = this.tierOf();
    this.notify();
    return tier;
  }

  // Not part of the shared interface — keeps the cached entitlement in sync
  // with the live profile that screens load via useProfile().
  setProfileSnapshot(profile: UserProfile | null): void {
    this.profile = profile;
    this.notify();
  }

  subscribe(listener: (snapshot: EntitlementSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener({ app: this.app, tier: this.tierOf() });
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const entitlements = new LocalEntitlementService();
