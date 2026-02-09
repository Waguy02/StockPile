import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsFetching, useMutationState } from '@tanstack/react-query';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { cn } from '../../components/ui/utils';

const POLL_INTERVAL_MS = 3000;
const isNative = Capacitor.isNativePlatform();

export function ConnectionStatus() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine);
  const isFetching = useIsFetching();
  const mutations = useMutationState({
    filters: { status: 'pending' },
    select: (mutation) => mutation.state.status,
  });
  
  const isSyncing = isFetching > 0 || mutations.length > 0;

  const updateOnline = useCallback(() => {
    setIsOnline(typeof navigator !== 'undefined' && navigator.onLine);
  }, []);

  // On native (Capacitor): use Network plugin — reliable on Android/iOS when user goes offline.
  useEffect(() => {
    if (!isNative) return;
    let removed = false;
    Network.getStatus()
      .then((status) => { if (!removed) setIsOnline(status.connected); })
      .catch(() => { if (!removed) setIsOnline(false); });
    const handle = Network.addListener('networkStatusChange', (status) => {
      if (!removed) setIsOnline(status.connected);
    });
    return () => {
      removed = true;
      handle.remove();
    };
  }, []);

  // On web: browser online/offline events.
  useEffect(() => {
    if (isNative) return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll navigator.onLine on web — many mobile WebViews don't fire 'offline' when device goes offline.
  useEffect(() => {
    if (isNative) return;
    const id = setInterval(updateOnline, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [updateOnline]);

  // Re-check when app returns to foreground (visibility change).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (isNative) {
          Network.getStatus().then((s) => setIsOnline(s.connected)).catch(() => setIsOnline(false));
        } else {
          updateOnline();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [updateOnline]);

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold select-none transition-all duration-300 border",
      !isOnline 
        ? "bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/30" 
        : isSyncing 
          ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30"
          : "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30"
    )}>
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>{t('connection.offline')}</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{t('connection.syncing')}</span>
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>{t('connection.connected')}</span>
        </>
      )}
    </div>
  );
}
