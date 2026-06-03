// Shared foundation types. The four foundation interfaces (AuthProvider,
// EntitlementService, SyncEngine, CrossAppBus) share IDENTICAL contracts
// across Root Cause AI and NConform; only the local implementations differ.
//
// DEFERRED NEXT STEP: extract core/ into a shared package so both apps import
// these contracts (and swap the local impls for Supabase-backed ones) without
// changing any call sites.

export type AppId = 'rootcauseai' | 'nconform';

// Identity of THIS app. Root Cause AI's copy sets this to 'rootcauseai'.
export const APP_ID: AppId = 'nconform';

// Cross-app entitlement tiers. 'proweb' is the Professional Web plan that the
// Pro Web Supabase backend will own; mobile tiers are free/pro/bundle today.
export type Tier = 'free' | 'pro' | 'bundle' | 'proweb';
