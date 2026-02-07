import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import * as types from './data';
import { supabase } from './supabase';

interface StoreState {
  categories: types.Category[];
  products: types.Product[];
  stockBatches: types.StockBatch[];
  providers: types.Provider[];
  customers: types.Customer[];
  purchaseOrders: types.PurchaseOrder[];
  sales: types.Sale[];
  payments: types.Payment[];
  managers: types.Manager[];
  currentUser: types.Manager | null;
  setCurrentUser: (user: types.Manager | null) => void;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreState | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<types.Manager | null>(null);
  const [session, setSession] = useState<any>(null);
  const queryClient = useQueryClient();
  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['appData'],
    queryFn: async () => {
      try {
        // Fetch core data for all roles (staff and manager)
        const [inventory, partners, dashboard] = await Promise.all([
          api.getInventory(),
          api.getPartners(),
          api.getAllData(),
        ]);

        // Only managers can call getAdmin(); staff would get 403 and would break the whole fetch
        let managers: any[] = [];
        const role = session?.user?.user_metadata?.role;
        if (role === 'manager') {
          try {
            managers = await api.getAdmin();
          } catch (_e) {
            managers = [];
          }
        }
        if (!Array.isArray(managers)) managers = [];

        return {
          categories: inventory.categories || [],
          products: inventory.products || [],
          stockBatches: inventory.batches || [],
          providers: partners.providers || [],
          customers: partners.customers || [],
          purchaseOrders: dashboard.pos || [],
          sales: dashboard.sales || [],
          payments: dashboard.payments || [],
          managers,
        };
      } catch (err) {
        console.error("Fetch failed", err);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 mins
    enabled: !!session,
  });

  // Sync currentUser with session
  useEffect(() => {
      let cancelled = false;

      const buildUser = (user: any) => {
        const metadata = user.user_metadata || {};
        const fallbackName = (user.email || '').split('@')[0] || 'Unknown';
        const role: 'manager' | 'staff' = metadata.role === 'manager' ? 'manager' : 'staff';

        return {
          id: user.id,
          name: metadata.name || fallbackName,
          email: user.email || '',
          role,
          status: 'active' as const,
          lastActive: user.last_sign_in_at || undefined,
        };
      };

      if (!session?.user) {
        if (!cancelled) setCurrentUser(null);
        return;
      }
      setCurrentUser(buildUser(session.user));

      return () => {
        cancelled = true;
      };
  }, [session]);

  useEffect(() => {
    if (!session) {
      queryClient.removeQueries({ queryKey: ['appData'] });
    }
  }, [session, queryClient]);

  const refresh = async () => {
    if (session) {
      await refetch();
    }
  };

  const storeValue: StoreState = {
    categories: data?.categories || [],
    products: data?.products || [],
    stockBatches: data?.stockBatches || [],
    providers: data?.providers || [],
    customers: data?.customers || [],
    purchaseOrders: data?.purchaseOrders || [],
    sales: data?.sales || [],
    payments: data?.payments || [],
    managers: data?.managers || [],
    currentUser,
    setCurrentUser,
    isLoading,
    refresh
  };

  return (
    <StoreContext.Provider value={storeValue}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
