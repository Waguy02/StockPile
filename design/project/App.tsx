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
    </Layout>
  );
}

function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}

export default App;
