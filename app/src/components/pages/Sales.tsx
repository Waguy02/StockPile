import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  UserCircle,
  Loader2,
  Calendar,
  CreditCard,
  Edit,
  Trash2
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { CreateOrderDialog } from '../modals/CreateOrderDialog';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/formatters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function Sales() {
  const { sales, customers, managers, isLoading, refresh } = useStore();
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || t('common.unknown');
  const getManagerName = (id: string) => managers.find(m => m.id === id)?.name || t('common.unknown');

  const handleEditSale = (sale: any) => {
    setEditingSale(sale);
    setIsCreateOpen(true);
  };

  const handleDeleteSale = async (sale: any) => {
    if (sale.status === 'completed') {
        alert(t('common.deleteCompleted'));
        return;
    }
    if (confirm(t('common.confirmDelete', { item: 'sale' }))) {
        await api.deleteSale(sale.id);
        await refresh();
    }
  };

  const handleCloseDialog = (open: boolean) => {
      setIsCreateOpen(open);
      if (!open) {
          setEditingSale(null);
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('sales.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('sales.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('sales.newSale')}
        </button>
      </div>

      <CreateOrderDialog 
        open={isCreateOpen} 
        onOpenChange={handleCloseDialog} 
        type="sale" 
        order={editingSale}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-5 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text"
              placeholder={t('sales.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none ring-0 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
          </div>
          <button className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm">
            <Filter className="w-4 h-4 mr-2" />
            {t('sales.filter')}
          </button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
             <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">{t('sales.table.saleId')}</th>
                <th className="px-6 py-4">{t('sales.table.customer')}</th>
                <th className="px-6 py-4">{t('sales.table.date')}</th>
                <th className="px-6 py-4">{t('sales.table.total')}</th>
                <th className="px-6 py-4">{t('sales.table.paymentProgress')}</th>
                <th className="px-6 py-4">{t('sales.table.status')}</th>
                <th className="px-6 py-4 text-right">{t('sales.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.map((sale) => {
                const percentPaid = sale.totalAmount > 0 ? Math.round((sale.amountPaid / sale.totalAmount) * 100) : 100;
                
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                     <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                            #{sale.id.toUpperCase()}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{getCustomerName(sale.customerId)}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center mt-1">
                        <UserCircle className="w-3 h-3 mr-1" />
                        {getManagerName(sale.managerId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400 dark:text-slate-500" />
                            {sale.initiationDate}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">{formatCurrency(sale.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <div className="w-full max-w-[140px]">
                         <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-600 dark:text-slate-400">{percentPaid}%</span>
                            <span className="text-slate-400 dark:text-slate-500">{formatCurrency(sale.amountPaid)} {t('sales.paid')}</span>
                         </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${percentPaid === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${percentPaid}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        sale.status === 'completed' 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                          : sale.status === 'pending'
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {sale.status === 'completed' ? t('procurement.status.completed') : (sale.status === 'pending' ? t('procurement.status.pending') : t('procurement.status.draft'))}
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
                                <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditSale(sale)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => handleDeleteSale(sale)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('common.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
