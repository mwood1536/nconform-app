import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Action,
  Audit,
  AuditQuestion,
  AuditResponse,
  AuditTemplate,
  CorrectiveAction,
  NCR,
  NCRApprovalWorkflow,
  PatternsCache,
  SafetyObservation,
  ScheduledAudit,
  ScheduledTraining,
  SubscriptionTier,
  TeamMember,
  TrainingRecord,
  TrainingTemplate,
  UserProfile,
  UserRole,
} from '../types';

export const StorageKeys = {
  userProfile: 'userProfile',
  ncrs: 'ncrs',
  correctiveActions: 'correctiveActions',
  actions: 'actions',
  ncrCounter: 'ncrCounter',
  audits: 'audits',
  auditTemplates: 'auditTemplates',
  scheduledAudits: 'scheduledAudits',
  trainingRecords: 'trainingRecords',
  trainingTemplates: 'trainingTemplates',
  scheduledTraining: 'scheduledTraining',
  teamDirectory: 'teamDirectory',
  notificationPrefs: 'notificationPrefs',
  safetyObservations: 'safetyObservations',
  patternsDetected: 'patternsDetected',
  customDepartments: 'customDepartments',
  recentSearches: 'recentSearches',
  tutorialCompleted: 'tutorialCompleted',
  demoDataLoaded: 'demoDataLoaded',
} as const;

export interface NotificationPrefs {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  overdueActionAlerts: boolean;
  auditDueAlerts: boolean;
  trainingOverdueAlerts: boolean;
  certificationExpiryAlerts: boolean;
  approvalAlerts: boolean;
}

export const DefaultNotificationPrefs: NotificationPrefs = {
  dailyReminderEnabled: false,
  dailyReminderHour: 8,
  dailyReminderMinute: 0,
  overdueActionAlerts: true,
  auditDueAlerts: true,
  trainingOverdueAlerts: true,
  certificationExpiryAlerts: true,
  approvalAlerts: true,
};

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function normalizeRole(value: unknown): UserRole {
  return value === 'standard' || value === 'viewer' || value === 'admin'
    ? value
    : 'admin';
}

function normalizeProfile(raw: UserProfile | null): UserProfile | null {
  if (!raw) return null;
  const legacyTier = raw.subscriptionTier as SubscriptionTier | 'team';
  const subscriptionTier: SubscriptionTier =
    legacyTier === 'team'
      ? 'bundle'
      : legacyTier === 'pro' || legacyTier === 'bundle'
        ? legacyTier
        : 'free';
  return {
    ...raw,
    subscriptionTier,
    rcaConnected: raw.rcaConnected ?? false,
    permissionRole: normalizeRole((raw as Partial<UserProfile>).permissionRole),
  };
}

function defaultApprovalWorkflow(status: NCR['status']): NCRApprovalWorkflow {
  // Older NCRs predate the approval flow; map their NCRStatus onto the new
  // workflow status so the UI has something coherent to show.
  const initial =
    status === 'Closed' ? 'Closed' : status === 'In Progress' ? 'Under Review' : 'Draft';
  return {
    status: initial,
    history: [],
    comments: [],
  };
}

function normalizeNCR(raw: NCR): NCR {
  return {
    ...raw,
    sharedWithRCA: raw.sharedWithRCA ?? false,
    standardClauses: raw.standardClauses ?? [],
    department: raw.department ?? '',
    parentAuditId: raw.parentAuditId ?? null,
    generatedTrainingIds: raw.generatedTrainingIds ?? [],
    approvalWorkflow: raw.approvalWorkflow ?? defaultApprovalWorkflow(raw.status),
    isSampleData: raw.isSampleData ?? false,
  };
}

function normalizeQuestion(
  raw: Partial<AuditQuestion> & { id: string; prompt: string },
): AuditQuestion {
  return {
    id: raw.id,
    prompt: raw.prompt,
    requiresPhoto: raw.requiresPhoto ?? false,
    weight: typeof raw.weight === 'number' && raw.weight >= 1 ? raw.weight : 1,
    followUpOnFail: raw.followUpOnFail ?? null,
  };
}

function normalizeResponse(
  raw: Partial<AuditResponse> & { questionId: string },
): AuditResponse {
  return {
    questionId: raw.questionId,
    result: raw.result ?? null,
    note: raw.note ?? '',
    photo: raw.photo ?? null,
    followUpAnswer: raw.followUpAnswer ?? '',
    followUpPhoto: raw.followUpPhoto ?? null,
  };
}

function normalizeAudit(raw: Audit): Audit {
  return {
    ...raw,
    department: raw.department ?? '',
    questions: (raw.questions ?? []).map(normalizeQuestion),
    responses: (raw.responses ?? []).map(normalizeResponse),
    weightedPassRate:
      typeof raw.weightedPassRate === 'number' ? raw.weightedPassRate : raw.passRate ?? 0,
    randomizationSeed: raw.randomizationSeed ?? null,
    parentAuditId: raw.parentAuditId ?? null,
    layerLevel:
      typeof raw.layerLevel === 'number' ? raw.layerLevel : layerLevelFromLabel(raw.layer),
    generatedNcrIds: raw.generatedNcrIds ?? [],
    isSampleData: raw.isSampleData ?? false,
  };
}

function normalizeTemplate(raw: AuditTemplate): AuditTemplate {
  const questions = (raw.questions ?? []).map(normalizeQuestion);
  return {
    ...raw,
    mode: raw.mode ?? 'fixed',
    questions,
    questionBank: (raw.questionBank ?? []).map(normalizeQuestion),
    sampleSize: typeof raw.sampleSize === 'number' && raw.sampleSize > 0 ? raw.sampleSize : 10,
    recurrence: raw.recurrence ?? null,
  };
}

function normalizeTeamMember(raw: TeamMember): TeamMember {
  return {
    ...raw,
    permissionRole: normalizeStandardRole(raw.permissionRole),
  };
}

function normalizeStandardRole(value: unknown): UserRole {
  return value === 'admin' || value === 'standard' || value === 'viewer'
    ? value
    : 'standard';
}

function normalizeTrainingRecord(raw: TrainingRecord): TrainingRecord {
  return {
    ...raw,
    materials: raw.materials ?? [],
    certificationExpiresOn: raw.certificationExpiresOn ?? null,
    recurrence: raw.recurrence ?? null,
    parentRecordId: raw.parentRecordId ?? null,
    parentNcrId: raw.parentNcrId ?? null,
    templateId: raw.templateId ?? null,
    quiz: raw.quiz ?? null,
    isSampleData: raw.isSampleData ?? false,
  };
}

function normalizeObservation(raw: SafetyObservation): SafetyObservation {
  return {
    ...raw,
    isSampleData: raw.isSampleData ?? false,
  };
}

function layerLevelFromLabel(layer: string): number {
  if (layer.includes('Layer 3') || layer.toLowerCase().includes('manager')) return 3;
  if (layer.includes('Layer 2') || layer.toLowerCase().includes('supervisor')) return 2;
  return 1;
}

export const Storage = {
  async getProfile(): Promise<UserProfile | null> {
    return normalizeProfile(await readJSON<UserProfile | null>(StorageKeys.userProfile, null));
  },
  async setProfile(profile: UserProfile): Promise<void> {
    await writeJSON(StorageKeys.userProfile, profile);
  },
  async clearProfile(): Promise<void> {
    await AsyncStorage.removeItem(StorageKeys.userProfile);
  },

  async getNCRs(): Promise<NCR[]> {
    const ncrs = await readJSON<NCR[]>(StorageKeys.ncrs, []);
    return ncrs.map(normalizeNCR);
  },
  async setNCRs(ncrs: NCR[]): Promise<void> {
    await writeJSON(StorageKeys.ncrs, ncrs);
  },

  async getCorrectiveActions(): Promise<CorrectiveAction[]> {
    return readJSON<CorrectiveAction[]>(StorageKeys.correctiveActions, []);
  },
  async setCorrectiveActions(cas: CorrectiveAction[]): Promise<void> {
    await writeJSON(StorageKeys.correctiveActions, cas);
  },

  async getActions(): Promise<Action[]> {
    return readJSON<Action[]>(StorageKeys.actions, []);
  },
  async setActions(actions: Action[]): Promise<void> {
    await writeJSON(StorageKeys.actions, actions);
  },

  async getAudits(): Promise<Audit[]> {
    const audits = await readJSON<Audit[]>(StorageKeys.audits, []);
    return audits.map(normalizeAudit);
  },
  async setAudits(audits: Audit[]): Promise<void> {
    await writeJSON(StorageKeys.audits, audits);
  },

  async getAuditTemplates(): Promise<AuditTemplate[]> {
    const templates = await readJSON<AuditTemplate[]>(StorageKeys.auditTemplates, []);
    return templates.map(normalizeTemplate);
  },
  async setAuditTemplates(templates: AuditTemplate[]): Promise<void> {
    await writeJSON(StorageKeys.auditTemplates, templates);
  },

  async getScheduledAudits(): Promise<ScheduledAudit[]> {
    return readJSON<ScheduledAudit[]>(StorageKeys.scheduledAudits, []);
  },
  async setScheduledAudits(items: ScheduledAudit[]): Promise<void> {
    await writeJSON(StorageKeys.scheduledAudits, items);
  },

  async getTrainingRecords(): Promise<TrainingRecord[]> {
    const records = await readJSON<TrainingRecord[]>(StorageKeys.trainingRecords, []);
    return records.map(normalizeTrainingRecord);
  },
  async setTrainingRecords(records: TrainingRecord[]): Promise<void> {
    await writeJSON(StorageKeys.trainingRecords, records);
  },

  async getTrainingTemplates(): Promise<TrainingTemplate[]> {
    return readJSON<TrainingTemplate[]>(StorageKeys.trainingTemplates, []);
  },
  async setTrainingTemplates(templates: TrainingTemplate[]): Promise<void> {
    await writeJSON(StorageKeys.trainingTemplates, templates);
  },

  async getScheduledTraining(): Promise<ScheduledTraining[]> {
    return readJSON<ScheduledTraining[]>(StorageKeys.scheduledTraining, []);
  },
  async setScheduledTraining(items: ScheduledTraining[]): Promise<void> {
    await writeJSON(StorageKeys.scheduledTraining, items);
  },

  async getTeamDirectory(): Promise<TeamMember[]> {
    const members = await readJSON<TeamMember[]>(StorageKeys.teamDirectory, []);
    return members.map(normalizeTeamMember);
  },
  async setTeamDirectory(members: TeamMember[]): Promise<void> {
    await writeJSON(StorageKeys.teamDirectory, members);
  },

  async getSafetyObservations(): Promise<SafetyObservation[]> {
    const items = await readJSON<SafetyObservation[]>(StorageKeys.safetyObservations, []);
    return items.map(normalizeObservation);
  },
  async setSafetyObservations(items: SafetyObservation[]): Promise<void> {
    await writeJSON(StorageKeys.safetyObservations, items);
  },

  async getNotificationPrefs(): Promise<NotificationPrefs> {
    const stored = await readJSON<Partial<NotificationPrefs>>(
      StorageKeys.notificationPrefs,
      {},
    );
    return { ...DefaultNotificationPrefs, ...stored };
  },
  async setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
    await writeJSON(StorageKeys.notificationPrefs, prefs);
  },

  async getPatternsCache(): Promise<PatternsCache | null> {
    return readJSON<PatternsCache | null>(StorageKeys.patternsDetected, null);
  },
  async setPatternsCache(cache: PatternsCache): Promise<void> {
    await writeJSON(StorageKeys.patternsDetected, cache);
  },
  async clearPatternsCache(): Promise<void> {
    await AsyncStorage.removeItem(StorageKeys.patternsDetected);
  },

  async getCustomDepartments(): Promise<string[]> {
    return readJSON<string[]>(StorageKeys.customDepartments, []);
  },
  async setCustomDepartments(items: string[]): Promise<void> {
    await writeJSON(StorageKeys.customDepartments, items);
  },

  async getRecentSearches(): Promise<string[]> {
    return readJSON<string[]>(StorageKeys.recentSearches, []);
  },
  async setRecentSearches(items: string[]): Promise<void> {
    await writeJSON(StorageKeys.recentSearches, items.slice(0, 10));
  },

  async getTutorialCompleted(): Promise<boolean> {
    return readJSON<boolean>(StorageKeys.tutorialCompleted, false);
  },
  async setTutorialCompleted(value: boolean): Promise<void> {
    await writeJSON(StorageKeys.tutorialCompleted, value);
  },

  async getDemoDataLoaded(): Promise<boolean> {
    return readJSON<boolean>(StorageKeys.demoDataLoaded, false);
  },
  async setDemoDataLoaded(value: boolean): Promise<void> {
    await writeJSON(StorageKeys.demoDataLoaded, value);
  },

  async nextNCRNumber(): Promise<string> {
    const current = await readJSON<number>(StorageKeys.ncrCounter, 0);
    const next = current + 1;
    await writeJSON(StorageKeys.ncrCounter, next);
    return `NCR-${String(next).padStart(3, '0')}`;
  },

  async resetAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      StorageKeys.userProfile,
      StorageKeys.ncrs,
      StorageKeys.correctiveActions,
      StorageKeys.actions,
      StorageKeys.ncrCounter,
      StorageKeys.audits,
      StorageKeys.auditTemplates,
      StorageKeys.scheduledAudits,
      StorageKeys.trainingRecords,
      StorageKeys.trainingTemplates,
      StorageKeys.scheduledTraining,
      StorageKeys.teamDirectory,
      StorageKeys.notificationPrefs,
      StorageKeys.safetyObservations,
      StorageKeys.patternsDetected,
      StorageKeys.customDepartments,
      StorageKeys.recentSearches,
      StorageKeys.tutorialCompleted,
      StorageKeys.demoDataLoaded,
    ]);
  },
};
