import React, { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import * as types from './data';

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
  const [currentUser, setCurrentUser] = React.useState<types.Manager | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['appData'],
    queryFn: async () => {
      // Seed first if needed, though usually seed is one-off. 
      // Keeping original logic: await api.seed(); await refresh();
      // We'll skip auto-seed every refetch, maybe do it once or assume dev env.
      // For now, let's just fetch.
      try {
        const [inventory, partners, dashboard, managers] = await Promise.all([
          api.getInventory(),
          api.getPartners(),
          api.getAllData(),
          api.getAdmin()
        ]);
        
        // Mock current user if not set
        if (!currentUser && managers && managers.length > 0) {
           // Auto-login during dev for convenience
           const admin = managers.find((m: any) => m.role === 'admin') || managers[0];
           setCurrentUser(admin);
        } else if (!currentUser && (!managers || managers.length === 0)) {
            // If no users at all (fresh start), maybe we need to seed or allow default admin
            // For now, let's wait for seed.
        }

        return {
          categories: inventory.categories || [],
          products: inventory.products || [],
          stockBatches: inventory.batches || [],
          providers: partners.providers || [],
          customers: partners.customers || [],
          purchaseOrders: dashboard.pos || [],
          sales: dashboard.sales || [],
          payments: dashboard.payments || [],
          managers: managers || [],
        };
      } catch (err) {
        console.error("Fetch failed", err);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  const refresh = async () => {
    await refetch();
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
