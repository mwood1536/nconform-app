// AuthGate — the MANDATORY root sign-in gate.
//
// The app body renders ONLY when a real cloud session exists AND the org ingest
// key is provisioned. Until then this shows a full-screen native Google sign-in
// screen. There is NO anonymous / "continue without account" path.
//
// Offline cold-start: a previously signed-in user has their Supabase session in
// AsyncStorage and their ingest key in secure-store, so both checks pass with
// no network and the app renders straight through — they stay signed in.

import { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { Colors } from '../constants/colors';
import { useCloudAccount } from '../hooks/use-cloud-account';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const cloud = useCloudAccount();

  // Signed in but no key yet (e.g. a restored session whose provisioning never
  // completed, or a transient mint failure): try to finish setup automatically.
  useEffect(() => {
    if (cloud.signedIn && !cloud.keyProvisioned && !cloud.busy) {
      void cloud.retryProvision();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud.signedIn, cloud.keyProvisioned]);

  // 1. Restoring the persisted session — brief splash.
  if (cloud.authState === 'loading') {
    return (
      <Screen>
        <ActivityIndicator color={Colors.amber} size="large" />
      </Screen>
    );
  }

  // 2. Fully gated app — session + key both present.
  if (cloud.signedIn && cloud.keyProvisioned) {
    return <>{children}</>;
  }

  // 3. Signed in, finishing cloud setup (provisioning the ingest key).
  if (cloud.signedIn && !cloud.keyProvisioned) {
    return (
      <Screen>
        <Branding />
        <ActivityIndicator color={Colors.amber} style={{ marginTop: 24 }} />
        <Text style={styles.subtitle}>
          {cloud.busy ? 'Finishing secure cloud setup…' : 'Completing sign-in…'}
        </Text>
        {cloud.error ? <Text style={styles.error}>{cloud.error}</Text> : null}
        {!cloud.busy ? (
          <TouchableOpacity style={styles.retryBtn} onPress={cloud.retryProvision}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.signOutLink} onPress={cloud.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  // 4. Signed out — the mandatory sign-in screen.
  return (
    <Screen>
      <Branding />
      <Text style={styles.subtitle}>
        Sign in with your Google account to use NConform. Your work is securely
        backed up and synced across your devices.
      </Text>

      {cloud.available ? (
        <GoogleSigninButton
          style={styles.googleButton}
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          disabled={cloud.busy}
          onPress={cloud.signIn}
        />
      ) : (
        <Text style={styles.error}>
          Sign-in isn’t configured in this build. Google sign-in is required to
          continue.
        </Text>
      )}

      {cloud.busy ? (
        <ActivityIndicator color={Colors.amber} style={{ marginTop: 16 }} />
      ) : null}
      {cloud.error ? <Text style={styles.error}>{cloud.error}</Text> : null}
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

function Branding() {
  return (
    <>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>NConform</Text>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: { width: 96, height: 96, marginBottom: 16 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: 28,
  },
  googleButton: { width: 240, height: 48 },
  error: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.errorRed,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.amber,
  },
  retryText: { color: Colors.amber, fontWeight: '600', fontSize: 15 },
  signOutLink: { marginTop: 24 },
  signOutText: { color: Colors.secondaryText, fontSize: 14 },
});
