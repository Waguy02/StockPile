import React, { createContext, useContext, useEffect, useState } from 'react';
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
  managers: any[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreState | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState({
    categories: [] as types.Category[],
    products: [] as types.Product[],
    stockBatches: [] as types.StockBatch[],
    providers: [] as types.Provider[],
    customers: [] as types.Customer[],
    purchaseOrders: [] as types.PurchaseOrder[],
    sales: [] as types.Sale[],
    payments: [] as types.Payment[],
    managers: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const [inventory, partners, dashboard, managers] = await Promise.all([
        api.getInventory(),
        api.getPartners(),
        api.getAllData(),
        api.getAdmin()
      ]);

      setData({
        categories: inventory.categories || [],
        products: inventory.products || [],
        stockBatches: inventory.batches || [],
        providers: partners.providers || [],
        customers: partners.customers || [],
        purchaseOrders: dashboard.pos || [],
        sales: dashboard.sales || [],
        payments: dashboard.payments || [],
        managers: managers || [],
      });
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await api.seed(); // Ensure DB is seeded
        await refresh();
      } catch (e) {
        console.error("Init failed", e);
      }
    };
    init();
  }, []);

  return (
    <StoreContext.Provider value={{ ...data, isLoading, refresh }}>
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
