import * as Network from 'expo-network';

export const OFFLINE_MESSAGE = 'Offline — will sync when connected.';

export class OfflineError extends Error {
  readonly offline = true;
  constructor() {
    super(OFFLINE_MESSAGE);
    this.name = 'OfflineError';
  }
}

export function isOfflineError(err: unknown): boolean {
  return err instanceof OfflineError || (err instanceof Error && err.message === OFFLINE_MESSAGE);
}

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    // If we can't determine state, assume online so we still attempt the call.
    return true;
  }
}

// AI calls require connectivity. Throw a typed OfflineError so screens can
// queue the request and show the offline banner instead of a generic failure.
export async function ensureOnlineForAI(): Promise<void> {
  if (!(await isOnline())) throw new OfflineError();
}
