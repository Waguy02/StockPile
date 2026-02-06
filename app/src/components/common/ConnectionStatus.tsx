import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsFetching, useMutationState } from '@tanstack/react-query';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '../../components/ui/utils';

export function ConnectionStatus() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isFetching = useIsFetching();
  const mutations = useMutationState({
    filters: { status: 'pending' },
    select: (mutation) => mutation.state.status,
  });
  
  const isSyncing = isFetching > 0 || mutations.length > 0;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold select-none transition-all duration-300 border",
      !isOnline 
        ? "bg-rose-100 text-rose-700 border-rose-200" 
        : isSyncing 
          ? "bg-amber-100 text-amber-700 border-amber-200"
          : "bg-emerald-100 text-emerald-700 border-emerald-200"
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
