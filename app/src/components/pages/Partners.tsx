import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, 
  User, 
  Search, 
  Plus,
  MoreHorizontal,
  Mail,
  Loader2,
  Phone,
  Edit,
  Trash2
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { useConnection } from '../../lib/ConnectionContext';
import { api } from '../../lib/api';
import { AddPartnerDialog } from '../modals/AddPartnerDialog';
import { ConfirmDeleteDialog } from '../common/ConfirmDeleteDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

type DeleteTarget = { type: 'provider' | 'customer'; id: string; name: string };

export function Partners() {
  const { providers, customers, isLoading, refresh, currentUser } = useStore();
  const { isOnline } = useConnection();
  const { t } = useTranslation();
  const [activeModal, setActiveModal] = useState<'provider' | 'customer' | null>(null);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const handleEdit = (type: 'provider' | 'customer', partner: any) => {
    setEditingPartner(partner);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingPartner(null);
  };

  const handleRequestDeleteProvider = (id: string, name: string) => {
    setDeleteTarget({ type: 'provider', id, name });
  };

  const handleRequestDeleteCustomer = (id: string, name: string) => {
    setDeleteTarget({ type: 'customer', id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'provider') {
      await api.deleteProvider(deleteTarget.id);
    } else {
      await api.deleteCustomer(deleteTarget.id);
    }
    await refresh();
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('partners.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('partners.subtitle')}</p>
        </div>
      </div>
      
      <AddPartnerDialog 
        open={!!activeModal} 
        onOpenChange={(open) => !open && closeModal()} 
        type={activeModal || 'provider'}
        partner={editingPartner} 
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('common.confirmDeleteTitle')}
        description={deleteTarget ? t('common.confirmDelete', { item: deleteTarget.type === 'provider' ? t('partners.provider') : t('partners.customer') }) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmDelete}
      />


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:max-h-[calc(100vh-16rem)] lg:h-[calc(100vh-16rem)] lg:min-h-[400px]">
        {/* Providers Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-[420px] lg:h-full min-h-0">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                 <Building2 className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100">{t('partners.providers')}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 shadow-sm">
                {providers.length} {t('partners.total')}
              </span>
              <button 
                onClick={() => setActiveModal('provider')}
                disabled={!isOnline}
                className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                {t('partners.addProvider')}
              </button>
            </div>
          </div>
          
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder={t('partners.searchProviders')}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-200 dark:focus:border-indigo-800 rounded-xl text-sm outline-none ring-0 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="px-5 py-3">{t('partners.table.name')}</th>
                  <th className="px-5 py-3">{t('partners.table.status')}</th>
                  <th className="px-5 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {providers.map(provider => (
                  <tr key={provider.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                    <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{provider.name}</td>
                    <td className="px-5 py-3.5">
                       <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        provider.status === 'active' 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                      }`}>
                        {provider.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled={!isOnline} className="cursor-pointer" onClick={() => isOnline && handleEdit('provider', provider)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          {currentUser?.role === 'manager' && (
                          <DropdownMenuItem disabled={!isOnline} className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => isOnline && handleRequestDeleteProvider(provider.id, provider.name)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customers Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-[420px] lg:h-full min-h-0">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30 shrink-0">
            <div className="flex items-center space-x-3">
               <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                 <User className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100">{t('partners.customers')}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 shadow-sm">
                {customers.length} {t('partners.total')}
              </span>
              <button 
                onClick={() => setActiveModal('customer')}
                disabled={!isOnline}
                className="flex items-center px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                {t('partners.addCustomer')}
              </button>
            </div>
          </div>

           <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-purple-500 dark:group-focus-within:text-purple-400 transition-colors" />
              <input 
                type="text" 
                placeholder={t('partners.searchCustomers')}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-purple-200 dark:focus:border-purple-800 rounded-xl text-sm outline-none ring-0 focus:ring-4 focus:ring-purple-500/10 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm">
                 <tr className="border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="px-5 py-3">{t('partners.table.nameContact')}</th>
                  <th className="px-5 py-3">{t('partners.table.status')}</th>
                  <th className="px-5 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">{customer.name}</div>
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <Mail className="w-3 h-3 mr-1.5 opacity-70" />
                        {customer.email}
                      </div>
                    </td>
                     <td className="px-5 py-3.5">
                       <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        customer.status === 'active' 
                             ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled={!isOnline} className="cursor-pointer" onClick={() => isOnline && handleEdit('customer', customer)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          {currentUser?.role === 'manager' && (
                          <DropdownMenuItem disabled={!isOnline} className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => isOnline && handleRequestDeleteCustomer(customer.id, customer.name)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
