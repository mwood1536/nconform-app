// AuthProvider — single identity surface for the app.
//
// Contract is identical across Root Cause AI and NConform. This implementation
// is Supabase-backed:
//   * The app's default identity stays ANONYMOUS / on-device — free tier never
//     has to sign in, exactly like before. currentUser() is always non-null.
//   * signIn('google' | 'apple') runs a REAL Supabase OAuth flow (opt-in, only
//     when a user chooses cloud / Bundle). On success the cloud identity
//     replaces the anonymous one; sessions persist across launches.
//   * signOut() ends the cloud session and falls back to the anonymous
//     identity, so the app keeps working locally.
//
// The public interface below is unchanged from the previous local stub, so no
// call site needs to change.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { AppId, APP_ID } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type AuthState = 'loading' | 'signed_in' | 'signed_out';
export type AuthProviderId = 'anonymous' | 'google' | 'apple';

export interface AuthUser {
  /** Stable id. Anonymous/local by default; Supabase user id once signed in. */
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
  /** Sign in. 'google'/'apple' run real OAuth; 'anonymous' is the default. */
  signIn(provider?: AuthProviderId): Promise<AuthUser>;
  signOut(): Promise<void>;
  currentUser(): AuthUser | null;
  authState(): AuthState;
  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void;
}

const ANON_ID_KEY = 'ironstratos_auth_anon_id';
// App URL scheme used as the OAuth redirect target. APP_ID matches the scheme
// declared in each app's app.json ('rootcauseai' / 'nconform').
const APP_SCHEME = APP_ID;

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
    void this.init();
  }

  private async init(): Promise<void> {
    // Always establish the anonymous local identity first so the app is usable
    // immediately and offline, regardless of cloud state.
    await this.ensureAnonymous();

    if (supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          this.applySession(data.session);
        }
        // Stay in sync with token refresh and external sign-out.
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session) this.applySession(session);
          else void this.ensureAnonymous();
        });
      } catch (e) {
        console.log('[AuthProvider] session restore failed', e);
      }
    }
  }

  private async ensureAnonymous(): Promise<void> {
    try {
      let id = await AsyncStorage.getItem(ANON_ID_KEY);
      if (!id) {
        id = `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        await AsyncStorage.setItem(ANON_ID_KEY, id);
      }
      this.user = { id, provider: 'anonymous', email: null, displayName: null, isAnonymous: true };
    } catch {
      this.user = { id: 'anon-local', provider: 'anonymous', email: null, displayName: null, isAnonymous: true };
    }
    this.state = 'signed_in';
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
        console.log('AuthProvider listener error', e);
      }
    });
  }

  /** Open the provider's consent page and resolve with the auth code captured
   *  from the deep-link redirect back into the app. */
  private openAndAwaitCode(authUrl: string, redirectTo: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        sub.remove();
        fn();
      };
      const sub = Linking.addEventListener('url', ({ url }) => {
        if (!url.startsWith(redirectTo)) return;
        let code: string | null = null;
        try {
          code = new URL(url).searchParams.get('code');
        } catch {
          code = null;
        }
        finish(() =>
          code ? resolve(code) : reject(new Error('No authorization code in redirect.')),
        );
      });
      Linking.openURL(authUrl).catch((e) =>
        finish(() => reject(e instanceof Error ? e : new Error(String(e)))),
      );
    });
  }

  private async oauthSignIn(provider: 'google' | 'apple'): Promise<AuthUser> {
    if (!supabase) {
      throw new Error('Cloud sign-in is unavailable: Supabase is not configured.');
    }
    const redirectTo = `${APP_SCHEME}://auth-callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      throw error ?? new Error('Could not start sign-in.');
    }

    const code = await this.openAndAwaitCode(data.url, redirectTo);
    const { data: exchanged, error: exchangeErr } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeErr || !exchanged.session) {
      throw exchangeErr ?? new Error('Sign-in did not complete.');
    }

    this.applySession(exchanged.session);
    return this.user as AuthUser;
  }

  async signIn(provider: AuthProviderId = 'anonymous'): Promise<AuthUser> {
    if (provider === 'anonymous') {
      await this.ensureAnonymous();
      return this.user as AuthUser;
    }
    if (!isSupabaseConfigured) {
      console.log(
        `[AuthProvider] ${provider} sign-in requested but Supabase is not configured — staying anonymous.`,
      );
      await this.ensureAnonymous();
      return this.user as AuthUser;
    }
    return this.oauthSignIn(provider);
  }

  async signOut(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.log('[AuthProvider] signOut error', e);
      }
    }
    // Free tier stays local: drop back to the anonymous on-device identity.
    await this.ensureAnonymous();
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
