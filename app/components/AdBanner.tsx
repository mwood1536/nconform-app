import Constants, { ExecutionEnvironment } from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '../constants/colors';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { entitlements } from '../core/EntitlementService';

// AdMob banner using react-native-google-mobile-ads. The module is loaded
// lazily and only when running outside Expo Go, where the native module
// is unavailable. In Expo Go this component renders nothing so dev still works.
//
// TODO: Replace test ad unit IDs with production IDs before launch.
// Test IDs come from https://developers.google.com/admob/android/test-ads
const TEST_BANNER_ID = Platform.select({
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
  default: 'ca-app-pub-3940256099942544/6300978111',
});

interface RNGMARequest {
  requestNonPersonalizedAdsOnly: boolean;
}

interface BannerProps {
  unitId: string;
  size: string;
  requestOptions: RNGMARequest;
  onAdFailedToLoad?: (err: unknown) => void;
}

interface RNGMABanner {
  BannerAd: React.ComponentType<BannerProps>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string; BANNER: string };
}

function loadAdsModule(): RNGMABanner | null {
  // Expo Go cannot host the native AdMob module; skip entirely there.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-google-mobile-ads') as Partial<RNGMABanner>;
    if (mod.BannerAd && mod.BannerAdSize) {
      return mod as RNGMABanner;
    }
    return null;
  } catch {
    return null;
  }
}

export function AdBanner() {
  const { isOnline } = useNetworkStatus();
  const [adsModule, setAdsModule] = useState<RNGMABanner | null>(null);
  const [failed, setFailed] = useState(false);
  // Ad gate centralized in EntitlementService (ads on free only). Behavior
  // unchanged from adsEnabled(profile); the cache mirrors the live profile.
  const [adsOn, setAdsOn] = useState(entitlements.adsEnabled());

  useEffect(() => {
    setAdsModule(loadAdsModule());
    const unsub = entitlements.subscribe(() => setAdsOn(entitlements.adsEnabled()));
    return unsub;
  }, []);

  if (!adsOn) return null;
  if (!isOnline) return null;
  if (!adsModule) return null;
  if (failed) return null;

  const { BannerAd, BannerAdSize } = adsModule;

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={TEST_BANNER_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.background,
  },
});
