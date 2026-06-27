// Sync triggers (RN). Installs the three flush triggers the spec calls for:
//   1. app foreground   (AppState -> 'active')
//   2. successful cloud sign-in (provision key, then flush)
//   3. after a write    (debounced inside SyncEngine.write)
// Anonymous users never trigger a network flush — runFlush() gates on identity +
// key, and we additionally skip provisioning/flush for the anonymous identity.
//
// Call installSyncTriggers() once from the app root (see App.tsx).

import { AppState, type AppStateStatus } from 'react-native';
import { authProvider, type AuthSnapshot } from '../AuthProvider';
import { syncEngine } from '../SyncEngine';
import { ensureIngestKeyProvisioned, clearIngestApiKey } from './keyStore';

const INGEST_APP = 'nconform' as const;

async function onSignedIn(): Promise<void> {
  try {
    // Deduped with the sign-in UI's provision call (single in-flight) so a
    // sign-in never rotates the key twice.
    await ensureIngestKeyProvisioned(INGEST_APP);
  } catch (e) {
    console.log('[syncTriggers] provision error', e);
  }
  void syncEngine.flush();
}

export function installSyncTriggers(): () => void {
  const onAppState = (state: AppStateStatus): void => {
    if (state === 'active') void syncEngine.flush();
  };
  const appStateSub = AppState.addEventListener('change', onAppState);

  let wasSignedIn = false;
  const unsubAuth = authProvider.subscribe((snap: AuthSnapshot) => {
    const signedIn = snap.state === 'signed_in' && snap.user?.isAnonymous === false;
    if (signedIn && !wasSignedIn) {
      wasSignedIn = true;
      void onSignedIn();
    } else if (!signedIn && wasSignedIn) {
      wasSignedIn = false;
      void clearIngestApiKey();
    }
  });

  return () => {
    appStateSub.remove();
    unsubAuth();
  };
}
