// Secure storage for the org's ingest API key. Uses expo-secure-store (Keychain
// on iOS / Keystore-backed EncryptedSharedPreferences on Android) — NEVER
// AsyncStorage or a plaintext file, because the key authorizes writes to the
// org's cloud data. Anonymous/free users never provision a key, so flush() is
// gated off for them (see flush.ts shouldSync).

import * as SecureStore from 'expo-secure-store';
import { INGEST_BASE_URL } from './config';
import { supabase } from '../supabaseClient';

const INGEST_KEY_SLOT = 'ironstratos_ingest_api_key';

export type IngestAppId = 'root_cause_ai' | 'nconform';

export async function getIngestApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(INGEST_KEY_SLOT);
  } catch (e) {
    console.log('[keyStore] read error', e);
    return null;
  }
}

export async function setIngestApiKey(plaintext: string): Promise<void> {
  await SecureStore.setItemAsync(INGEST_KEY_SLOT, plaintext);
}

export async function clearIngestApiKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(INGEST_KEY_SLOT);
  } catch (e) {
    console.log('[keyStore] clear error', e);
  }
}

/**
 * Obtain and securely store the org's ingest key after a cloud sign-in.
 *
 * The plaintext key only ever exists at mint time, so the device asks the Pro
 * Web backend to mint/return its app key, authenticated by the user's Supabase
 * access token. The endpoint mints once and is idempotent per (org, app). On any
 * failure we leave the keystore untouched and stay in the safe no-sync state —
 * provisioning simply retries on the next sign-in / foreground.
 *
 * NOTE: this calls POST {INGEST_BASE_URL}/api/keys/provision, the mobile
 * counterpart to the existing admin-cookie POST /api/keys. Until that endpoint
 * ships, setIngestApiKey() (paste a dashboard-minted key) is the provisioning
 * path; the secure-store + gate + flush logic below is unaffected either way.
 */
export async function provisionIngestKey(
  supabaseAccessToken: string,
  app: IngestAppId,
): Promise<boolean> {
  try {
    const res = await fetch(`${INGEST_BASE_URL}/api/keys/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAccessToken}`,
      },
      body: JSON.stringify({ app }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { key?: { plaintext?: string } };
    const plaintext = data.key?.plaintext;
    if (!plaintext) return false;
    await setIngestApiKey(plaintext);
    return true;
  } catch (e) {
    console.log('[keyStore] provision error', e);
    return false;
  }
}

// Single, concurrency-safe entry point for provisioning. Both the sign-in UI
// (hooks/use-cloud-account) and the auth trigger (core/sync/triggers.ts) call
// this on a sign-in, so it MUST NOT provision twice: the server rotates the key
// on every provision (revoke old + mint new — see provisionMobileKey), so a
// double call would leave one device holding a key the server has revoked.
//
// Guarantees:
//   * If a key already exists in secure-store, it is kept (we clear it on
//     sign-out, so a present key always belongs to the current identity).
//   * Concurrent callers share ONE in-flight provision (no double rotation).
let provisionInFlight: Promise<boolean> | null = null;

export function ensureIngestKeyProvisioned(app: IngestAppId): Promise<boolean> {
  if (provisionInFlight) return provisionInFlight;
  provisionInFlight = (async () => {
    try {
      const existing = await getIngestApiKey();
      if (existing) return true;
      if (!supabase) return false;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return false;
      return await provisionIngestKey(token, app);
    } catch (e) {
      console.log('[keyStore] ensureProvision error', e);
      return false;
    } finally {
      provisionInFlight = null;
    }
  })();
  return provisionInFlight;
}
