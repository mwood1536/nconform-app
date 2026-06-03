// AuthProvider — single identity surface for the app.
//
// Contract is identical across Root Cause AI and NConform. The local
// implementation today is an anonymous, on-device identity (no account, no
// network), matching current behavior where identity is just a local profile.
//
// DEFERRED NEXT STEP: replace LocalAuthProvider with a Supabase-backed
// implementation that performs Google + Apple OAuth and yields ONE identity
// shared across both apps. Call sites already depend only on this interface,
// so that swap requires no screen changes.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppId, APP_ID } from './types';

export type AuthState = 'loading' | 'signed_in' | 'signed_out';
export type AuthProviderId = 'anonymous' | 'google' | 'apple';

export interface AuthUser {
  /** Stable id. Anonymous/local today; Supabase user id once OAuth lands. */
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
  /** Sign in. provider selects Google/Apple later; anonymous is the default. */
  signIn(provider?: AuthProviderId): Promise<AuthUser>;
  signOut(): Promise<void>;
  currentUser(): AuthUser | null;
  authState(): AuthState;
  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void;
}

const ANON_ID_KEY = 'ironstratos_auth_anon_id';

class LocalAuthProvider implements AuthProvider {
  readonly app: AppId = APP_ID;
  private state: AuthState = 'loading';
  private user: AuthUser | null = null;
  private listeners = new Set<(snapshot: AuthSnapshot) => void>();

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
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

  async signIn(provider: AuthProviderId = 'anonymous'): Promise<AuthUser> {
    // Local stub: real Google/Apple OAuth (via Supabase) is a deferred step.
    // Returns the persistent anonymous identity so callers can integrate now.
    if (provider !== 'anonymous') {
      console.log(`[AuthProvider] ${provider} OAuth not wired yet — using anonymous identity (stub).`);
    }
    if (!this.user) {
      await this.init();
    } else {
      this.state = 'signed_in';
      this.notify();
    }
    return this.user as AuthUser;
  }

  async signOut(): Promise<void> {
    this.state = 'signed_out';
    this.user = null;
    this.notify();
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

export const authProvider: AuthProvider = new LocalAuthProvider();
