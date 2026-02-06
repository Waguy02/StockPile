import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Package, 
  BarChart3, 
  Settings, 
  Truck, 
  LogOut,
  Bell,
  Search,
  Menu,
  ChevronRight,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { navItems, ViewState } from '../../lib/data';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { useTheme } from '../theme-provider';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-[#0B1121] dark:bg-slate-900 text-white border-r border-slate-800/50 shadow-2xl z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">StockPILE</h1>
            <p className="text-xs text-slate-400 font-medium">{t('shell.enterpriseManager')}</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
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
                 <span className="text-xs font-bold text-white">AM</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">Alice Manager</p>
              <p className="text-xs text-slate-500 truncate">{t('shell.administrator')}</p>
            </div>
          </div>
          <button className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-slate-700">
            <LogOut className="w-3.5 h-3.5" />
            {t('shell.signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-6 md:px-10 z-10 sticky top-0">
          <div className="flex items-center md:hidden">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="ml-3 text-lg font-bold text-slate-800 dark:text-slate-100">StockPILE</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors">{t('shell.app')}</span>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
            <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">{t(`nav.${currentView}`)}</span>
          </div>

          <div className="flex-1 px-8 py-5 flex justify-end items-center gap-6">
            <div className="hidden md:flex items-center gap-4">
              <ConnectionStatus />
              
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-full transition-all duration-200"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-full p-1 border border-slate-200/60 dark:border-slate-700/60">
                <button 
                  onClick={() => changeLanguage('fr')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${i18n.language === 'fr' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  FR
                </button>
                <button 
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${i18n.language === 'en' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  EN
                </button>
              </div>

              <div className="relative hidden md:block w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder={t('shell.search')} 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-800/50 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-200 dark:focus:border-indigo-800 rounded-full text-sm outline-none ring-0 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-all duration-300"
              />
            </div>

            <button className="relative p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-full transition-all duration-200">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 ring-1 ring-rose-500/20"></span>
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
           <div className="p-6 flex items-center justify-between border-b border-white/10">
             <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">StockPILE</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
             {navItems.map((item) => {
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
        </div>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50/50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
