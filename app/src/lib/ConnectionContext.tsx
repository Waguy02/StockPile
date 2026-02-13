import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { supabase } from './supabase';
import { projectId } from '../utils/supabase/info';
import { setOffline } from './connectionStore';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/server`;
const isNative = Capacitor.isNativePlatform();
const PING_INTERVAL_MS = 3000;
const PING_TIMEOUT_MS = 4000;

type ConnectionContextValue = {
  isOnline: boolean;
};

const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined);

async function pingReachability(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return true; // Not logged in: don't force offline
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(`${BASE_URL}/inventory`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine);

  const updateFromPing = useCallback(async () => {
    const reachable = await pingReachability();
    setIsOnline(reachable);
    setOffline(!reachable);
  }, []);

  const setOnline = useCallback((online: boolean) => {
    setIsOnline(online);
    setOffline(!online);
  }, []);

  // Native (Capacitor): use Network plugin
  useEffect(() => {
    if (!isNative) return;
    let removed = false;
    Network.getStatus()
      .then((s) => { if (!removed) setOnline(s.connected); })
      .catch(() => { if (!removed) setOnline(false); });
    const listenerPromise = Network.addListener('networkStatusChange', (s) => {
      if (!removed) setOnline(s.connected);
    });
    return () => {
      removed = true;
      listenerPromise.then((h) => h.remove());
    };
  }, [setOnline]);

  // Web / Electron: navigator.onLine + periodic ping (navigator.onLine is unreliable in Electron)
  useEffect(() => {
    if (isNative) return;

    const handleOffline = () => setOnline(false);
    const handleOnline = () => {
      setOnline(true);
      // Confirm reachability soon after online event
      pingReachability().then((ok) => setOnline(ok));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync
    setOnline(navigator.onLine);

    // Periodic reachability check: detect offline quickly when navigator.onLine stays true (e.g. Electron)
    const pingInterval = setInterval(async () => {
      if (!navigator.onLine) {
        setOnline(false);
        return;
      }
      const ok = await pingReachability();
      setOnline(ok);
    }, PING_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
    };
  }, [setOnline]);

  // Re-check when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (isNative) {
        Network.getStatus().then((s) => setOnline(s.connected)).catch(() => setOnline(false));
      } else {
        if (!navigator.onLine) setOnline(false);
        else updateFromPing();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [setOnline, updateFromPing]);

  // Keep connection store in sync for API layer
  useEffect(() => {
    setOffline(!isOnline);
  }, [isOnline]);

  return (
    <ConnectionContext.Provider value={{ isOnline }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (ctx === undefined) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return ctx;
}
