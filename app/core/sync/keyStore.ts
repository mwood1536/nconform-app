// Secure storage for the org's ingest API key. Uses expo-secure-store (Keychain
// on iOS / Keystore-backed EncryptedSharedPreferences on Android) — NEVER
// AsyncStorage or a plaintext file, because the key authorizes writes to the
// org's cloud data. Anonymous/free users never provision a key, so flush() is
// gated off for them (see flush.ts shouldSync).

import * as SecureStore from 'expo-secure-store';
import { INGEST_BASE_URL } from './config';

const INGEST_KEY_SLOT = 'ironstratos_ingest_api_key';

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
  app: 'root_cause_ai' | 'nconform',
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
