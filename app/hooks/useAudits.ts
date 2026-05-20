import { useCallback, useEffect, useState } from 'react';
import { Audit, AuditTemplate, ScheduledAudit } from '../types';
import { Storage } from '../utils/storage';

interface UseAuditsResult {
  audits: Audit[];
  templates: AuditTemplate[];
  scheduled: ScheduledAudit[];
  loading: boolean;
  reload: () => Promise<void>;
  createAudit: (audit: Audit) => Promise<void>;
  updateAudit: (id: string, patch: Partial<Audit>) => Promise<Audit | null>;
  deleteAudit: (id: string) => Promise<void>;
  saveTemplate: (template: AuditTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  saveSchedule: (item: ScheduledAudit) => Promise<void>;
  updateSchedule: (id: string, patch: Partial<ScheduledAudit>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

export function useAudits(): UseAuditsResult {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledAudit[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [a, t, s] = await Promise.all([
        Storage.getAudits(),
        Storage.getAuditTemplates(),
        Storage.getScheduledAudits(),
      ]);
      a.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
      t.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
      s.sort((x, y) => (x.dueDate < y.dueDate ? -1 : 1));
      setAudits(a);
      setTemplates(t);
      setScheduled(s);
    } finally {
      setLoading(false);
    }
  }, []);

  const persistAudits = useCallback(async (next: Audit[]) => {
    next.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
    await Storage.setAudits(next);
    setAudits(next);
  }, []);

  const persistTemplates = useCallback(async (next: AuditTemplate[]) => {
    next.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
    await Storage.setAuditTemplates(next);
    setTemplates(next);
  }, []);

  const persistScheduled = useCallback(async (next: ScheduledAudit[]) => {
    next.sort((x, y) => (x.dueDate < y.dueDate ? -1 : 1));
    await Storage.setScheduledAudits(next);
    setScheduled(next);
  }, []);

  const createAudit = useCallback<UseAuditsResult['createAudit']>(
    async (audit) => {
      const all = await Storage.getAudits();
      await persistAudits([audit, ...all]);
    },
    [persistAudits],
  );

  const updateAudit = useCallback<UseAuditsResult['updateAudit']>(
    async (id, patch) => {
      const all = await Storage.getAudits();
      const idx = all.findIndex((x) => x.id === id);
      if (idx === -1) return null;
      const merged: Audit = { ...all[idx], ...patch };
      all[idx] = merged;
      await persistAudits(all);
      return merged;
    },
    [persistAudits],
  );

  const deleteAudit = useCallback<UseAuditsResult['deleteAudit']>(
    async (id) => {
      const all = await Storage.getAudits();
      await persistAudits(all.filter((x) => x.id !== id));
    },
    [persistAudits],
  );

  const saveTemplate = useCallback<UseAuditsResult['saveTemplate']>(
    async (template) => {
      const all = await Storage.getAuditTemplates();
      const without = all.filter((t) => t.id !== template.id);
      await persistTemplates([template, ...without]);
    },
    [persistTemplates],
  );

  const deleteTemplate = useCallback<UseAuditsResult['deleteTemplate']>(
    async (id) => {
      const all = await Storage.getAuditTemplates();
      await persistTemplates(all.filter((t) => t.id !== id));
    },
    [persistTemplates],
  );

  const saveSchedule = useCallback<UseAuditsResult['saveSchedule']>(
    async (item) => {
      const all = await Storage.getScheduledAudits();
      const without = all.filter((s) => s.id !== item.id);
      await persistScheduled([item, ...without]);
    },
    [persistScheduled],
  );

  const updateSchedule = useCallback<UseAuditsResult['updateSchedule']>(
    async (id, patch) => {
      const all = await Storage.getScheduledAudits();
      const idx = all.findIndex((s) => s.id === id);
      if (idx === -1) return;
      all[idx] = { ...all[idx], ...patch };
      await persistScheduled(all);
    },
    [persistScheduled],
  );

  const deleteSchedule = useCallback<UseAuditsResult['deleteSchedule']>(
    async (id) => {
      const all = await Storage.getScheduledAudits();
      await persistScheduled(all.filter((s) => s.id !== id));
    },
    [persistScheduled],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    audits,
    templates,
    scheduled,
    loading,
    reload,
    createAudit,
    updateAudit,
    deleteAudit,
    saveTemplate,
    deleteTemplate,
    saveSchedule,
    updateSchedule,
    deleteSchedule,
  };
}
