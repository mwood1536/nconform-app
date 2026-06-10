// Sync configuration. The ingest origin is overridable at build time via
// EXPO_PUBLIC_INGEST_URL (baked into the bundle like the other EXPO_PUBLIC vars)
// and defaults to the deployed Pro Web app. No secrets live here — the API key
// is provisioned at runtime and kept in the secure keystore (see keyStore.ts).

export const INGEST_BASE_URL: string =
  process.env.EXPO_PUBLIC_INGEST_URL ?? 'https://app.ironstratos.com';

/** Server caps a batch at 500 events; keep client and server in lockstep. */
export const MAX_BATCH = 500;

/** Drop a poison event after this many appearances in the server's failed[]. */
export const MAX_RETRIES = 5;

/** Debounce window for the post-write flush trigger. */
export const WRITE_DEBOUNCE_MS = 4000;

/** Exponential backoff bounds for transient (offline / 5xx / 401) retries. */
export const BACKOFF_MIN_MS = 5000;
export const BACKOFF_MAX_MS = 5 * 60 * 1000;
