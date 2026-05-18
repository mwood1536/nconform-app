import * as Network from 'expo-network';
import { useEffect, useRef, useState } from 'react';

interface NetworkStatus {
  ready: boolean;
  isOnline: boolean;
  justReconnected: boolean;
}

// Polls connectivity every 5s (expo-network has no event stream). Exposes a
// transient `justReconnected` flag so screens can show a "Synced" confirmation.
export function useNetworkStatus(): NetworkStatus {
  const [ready, setReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);
  const wasOnline = useRef(true);

  useEffect(() => {
    let mounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const online = Boolean(state.isConnected && state.isInternetReachable !== false);
        if (!mounted) return;
        setReady(true);
        setIsOnline(online);
        if (online && !wasOnline.current) {
          setJustReconnected(true);
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (mounted) setJustReconnected(false);
          }, 3500);
        }
        wasOnline.current = online;
      } catch {
        if (mounted) setReady(true);
      }
    };

    void check();
    const interval = setInterval(check, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  return { ready, isOnline, justReconnected };
}
