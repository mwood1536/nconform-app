import { useCallback, useEffect, useState } from 'react';
import { TrainingRecord } from '../types';
import { Storage } from '../utils/storage';

interface UseTrainingResult {
  records: TrainingRecord[];
  loading: boolean;
  reload: () => Promise<void>;
  createRecord: (record: TrainingRecord) => Promise<void>;
  updateRecord: (id: string, patch: Partial<TrainingRecord>) => Promise<TrainingRecord | null>;
  deleteRecord: (id: string) => Promise<void>;
}

export function useTraining(): UseTrainingResult {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const all = await Storage.getTrainingRecords();
      all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setRecords(all);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback(async (next: TrainingRecord[]) => {
    next.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    await Storage.setTrainingRecords(next);
    setRecords(next);
  }, []);

  const createRecord = useCallback<UseTrainingResult['createRecord']>(
    async (record) => {
      const all = await Storage.getTrainingRecords();
      await persist([record, ...all]);
    },
    [persist],
  );

  const updateRecord = useCallback<UseTrainingResult['updateRecord']>(
    async (id, patch) => {
      const all = await Storage.getTrainingRecords();
      const idx = all.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      const merged: TrainingRecord = { ...all[idx], ...patch };
      all[idx] = merged;
      await persist(all);
      return merged;
    },
    [persist],
  );

  const deleteRecord = useCallback<UseTrainingResult['deleteRecord']>(
    async (id) => {
      const all = await Storage.getTrainingRecords();
      await persist(all.filter((r) => r.id !== id));
    },
    [persist],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { records, loading, reload, createRecord, updateRecord, deleteRecord };
}
