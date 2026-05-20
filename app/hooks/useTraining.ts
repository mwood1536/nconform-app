import { useCallback, useEffect, useState } from 'react';
import { ScheduledTraining, TrainingRecord, TrainingTemplate } from '../types';
import { generateId, nowISO } from '../utils/ncrHelpers';
import { Storage } from '../utils/storage';
import { BuiltInTrainingTemplates } from '../utils/training';

interface UseTrainingResult {
  records: TrainingRecord[];
  templates: TrainingTemplate[];
  scheduled: ScheduledTraining[];
  loading: boolean;
  reload: () => Promise<void>;
  createRecord: (record: TrainingRecord) => Promise<void>;
  updateRecord: (id: string, patch: Partial<TrainingRecord>) => Promise<TrainingRecord | null>;
  deleteRecord: (id: string) => Promise<void>;
  saveTemplate: (template: TrainingTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  saveScheduled: (item: ScheduledTraining) => Promise<void>;
  updateScheduled: (id: string, patch: Partial<ScheduledTraining>) => Promise<void>;
  deleteScheduled: (id: string) => Promise<void>;
}

async function ensureBuiltInTemplates(existing: TrainingTemplate[]): Promise<TrainingTemplate[]> {
  if (existing.some((t) => t.isBuiltIn)) return existing;
  const seeded: TrainingTemplate[] = BuiltInTrainingTemplates.map((t) => ({
    ...t,
    id: generateId('tpl'),
    createdAt: nowISO(),
  }));
  const merged = [...seeded, ...existing];
  await Storage.setTrainingTemplates(merged);
  return merged;
}

export function useTraining(): UseTrainingResult {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [templates, setTemplates] = useState<TrainingTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledTraining[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t, s] = await Promise.all([
        Storage.getTrainingRecords(),
        Storage.getTrainingTemplates(),
        Storage.getScheduledTraining(),
      ]);
      r.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const seededTemplates = await ensureBuiltInTemplates(t);
      seededTemplates.sort((a, b) => a.name.localeCompare(b.name));
      s.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
      setRecords(r);
      setTemplates(seededTemplates);
      setScheduled(s);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback(async (next: TrainingRecord[]) => {
    next.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    await Storage.setTrainingRecords(next);
    setRecords(next);
  }, []);

  const persistTemplates = useCallback(async (next: TrainingTemplate[]) => {
    next.sort((a, b) => a.name.localeCompare(b.name));
    await Storage.setTrainingTemplates(next);
    setTemplates(next);
  }, []);

  const persistScheduled = useCallback(async (next: ScheduledTraining[]) => {
    next.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    await Storage.setScheduledTraining(next);
    setScheduled(next);
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

  const saveTemplate = useCallback<UseTrainingResult['saveTemplate']>(
    async (template) => {
      const all = await Storage.getTrainingTemplates();
      const without = all.filter((t) => t.id !== template.id);
      await persistTemplates([...without, template]);
    },
    [persistTemplates],
  );

  const deleteTemplate = useCallback<UseTrainingResult['deleteTemplate']>(
    async (id) => {
      const all = await Storage.getTrainingTemplates();
      await persistTemplates(all.filter((t) => t.id !== id));
    },
    [persistTemplates],
  );

  const saveScheduled = useCallback<UseTrainingResult['saveScheduled']>(
    async (item) => {
      const all = await Storage.getScheduledTraining();
      const without = all.filter((s) => s.id !== item.id);
      await persistScheduled([item, ...without]);
    },
    [persistScheduled],
  );

  const updateScheduled = useCallback<UseTrainingResult['updateScheduled']>(
    async (id, patch) => {
      const all = await Storage.getScheduledTraining();
      const idx = all.findIndex((s) => s.id === id);
      if (idx === -1) return;
      all[idx] = { ...all[idx], ...patch };
      await persistScheduled(all);
    },
    [persistScheduled],
  );

  const deleteScheduled = useCallback<UseTrainingResult['deleteScheduled']>(
    async (id) => {
      const all = await Storage.getScheduledTraining();
      await persistScheduled(all.filter((s) => s.id !== id));
    },
    [persistScheduled],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    records,
    templates,
    scheduled,
    loading,
    reload,
    createRecord,
    updateRecord,
    deleteRecord,
    saveTemplate,
    deleteTemplate,
    saveScheduled,
    updateScheduled,
    deleteScheduled,
  };
}
