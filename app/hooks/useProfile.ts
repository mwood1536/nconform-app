import { useCallback, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { Storage } from '../utils/storage';
import { entitlements } from '../core/EntitlementService';

// Keep the centralized EntitlementService cache in lock-step with the live
// profile, so entitlements.*Sync() returns the same answer as the prior
// pure-helper-on-profile calls everywhere.
function syncEntitlements(profile: UserProfile | null): void {
  (entitlements as { setProfileSnapshot: (p: UserProfile | null) => void }).setProfileSnapshot(profile);
}

interface UseProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  reload: () => Promise<void>;
  save: (profile: UserProfile) => Promise<void>;
  update: (patch: Partial<UserProfile>) => Promise<void>;
  reset: () => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await Storage.getProfile();
      syncEntitlements(next);
      setProfile(next);
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (next: UserProfile) => {
    await Storage.setProfile(next);
    syncEntitlements(next);
    setProfile(next);
  }, []);

  const update = useCallback(
    async (patch: Partial<UserProfile>) => {
      const current = profile ?? (await Storage.getProfile());
      if (!current) return;
      const merged: UserProfile = { ...current, ...patch };
      await Storage.setProfile(merged);
      syncEntitlements(merged);
      setProfile(merged);
    },
    [profile],
  );

  const reset = useCallback(async () => {
    await Storage.clearProfile();
    syncEntitlements(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { profile, loading, reload, save, update, reset };
}
