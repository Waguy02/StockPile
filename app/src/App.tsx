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
import { StoreProvider } from './lib/StoreContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister } from './lib/queryClient';

import { Toaster } from './components/ui/sonner';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
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
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
