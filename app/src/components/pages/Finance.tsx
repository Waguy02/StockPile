import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Filter, 
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Loader2
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { formatCurrency } from '../../lib/formatters';

export function Finance() {
  const { payments, managers, isLoading } = useStore();
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('all');

  const getManagerName = (id: string) => managers.find(m => m.id === id)?.name || t('common.unknown');

  const getFilteredPayments = () => {
    if (timeRange === 'all') return payments;
    
    const now = new Date();
    const past = new Date();
    if (timeRange === 'last7Days') past.setDate(now.getDate() - 7);
    if (timeRange === 'last30Days') past.setDate(now.getDate() - 30);
    if (timeRange === 'lastTrimester') past.setMonth(now.getMonth() - 3);
    if (timeRange === 'lastYear') past.setFullYear(now.getFullYear() - 1);

    return payments.filter(p => new Date(p.date) >= past);
  };

  const filteredPayments = getFilteredPayments();
  const totalInflow = filteredPayments.filter(p => p.referenceType === 'sale').reduce((acc, p) => acc + p.amount, 0);
  const totalOutflow = filteredPayments.filter(p => p.referenceType === 'purchase_order').reduce((acc, p) => acc + p.amount, 0);

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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('finance.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('finance.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"
            >
                <option value="all">{t('dashboard.filter.allTime')}</option>
                <option value="last7Days">{t('dashboard.filter.last7Days')}</option>
                <option value="last30Days">{t('dashboard.filter.last30Days')}</option>
                <option value="lastTrimester">{t('dashboard.filter.lastTrimester')}</option>
                <option value="lastYear">{t('dashboard.filter.lastYear')}</option>
            </select>
          <button className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-all shadow-sm hover:border-slate-300 dark:hover:border-slate-700">
            <Download className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
            {t('finance.exportReport')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('finance.totalRevenue')}</p>
            <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight group-hover:scale-105 transition-transform origin-left">+{formatCurrency(totalInflow)}</h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('finance.totalExpenses')}</p>
            <h3 className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-1 tracking-tight group-hover:scale-105 transition-transform origin-left">-{formatCurrency(totalOutflow)}</h3>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('finance.netFlow')}</p>
            <h3 className={`text-3xl font-bold mt-1 tracking-tight group-hover:scale-105 transition-transform origin-left ${(totalInflow - totalOutflow) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {(totalInflow - totalOutflow) >= 0 ? '+' : ''}{formatCurrency(totalInflow - totalOutflow)}
            </h3>
          </div>
           <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <DollarSignIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">{t('finance.transactionHistory')}</h2>
          <div className="flex space-x-2">
            <button className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 rounded-lg transition-all hover:shadow-sm">
              <Search className="w-4.5 h-4.5" />
            </button>
             <button className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 rounded-lg transition-all hover:shadow-sm">
              <Filter className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
             <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">{t('finance.table.date')}</th>
                <th className="px-6 py-4">{t('finance.table.type')}</th>
                <th className="px-6 py-4">{t('finance.table.reference')}</th>
                <th className="px-6 py-4">{t('finance.table.processedBy')}</th>
                <th className="px-6 py-4 text-right">{t('finance.table.amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{payment.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      payment.referenceType === 'sale' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                        : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                    }`}>
                      {payment.referenceType === 'sale' ? t('finance.incoming') : t('finance.outgoing')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {payment.referenceType === 'sale' ? t('finance.saleRef', { id: payment.referenceId.toUpperCase() }) : t('finance.poRef', { id: payment.referenceId.toUpperCase() })}
                  </td>
                  <td className="px-6 py-4">{getManagerName(payment.managerId)}</td>
                  <td className={`px-6 py-4 text-right font-bold font-mono ${
                    payment.referenceType === 'sale' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {payment.referenceType === 'sale' ? '+' : '-'}{formatCurrency(payment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DollarSignIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
