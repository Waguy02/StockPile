import React from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Loader2
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';

export function Finance() {
  const { payments, managers, isLoading } = useStore();
  const getManagerName = (id: string) => managers.find(m => m.id === id)?.name || 'Unknown';

  const totalInflow = payments.filter(p => p.referenceType === 'sale').reduce((acc, p) => acc + p.amount, 0);
  const totalOutflow = payments.filter(p => p.referenceType === 'purchase_order').reduce((acc, p) => acc + p.amount, 0);

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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financials</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Track your revenue streams and expenses.</p>
        </div>
        <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all shadow-sm hover:border-slate-300">
          <Download className="w-4 h-4 mr-2 text-slate-500" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
            <h3 className="text-3xl font-bold text-emerald-600 mt-1 tracking-tight group-hover:scale-105 transition-transform origin-left">+${totalInflow.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Expenses</p>
            <h3 className="text-3xl font-bold text-rose-600 mt-1 tracking-tight group-hover:scale-105 transition-transform origin-left">-${totalOutflow.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500">Net Flow</p>
            <h3 className={`text-3xl font-bold mt-1 tracking-tight group-hover:scale-105 transition-transform origin-left ${(totalInflow - totalOutflow) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
              {(totalInflow - totalOutflow) >= 0 ? '+' : ''}${(totalInflow - totalOutflow).toLocaleString()}
            </h3>
          </div>
           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSignIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-bold text-slate-900">Transaction History</h2>
          <div className="flex space-x-2">
            <button className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 rounded-lg transition-all hover:shadow-sm">
              <Search className="w-4.5 h-4.5" />
            </button>
             <button className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 rounded-lg transition-all hover:shadow-sm">
              <Filter className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Processed By</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-700">{payment.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      payment.referenceType === 'sale' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {payment.referenceType === 'sale' ? 'Incoming' : 'Outgoing'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {payment.referenceType === 'sale' ? `Sale #${payment.referenceId.toUpperCase()}` : `PO #${payment.referenceId.toUpperCase()}`}
                  </td>
                  <td className="px-6 py-4">{getManagerName(payment.managerId)}</td>
                  <td className={`px-6 py-4 text-right font-bold font-mono ${
                    payment.referenceType === 'sale' ? 'text-emerald-600' : 'text-slate-900'
                  }`}>
                    {payment.referenceType === 'sale' ? '+' : '-'}${payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
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
