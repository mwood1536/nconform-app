// Foundation layer barrel. The four contracts (AuthProvider, EntitlementService,
// SyncEngine, CrossAppBus) are identical across Root Cause AI and NConform; only
// the local implementations differ. Import singletons from here:
//
//   import { entitlements, syncEngine, authProvider, crossAppBus } from '../core';
//
// Note: utils/storage.ts imports the sync engine from './core/SyncEngine'
// directly (not this barrel) to keep module init order simple.

export * from './types';
export * from './AuthProvider';
export * from './EntitlementService';
export * from './SyncEngine';
export * from './CrossAppBus';
