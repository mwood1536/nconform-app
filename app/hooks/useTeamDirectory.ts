import { useCallback, useEffect, useState } from 'react';
import { TeamMember } from '../types';
import { Storage } from '../utils/storage';

interface UseTeamDirectoryResult {
  members: TeamMember[];
  loading: boolean;
  reload: () => Promise<void>;
  addMember: (member: TeamMember) => Promise<void>;
  updateMember: (id: string, patch: Partial<TeamMember>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
}

export function useTeamDirectory(): UseTeamDirectoryResult {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const all = await Storage.getTeamDirectory();
      all.sort((a, b) => a.name.localeCompare(b.name));
      setMembers(all);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback(async (next: TeamMember[]) => {
    next.sort((a, b) => a.name.localeCompare(b.name));
    await Storage.setTeamDirectory(next);
    setMembers(next);
  }, []);

  const addMember = useCallback<UseTeamDirectoryResult['addMember']>(
    async (member) => {
      const all = await Storage.getTeamDirectory();
      await persist([...all, member]);
    },
    [persist],
  );

  const updateMember = useCallback<UseTeamDirectoryResult['updateMember']>(
    async (id, patch) => {
      const all = await Storage.getTeamDirectory();
      const idx = all.findIndex((m) => m.id === id);
      if (idx === -1) return;
      all[idx] = { ...all[idx], ...patch };
      await persist(all);
    },
    [persist],
  );

  const removeMember = useCallback<UseTeamDirectoryResult['removeMember']>(
    async (id) => {
      const all = await Storage.getTeamDirectory();
      await persist(all.filter((m) => m.id !== id));
    },
    [persist],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { members, loading, reload, addMember, updateMember, removeMember };
}
