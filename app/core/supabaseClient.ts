// Supabase client for the mobile app — the network backing for AuthProvider.
//
// Anon key + URL are EXPO_PUBLIC (baked into the bundle). That is intentional
// and safe: the anon key is a public client credential; Row Level Security on
// the Pro Web Supabase project is what actually protects data. (Contrast with
// the proxy pattern used for the AI provider key, which is NOT public.)
//
// If the env vars are absent the client is null and the app stays fully
// anonymous/local — sign-in is simply unavailable, nothing crashes.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured: boolean = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // RN has no window URL to read the OAuth result from — AuthProvider
        // captures the deep-link redirect and exchanges the code itself.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
