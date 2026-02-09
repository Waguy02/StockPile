import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Package, 
  BarChart3, 
  Settings, 
  Truck, 
  LogOut,
  Menu,
  ChevronRight,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { navItems, ViewState } from '../../lib/data';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { useTheme } from '../theme-provider';
import { supabase } from '../../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { currentUser, setCurrentUser } = useStore();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setCurrentUser(null);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const filteredNavItems = navItems.filter(item => {
    if (!currentUser) return true;
    if (currentUser.role === 'staff') return ['sales', 'inventory'].includes(item.id);
    return true;
  });

  return (
    <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-[#0B1121] dark:bg-slate-900 text-white border-r border-slate-800/50 shadow-2xl z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Odicam</h1>
            <p className="text-xs text-slate-400 font-medium">{t('shell.enterpriseManager')}</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id as ViewState)}
                    className={`group relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-900/20' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="font-medium tracking-wide text-sm">{t(item.label)}</span>
                    {isActive && (
                      <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50 animate-pulse" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 mx-4 mb-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-200 to-yellow-400 p-[2px]">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                 <span className="text-xs font-bold text-white">
                    {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'US'}
                 </span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{currentUser?.name || 'Guest'}</p>
              <p className="text-xs text-slate-500 truncate">
                {currentUser?.role === 'manager' ? 'Manager' : 'Staff'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('shell.signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-4 md:px-10 z-10 sticky top-0">
          <div className="flex items-center gap-3">
             {/* Mobile Menu Button */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            
             {/* App Name (Mobile) / Breadcrumbs (Desktop) */}
            <div className="flex items-center">
                <span className="md:hidden text-lg font-bold text-slate-800 dark:text-slate-100">Odicam</span>
                
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span onClick={() => currentView === 'activity' && onNavigate('dashboard')} className={`${currentView === 'activity' ? 'cursor-pointer hover:text-slate-800 dark:hover:text-slate-200' : ''} transition-colors`}>{t('shell.app')}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
                    {currentView === 'activity' ? (
                      <>
                        <span onClick={() => onNavigate('dashboard')} className="cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors">{t('nav.dashboard')}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{t('nav.activity')}</span>
                      </>
                    ) : (
                      <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">{t(`nav.${currentView}`)}</span>
                    )}
                </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
              {/* Connection Status */}
              <div className="scale-90 md:scale-100 origin-right">
                  <ConnectionStatus />
              </div>
              
              {/* Theme Toggle */}
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-full transition-all duration-200"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-full p-1 border border-slate-200/60 dark:border-slate-700/60">
                <button 
                  onClick={() => changeLanguage('fr')}
                  className={`px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium transition-all ${i18n.language === 'fr' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  FR
                </button>
                <button 
                  onClick={() => changeLanguage('en')}
                  className={`px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium transition-all ${i18n.language === 'en' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  EN
                </button>
              </div>

          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden transition-opacity" onClick={() => setSidebarOpen(false)}></div>
        )}

        {/* Mobile Sidebar */}
        <div className={`fixed inset-y-0 left-0 w-72 bg-[#0B1121] text-white z-40 transform transition-transform duration-300 ease-out md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
          <div className="flex h-full flex-col">
            <div className="p-6 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">Odicam</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </div>
            <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id as ViewState);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      currentView === item.id 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{t(item.label)}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-200 to-yellow-400 p-[2px]">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white">
                      {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'US'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold text-white truncate">{currentUser?.name || 'Guest'}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {currentUser?.role === 'manager' ? 'Manager' : 'Staff'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-slate-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('shell.signOut')}
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50/50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
