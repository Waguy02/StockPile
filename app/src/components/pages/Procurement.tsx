import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  UserCircle
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import CreateOrderDialog from '../modals/CreateOrderDialog';
import { ConfirmDeleteDialog } from '../common/ConfirmDeleteDialog';
import { api } from '../../lib/api';
import { formatCurrency, formatDateForDisplay } from '../../lib/formatters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function Procurement() {
  const { purchaseOrders, providers, managers, currentUser, isLoading, refresh } = useStore();
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  
  const getProviderName = (id: string) => providers.find(p => p.id === id)?.name || t('common.unknown');
  const getManagerName = (id: string) => {
    if (id && id === currentUser?.id) return currentUser.name || t('common.unknown');
    return managers.find(m => m.id === id)?.name || t('common.unknown');
  };

  const sortedPurchaseOrders = useMemo(
    () => [...purchaseOrders].sort((a, b) => (b.initiationDate || '').localeCompare(a.initiationDate || '')),
    [purchaseOrders]
  );

  const handleEditOrder = (order: any) => {
    setEditingOrder(order);
    setIsCreateOpen(true);
  };

  const handleRequestDeleteOrder = (po: any) => {
    if (po.status === 'completed') {
      alert(t('common.deleteCompleted'));
      return;
    }
    setOrderToDelete(po);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    await api.deletePO(orderToDelete.id);
    await refresh();
    setOrderToDelete(null);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
        setEditingOrder(null);
    }
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('procurement.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('procurement.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('procurement.createOrder')}
        </button>
      </div>

      <CreateOrderDialog 
        open={isCreateOpen} 
        onOpenChange={handleCloseDialog} 
        type="purchase" 
        order={editingOrder} 
      />

      <ConfirmDeleteDialog
        open={!!orderToDelete}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
        title={t('common.confirmDeleteTitle')}
        description={t('common.confirmDelete', { item: t('procurement.purchaseOrder') })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmDeleteOrder}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-5 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text"
              placeholder={t('procurement.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none ring-0 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
          </div>
          <button className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm">
            <Filter className="w-4 h-4 mr-2" />
            {t('procurement.filterStatus')}
          </button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">{t('procurement.table.orderId')}</th>
                  <th className="px-6 py-4">{t('procurement.table.provider')}</th>
                  <th className="px-6 py-4">{t('procurement.table.date')}</th>
                  <th className="px-6 py-4">{t('procurement.table.totalAmount')}</th>
                  <th className="px-6 py-4">{t('procurement.table.paymentProgress')}</th>
                  <th className="px-6 py-4">{t('procurement.table.status')}</th>
                  <th className="px-6 py-4 text-right">{t('procurement.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedPurchaseOrders.map((po) => {
                  const amountPaid = po.amountPaid || 0;
                  const percentDisplay = po.totalAmount > 0 ? Math.round((amountPaid / po.totalAmount) * 100) : (po.status === 'completed' ? 100 : 0);
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                          #{po.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{getProviderName(po.providerId)}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('procurement.reqBy', { name: getManagerName(po.managerId) })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400 dark:text-slate-500" />
                          {formatDateForDisplay(po.initiationDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">{formatCurrency(po.totalAmount)}</td>
                      <td className="px-6 py-4">
                        <div className="w-full min-w-[160px] max-w-[180px]">
                          <div className="flex justify-between items-baseline gap-2 text-xs mb-1.5">
                            <span className="font-medium text-slate-600 dark:text-slate-400 shrink-0">{percentDisplay}%</span>
                            <span className="text-slate-400 dark:text-slate-500 font-mono text-right tabular-nums min-w-[100px]">{formatCurrency(Number(po.amountPaid) || 0)} {t('procurement.paid')}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${percentDisplay === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(percentDisplay, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          po.status === 'completed' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' : po.status === 'pending' || po.status === 'draft' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {po.status === 'completed' ? t('procurement.status.received') : (po.status === 'draft' ? t('procurement.status.pending') : t(`procurement.status.${po.status}`))}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditOrder(po)}>
                              <Edit className="w-4 h-4 mr-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            {currentUser?.role === 'manager' && (
                            <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => handleRequestDeleteOrder(po)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700">
            {sortedPurchaseOrders.length === 0 ? (
              <div className="px-5 py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                {t('procurement.empty', { defaultValue: 'No purchase orders yet' })}
              </div>
            ) : (
              sortedPurchaseOrders.map((po) => {
                const percentDisplay = po.totalAmount > 0 ? Math.round(((po.amountPaid || 0) / po.totalAmount) * 100) : (po.status === 'completed' ? 100 : 0);
                return (
                  <div key={po.id} className="p-5 space-y-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                            #{po.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            po.status === 'completed' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' : po.status === 'pending' || po.status === 'draft' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            {po.status === 'completed' ? t('procurement.status.received') : (po.status === 'draft' ? t('procurement.status.pending') : t(`procurement.status.${po.status}`))}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{getProviderName(po.providerId)}</h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">
                          <UserCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">{getManagerName(po.managerId)}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="shrink-0 p-2.5 -m-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[160px]">
                          <DropdownMenuItem className="cursor-pointer py-3 text-sm" onClick={() => handleEditOrder(po)}>
                            <Edit className="w-4 h-4 mr-3" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          {currentUser?.role === 'manager' && (
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer py-3 text-sm" onClick={() => handleRequestDeleteOrder(po)}>
                            <Trash2 className="w-4 h-4 mr-3" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-4 h-4 mr-2 shrink-0 text-slate-400 dark:text-slate-500" />
                      {formatDateForDisplay(po.initiationDate)}
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-end mb-2">
                        <p className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatCurrency(po.totalAmount)}</p>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('procurement.paid')}: {formatCurrency(po.amountPaid || 0)}</p>
                          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{percentDisplay}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${percentDisplay === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(percentDisplay, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
