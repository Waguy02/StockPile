import React from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';

export function Procurement() {
  const { purchaseOrders, providers, managers, isLoading } = useStore();
  
  const getProviderName = (id: string) => providers.find(p => p.id === id)?.name || 'Unknown Provider';
  const getManagerName = (id: string) => managers.find(m => m.id === id)?.name || 'Unknown Manager';

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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Procurement</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Create and track purchase orders with your suppliers.</p>
        </div>
        <button className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5">
          <Plus className="w-4 h-4 mr-2" />
          Create Order
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-5 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-slate-100">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search by Order ID, Provider..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none ring-0 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter Status
          </button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                        #{po.id.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{getProviderName(po.providerId)}</div>
                    <div className="text-xs text-slate-400 mt-1">Req. by {getManagerName(po.managerId)}</div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center text-slate-500">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        {po.initiationDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-slate-700">${po.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                     {po.paymentStatus ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3 mr-1.5" />
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">
                        <Clock className="w-3 h-3 mr-1.5" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      po.status === 'completed' 
                        ? 'bg-blue-50 text-blue-700 border-blue-100' 
                        : po.status === 'pending'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {po.status === 'completed' ? 'Received' : po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </span>
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
