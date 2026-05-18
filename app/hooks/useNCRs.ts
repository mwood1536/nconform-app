import { useCallback, useEffect, useState } from 'react';
import { Action, CorrectiveAction, NCR, TimelineEvent } from '../types';
import { generateId, nowISO } from '../utils/ncrHelpers';
import { Storage } from '../utils/storage';

interface CreateNCRInput {
  title: string;
  detectionPoint: NCR['detectionPoint'];
  severity: NCR['severity'];
  standardRef: NCR['standardRef'];
  description: string;
  photos: NCR['photos'];
  containmentAction: string;
  assignedTo: string;
  dueDate: string;
}

interface UseNCRsResult {
  ncrs: NCR[];
  loading: boolean;
  reload: () => Promise<void>;
  createNCR: (input: CreateNCRInput) => Promise<NCR>;
  updateNCR: (id: string, patch: Partial<NCR>) => Promise<NCR | null>;
  setStatus: (id: string, status: NCR['status']) => Promise<void>;
  attachCorrectiveAction: (id: string, ca: CorrectiveAction) => Promise<void>;
  addAction: (id: string, action: Omit<Action, 'id' | 'ncrId' | 'createdAt'>) => Promise<void>;
  toggleAction: (ncrId: string, actionId: string) => Promise<void>;
  appendTimeline: (id: string, event: Omit<TimelineEvent, 'id' | 'timestamp'>) => Promise<void>;
  setRCAShared: (id: string, shared: boolean) => Promise<void>;
  deleteNCR: (id: string) => Promise<void>;
}

export function useNCRs(): UseNCRsResult {
  const [ncrs, setNCRs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await Storage.getNCRs();
      next.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setNCRs(next);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback(async (next: NCR[]) => {
    next.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    await Storage.setNCRs(next);
    setNCRs(next);
  }, []);

  const createNCR = useCallback<UseNCRsResult['createNCR']>(
    async (input) => {
      const ncrNumber = await Storage.nextNCRNumber();
      const ts = nowISO();
      const ncr: NCR = {
        id: generateId('ncr'),
        ncrNumber,
        title: input.title,
        detectionPoint: input.detectionPoint,
        severity: input.severity,
        standardRef: input.standardRef,
        description: input.description,
        photos: input.photos,
        containmentAction: input.containmentAction,
        assignedTo: input.assignedTo,
        dueDate: input.dueDate,
        status: 'Open',
        createdAt: ts,
        updatedAt: ts,
        sharedWithRCA: false,
        correctiveAction: null,
        actions: [],
        timeline: [
          {
            id: generateId('tl'),
            label: 'NCR Created',
            detail: `${ncrNumber} logged with severity ${input.severity}`,
            timestamp: ts,
          },
        ],
      };
      const next = [ncr, ...(await Storage.getNCRs())];
      await persist(next);
      return ncr;
    },
    [persist],
  );

  const updateNCR = useCallback<UseNCRsResult['updateNCR']>(
    async (id, patch) => {
      const all = await Storage.getNCRs();
      const idx = all.findIndex((n) => n.id === id);
      if (idx === -1) return null;
      const merged: NCR = { ...all[idx], ...patch, updatedAt: nowISO() };
      all[idx] = merged;
      await persist(all);
      return merged;
    },
    [persist],
  );

  const appendTimeline = useCallback<UseNCRsResult['appendTimeline']>(
    async (id, event) => {
      const all = await Storage.getNCRs();
      const idx = all.findIndex((n) => n.id === id);
      if (idx === -1) return;
      const tlEvent: TimelineEvent = {
        ...event,
        id: generateId('tl'),
        timestamp: nowISO(),
      };
      all[idx] = {
        ...all[idx],
        timeline: [...all[idx].timeline, tlEvent],
        updatedAt: nowISO(),
      };
      await persist(all);
    },
    [persist],
  );

  const setStatus = useCallback<UseNCRsResult['setStatus']>(
    async (id, status) => {
      const all = await Storage.getNCRs();
      const idx = all.findIndex((n) => n.id === id);
      if (idx === -1) return;
      all[idx] = {
        ...all[idx],
        status,
        updatedAt: nowISO(),
        timeline: [
          ...all[idx].timeline,
          {
            id: generateId('tl'),
            label: `Marked ${status}`,
            timestamp: nowISO(),
          },
        ],
      };
      await persist(all);
    },
    [persist],
  );

  const attachCorrectiveAction = useCallback<UseNCRsResult['attachCorrectiveAction']>(
    async (id, ca) => {
      const all = await Storage.getNCRs();
      const idx = all.findIndex((n) => n.id === id);
      if (idx === -1) return;
      all[idx] = {
        ...all[idx],
        correctiveAction: ca,
        status: all[idx].status === 'Open' ? 'In Progress' : all[idx].status,
        updatedAt: nowISO(),
        timeline: [
          ...all[idx].timeline,
          {
            id: generateId('tl'),
            label: 'Corrective Action Written',
            detail: ca.standardReference || undefined,
            timestamp: nowISO(),
          },
        ],
      };
      const cas = await Storage.getCorrectiveActions();
      await Storage.setCorrectiveActions([ca, ...cas.filter((c) => c.ncrId !== id)]);
      await persist(all);
    },
    [persist],
  );

  const addAction = useCallback<UseNCRsResult['addAction']>(
    async (id, action) => {
      const all = await Storage.getNCRs();
      const idx = all.findIndex((n) => n.id === id);
      if (idx === -1) return;
      const newAction: Action = {
        ...action,
        id: generateId('act'),
        ncrId: id,
        createdAt: nowISO(),
      };
      all[idx] = {
        ...all[idx],
        actions: [...all[idx].actions, newAction],
        updatedAt: nowISO(),
        timeline: [
          ...all[idx].timeline,
          {
            id: generateId('tl'),
            label: 'Action Assigned',
            detail: action.assignedTo
              ? `${action.description} (${action.assignedTo})`
              : action.description,
            timestamp: nowISO(),
          },
        ],
      };
      const allActions = await Storage.getActions();
      await Storage.setActions([newAction, ...allActions]);
      await persist(all);
    },
    [persist],
  );

  const toggleAction = useCallback<UseNCRsResult['toggleAction']>(
    async (ncrId, actionId) => {
      const all = await Storage.getNCRs();
      const idx = all.findIndex((n) => n.id === ncrId);
      if (idx === -1) return;
      const ncr = all[idx];
      const updatedActions: Action[] = ncr.actions.map((a) => {
        if (a.id !== actionId) return a;
        const isComplete = a.status === 'Completed';
        return {
          ...a,
          status: isComplete ? 'Pending' : 'Completed',
          completedAt: isComplete ? null : nowISO(),
        };
      });
      all[idx] = {
        ...ncr,
        actions: updatedActions,
        updatedAt: nowISO(),
      };
      const allActions = await Storage.getActions();
      const refreshed = allActions.map((a) => {
        const updated = updatedActions.find((u) => u.id === a.id);
        return updated ?? a;
      });
      await Storage.setActions(refreshed);
      await persist(all);
    },
    [persist],
  );

  const setRCAShared = useCallback<UseNCRsResult['setRCAShared']>(
    async (id, shared) => {
      const all = await Storage.getNCRs();
      const idx = all.findIndex((n) => n.id === id);
      if (idx === -1) return;
      all[idx] = {
        ...all[idx],
        sharedWithRCA: shared,
        updatedAt: nowISO(),
        timeline: [
          ...all[idx].timeline,
          {
            id: generateId('tl'),
            label: shared ? 'Shared with Root Cause AI' : 'Unshared from Root Cause AI',
            timestamp: nowISO(),
          },
        ],
      };
      await persist(all);
    },
    [persist],
  );

  const deleteNCR = useCallback<UseNCRsResult['deleteNCR']>(
    async (id) => {
      const all = await Storage.getNCRs();
      const next = all.filter((n) => n.id !== id);
      await persist(next);
      const cas = await Storage.getCorrectiveActions();
      await Storage.setCorrectiveActions(cas.filter((c) => c.ncrId !== id));
      const acts = await Storage.getActions();
      await Storage.setActions(acts.filter((a) => a.ncrId !== id));
    },
    [persist],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    ncrs,
    loading,
    reload,
    createNCR,
    updateNCR,
    setStatus,
    attachCorrectiveAction,
    addAction,
    toggleAction,
    appendTimeline,
    setRCAShared,
    deleteNCR,
  };
}
