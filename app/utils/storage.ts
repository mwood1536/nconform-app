import AsyncStorage from '@react-native-async-storage/async-storage';
import { Action, CorrectiveAction, NCR, UserProfile } from '../types';

export const StorageKeys = {
  userProfile: 'userProfile',
  ncrs: 'ncrs',
  correctiveActions: 'correctiveActions',
  actions: 'actions',
  ncrCounter: 'ncrCounter',
} as const;

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

export const Storage = {
  async getProfile(): Promise<UserProfile | null> {
    return readJSON<UserProfile | null>(StorageKeys.userProfile, null);
  },
  async setProfile(profile: UserProfile): Promise<void> {
    await writeJSON(StorageKeys.userProfile, profile);
  },
  async clearProfile(): Promise<void> {
    await AsyncStorage.removeItem(StorageKeys.userProfile);
  },

  async getNCRs(): Promise<NCR[]> {
    return readJSON<NCR[]>(StorageKeys.ncrs, []);
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
    ]);
  },
};
