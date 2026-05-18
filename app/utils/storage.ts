import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Action,
  Audit,
  AuditTemplate,
  CorrectiveAction,
  NCR,
  SubscriptionTier,
  TeamMember,
  TrainingRecord,
  UserProfile,
} from '../types';

export const StorageKeys = {
  userProfile: 'userProfile',
  ncrs: 'ncrs',
  correctiveActions: 'correctiveActions',
  actions: 'actions',
  ncrCounter: 'ncrCounter',
  audits: 'audits',
  auditTemplates: 'auditTemplates',
  trainingRecords: 'trainingRecords',
  teamDirectory: 'teamDirectory',
  notificationPrefs: 'notificationPrefs',
} as const;

export interface NotificationPrefs {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  overdueActionAlerts: boolean;
  auditDueAlerts: boolean;
  trainingOverdueAlerts: boolean;
}

export const DefaultNotificationPrefs: NotificationPrefs = {
  dailyReminderEnabled: false,
  dailyReminderHour: 8,
  dailyReminderMinute: 0,
  overdueActionAlerts: true,
  auditDueAlerts: true,
  trainingOverdueAlerts: true,
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

// Normalize legacy profiles: the retired "team" tier maps to "bundle",
// and fields added after launch get safe defaults.
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
  };
}

// NCRs created before the RCA toggle existed default to not shared.
function normalizeNCR(raw: NCR): NCR {
  return {
    ...raw,
    sharedWithRCA: raw.sharedWithRCA ?? false,
    standardClauses: raw.standardClauses ?? [],
  };
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
    return readJSON<Audit[]>(StorageKeys.audits, []);
  },
  async setAudits(audits: Audit[]): Promise<void> {
    await writeJSON(StorageKeys.audits, audits);
  },

  async getAuditTemplates(): Promise<AuditTemplate[]> {
    return readJSON<AuditTemplate[]>(StorageKeys.auditTemplates, []);
  },
  async setAuditTemplates(templates: AuditTemplate[]): Promise<void> {
    await writeJSON(StorageKeys.auditTemplates, templates);
  },

  async getTrainingRecords(): Promise<TrainingRecord[]> {
    return readJSON<TrainingRecord[]>(StorageKeys.trainingRecords, []);
  },
  async setTrainingRecords(records: TrainingRecord[]): Promise<void> {
    await writeJSON(StorageKeys.trainingRecords, records);
  },

  async getTeamDirectory(): Promise<TeamMember[]> {
    return readJSON<TeamMember[]>(StorageKeys.teamDirectory, []);
  },
  async setTeamDirectory(members: TeamMember[]): Promise<void> {
    await writeJSON(StorageKeys.teamDirectory, members);
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
      StorageKeys.trainingRecords,
      StorageKeys.teamDirectory,
      StorageKeys.notificationPrefs,
    ]);
  },
};
