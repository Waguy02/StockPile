import React from 'react';
import { useTranslation } from 'react-i18next';
import { useIsFetching, useMutationState } from '@tanstack/react-query';
import { Wifi, WifiOff } from 'lucide-react';
import { useConnection } from '../../lib/ConnectionContext';
import { cn } from '../../components/ui/utils';

export function ConnectionStatus() {
  const { t } = useTranslation();
  const { isOnline } = useConnection();
  const isFetching = useIsFetching();
  const mutations = useMutationState({
    filters: { status: 'pending' },
    select: (mutation) => mutation.state.status,
  });

  const isSyncing = isFetching > 0 || mutations.length > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold select-none transition-all duration-300 border",
        !isOnline
          ? "bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/30"
          : "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30"
      )}
      title={!isOnline ? t('connection.offline') : isSyncing ? t('connection.syncing') : t('connection.connected')}
      aria-label={!isOnline ? t('connection.offline') : isSyncing ? t('connection.syncing') : t('connection.connected')}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>{t('connection.offline')}</span>
        </>
      ) : (
        <>
          {isSyncing ? (
            <span className="flex items-center justify-center w-5 h-5 shrink-0" aria-hidden title={t('connection.syncing')}>
              <span className="relative flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-[connection-tilt_1.2s_ease-in-out_infinite]">
                <span className="absolute w-1.5 h-1.5 rounded-full bg-white shadow-sm top-0.5 left-1/2 -translate-x-1/2" />
              </span>
            </span>
          ) : (
            <Wifi className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{t('connection.connected')}</span>
        </>
      )}
    </div>
  );
}
