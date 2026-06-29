// AuthProvider — single identity surface for the app.
//
// Identity is CLOUD-ONLY and MANDATORY. Sign-in uses NATIVE Google Sign-In
// (Android Credential Manager via @react-native-google-signin/google-signin):
// we obtain a Google ID token from the account already on the device and
// exchange it with Supabase (auth.signInWithIdToken). There is NO web-redirect
// OAuth path (the old nconform://auth-callback flow is gone) and NO
// anonymous/local identity here — the root AuthGate blocks the app until a real
// session exists (see app/components/auth-gate.tsx).
//
// Sessions persist across launches (Supabase client uses AsyncStorage +
// autoRefreshToken), so a signed-in user relaunching OFFLINE stays signed in.
//
// SURGICAL-GATE NOTE: `provider: 'anonymous'` and the `isAnonymous` flag remain
// in the type below because the sync layer (core/SyncEngine.ts, sync/flush.ts,
// sync/triggers.ts) still branches on them. With the mandatory gate, the app
// body only renders for a non-anonymous session, so while the app is
// interactive currentUser() is non-null and never anonymous. The anonymous
// plumbing in the sync layer is now effectively unreachable — left in place
// intentionally this pass.

import type { Session } from '@supabase/supabase-js';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { AppId, APP_ID } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type AuthState = 'loading' | 'signed_in' | 'signed_out';
export type AuthProviderId = 'anonymous' | 'google' | 'apple';

export interface AuthUser {
  /** Stable Supabase user id once signed in. */
  id: string;
  provider: AuthProviderId;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

export interface AuthSnapshot {
  state: AuthState;
  user: AuthUser | null;
}

export interface AuthProvider {
  readonly app: AppId;
  /** Sign in. Only 'google' is supported in this pass (native Google Sign-In). */
  signIn(provider?: AuthProviderId): Promise<AuthUser>;
  signOut(): Promise<void>;
  currentUser(): AuthUser | null;
  authState(): AuthState;
  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void;
}

// Web OAuth 2.0 client id (the SAME one configured in the Supabase Google
// provider). Required by Google Sign-In to mint an ID token Supabase accepts.
// Baked at build time (EXPO_PUBLIC). If unset, sign-in is unavailable and the
// gate surfaces a clear error rather than failing silently.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const isGoogleSignInConfigured: boolean =
  isSupabaseConfigured && Boolean(GOOGLE_WEB_CLIENT_ID);

let googleConfigured = false;
function configureGoogleSignin(): void {
  if (googleConfigured || !GOOGLE_WEB_CLIENT_ID) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  googleConfigured = true;
}

function providerFromSession(session: Session): AuthProviderId {
  const p = session.user.app_metadata?.provider;
  if (p === 'apple') return 'apple';
  return 'google';
}

class SupabaseAuthProvider implements AuthProvider {
  readonly app: AppId = APP_ID;
  private state: AuthState = 'loading';
  private user: AuthUser | null = null;
  private listeners = new Set<(snapshot: AuthSnapshot) => void>();

  constructor() {
    configureGoogleSignin();
    void this.init();
  }

  private async init(): Promise<void> {
    if (!supabase) {
      // No cloud configured at all — there is no way to sign in. Land on
      // signed_out so the gate shows the (disabled) sign-in screen.
      this.setSignedOut();
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        this.applySession(data.session);
      } else {
        this.setSignedOut();
      }
      // Stay in sync with token refresh and sign-out (including refreshes that
      // fail after an expired offline session).
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session) this.applySession(session);
        else this.setSignedOut();
      });
    } catch (e) {
      if (__DEV__) console.log('[AuthProvider] session restore failed', e);
      this.setSignedOut();
    }
  }

  private setSignedOut(): void {
    this.user = null;
    this.state = 'signed_out';
    this.notify();
  }

  private applySession(session: Session): void {
    const u = session.user;
    const displayName =
      (u.user_metadata?.full_name as string | undefined) ??
      (u.user_metadata?.name as string | undefined) ??
      null;
    this.user = {
      id: u.id,
      provider: providerFromSession(session),
      email: u.email ?? null,
      displayName,
      isAnonymous: false,
    };
    this.state = 'signed_in';
    this.notify();
  }

  private notify(): void {
    const snapshot: AuthSnapshot = { state: this.state, user: this.user };
    this.listeners.forEach((l) => {
      try {
        l(snapshot);
      } catch (e) {
        if (__DEV__) console.log('AuthProvider listener error', e);
      }
    });
  }

  /**
   * Native Google Sign-In → Supabase.
   *
   * Uses the Google account already on the device (Android Credential Manager)
   * to obtain an ID token, then exchanges it with Supabase via
   * signInWithIdToken. NONCE: we deliberately pass no nonce. The google-signin
   * ID token carries no nonce claim, and signInWithIdToken with no nonce is a
   * matching (empty) check — so the Supabase Google provider does NOT need
   * "skip nonce check" enabled.
   */
  private async googleSignIn(): Promise<AuthUser> {
    if (!supabase) {
      throw new Error('Cloud sign-in is unavailable: Supabase is not configured.');
    }
    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error(
        'Google sign-in is not configured: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing in this build.',
      );
    }
    configureGoogleSignin();

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        // User dismissed the account picker.
        throw new Error('Sign-in was cancelled.');
      }
      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error('Google did not return an ID token.');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error || !data.session) {
        throw error ?? new Error('Sign-in did not complete.');
      }

      this.applySession(data.session);
      return this.user as AuthUser;
    } catch (e) {
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED) {
          throw new Error('Sign-in was cancelled.');
        }
        if (e.code === statusCodes.IN_PROGRESS) {
          throw new Error('A sign-in is already in progress.');
        }
        if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Google Play services are required to sign in.');
        }
      }
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  async signIn(provider: AuthProviderId = 'google'): Promise<AuthUser> {
    if (provider !== 'google') {
      throw new Error(`Unsupported sign-in provider: ${provider}`);
    }
    return this.googleSignIn();
  }

  async signOut(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        if (__DEV__) console.log('[AuthProvider] signOut error', e);
      }
    }
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      if (__DEV__) console.log('[AuthProvider] google signOut error', e);
    }
    // onAuthStateChange will also fire, but set it eagerly for an immediate UI.
    this.setSignedOut();
  }

  currentUser(): AuthUser | null {
    return this.user;
  }

  authState(): AuthState {
    return this.state;
  }

  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener({ state: this.state, user: this.user });
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const authProvider: AuthProvider = new SupabaseAuthProvider();
