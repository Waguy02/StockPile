import React, { useState } from 'react';
import { Layout } from './components/layout/Shell';
import { Dashboard } from './components/pages/Dashboard';
import { Inventory } from './components/pages/Inventory';
import { Partners } from './components/pages/Partners';
import { Procurement } from './components/pages/Procurement';
import { Sales } from './components/pages/Sales';
import { Finance } from './components/pages/Finance';
import { Admin } from './components/pages/Admin';
import { ViewState } from './lib/data';
import { StoreProvider, useStore } from './lib/StoreContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister } from './lib/queryClient';

import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/theme-provider';

import { Login } from './components/pages/Login';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const { currentUser, isLoading } = useStore();

  // Redirect staff to sales if they are on a restricted page
  React.useEffect(() => {
    if (currentUser?.role === 'staff' && !['sales', 'inventory'].includes(currentView)) {
      setCurrentView('sales');
    }
  }, [currentUser, currentView]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'inventory':
        return <Inventory />;
      case 'partners':
        return <Partners />;
      case 'procurement':
        return <Procurement />;
      case 'sales':
        return <Sales />;
      case 'finance':
        return <Finance />;
      case 'admin':
        return <Admin />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
      <Toaster />
    </Layout>
  );
}

function App() {
  return (
    <PersistQueryClientProvider 
      client={queryClient} 
      persistOptions={{ persister }}
    >
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
