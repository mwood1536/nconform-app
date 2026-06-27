// useCloudAccount — the UI surface for cloud identity.
//
// Wraps the existing AuthProvider + key provisioning so the AuthGate (and any
// settings UI) can offer a real "Sign in with Google" flow and reflect HONEST
// connection state:
//   * signedIn  — a non-anonymous Supabase identity is active.
//   * email     — that identity's email (shown to the user).
//   * keyProvisioned — an ingest key is in secure-store, i.e. sync can actually
//     run. "Signed in" alone is NOT "connected"; both must be true.
//
// Sign-in runs native Google Sign-In (Android Credential Manager) and exchanges
// the Google ID token with Supabase, then provisions the org ingest key via the
// single deduped entry point (shared with the auth trigger, so no double
// rotation). Sign-out clears the key.

import { useCallback, useEffect, useState } from 'react';
import {
  authProvider,
  isGoogleSignInConfigured,
  type AuthSnapshot,
  type AuthState,
  type AuthUser,
} from '../core/AuthProvider';
import { syncEngine } from '../core/SyncEngine';
import {
  ensureIngestKeyProvisioned,
  getIngestApiKey,
  clearIngestApiKey,
} from '../core/sync/keyStore';

const INGEST_APP = 'nconform' as const;

export interface CloudAccount {
  authState: AuthState;
  user: AuthUser | null;
  signedIn: boolean;
  email: string | null;
  displayName: string | null;
  /** True only when an ingest key exists — i.e. sync can actually run. */
  keyProvisioned: boolean;
  /** Whether this build has Supabase + Google sign-in configured at all. */
  available: boolean;
  busy: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-attempt key provisioning without re-running sign-in (e.g. a failed mint). */
  retryProvision: () => Promise<void>;
}

export function useCloudAccount(): CloudAccount {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>({
    state: authProvider.authState(),
    user: authProvider.currentUser(),
  });
  const [keyProvisioned, setKeyProvisioned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signedIn = snapshot.state === 'signed_in' && snapshot.user?.isAnonymous === false;

  const refreshKey = useCallback(async () => {
    try {
      const key = await getIngestApiKey();
      setKeyProvisioned(!!key);
    } catch {
      setKeyProvisioned(false);
    }
  }, []);

  useEffect(() => {
    const unsub = authProvider.subscribe((snap) => setSnapshot(snap));
    return unsub;
  }, []);

  // Re-read key presence whenever the signed-in state changes (covers a session
  // restored at launch where the key was provisioned in a previous run).
  useEffect(() => {
    if (signedIn) void refreshKey();
    else setKeyProvisioned(false);
  }, [signedIn, refreshKey]);

  const signIn = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await authProvider.signIn('google');
      // Provision the ingest key (deduped with the auth trigger) and reflect it.
      await ensureIngestKeyProvisioned(INGEST_APP);
      await refreshKey();
      // Kick an immediate flush so anything already queued goes up now.
      void syncEngine.flush();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }, [busy, refreshKey]);

  const signOut = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await authProvider.signOut();
      // Drop the ingest key so we can never sync as an anonymous identity. The
      // auth trigger also clears it on the transition; doing it here makes the
      // UI state immediate and is idempotent.
      await clearIngestApiKey();
      setKeyProvisioned(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-out failed.');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const retryProvision = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await ensureIngestKeyProvisioned(INGEST_APP);
      await refreshKey();
      if (ok) void syncEngine.flush();
      else setError('Could not finish cloud setup. Check your connection and try again.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish cloud setup.');
    } finally {
      setBusy(false);
    }
  }, [busy, refreshKey]);

  return {
    authState: snapshot.state,
    user: snapshot.user,
    signedIn,
    email: snapshot.user?.email ?? null,
    displayName: snapshot.user?.displayName ?? null,
    keyProvisioned,
    available: isGoogleSignInConfigured,
    busy,
    error,
    signIn,
    signOut,
    retryProvision,
  };
}
