import React, { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function Sales() {
  const { sales, customers, managers, isLoading, refresh } = useStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown Customer';
  const getManagerName = (id: string) => managers.find(m => m.id === id)?.name || 'Unknown Manager';

  const handleEditSale = (sale: any) => {
    setEditingSale(sale);
    setIsCreateOpen(true);
  };

  const handleDeleteSale = async (id: string) => {
    if (confirm('Are you sure you want to delete this sale?')) {
        await api.deleteSale(id);
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sales Orders</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Manage and track customer orders from draft to completion.</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Sale
        </button>
      </div>

      <CreateOrderDialog 
        open={isCreateOpen} 
        onOpenChange={handleCloseDialog} 
        type="sale" 
        order={editingSale}
      />

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-5 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-slate-100">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search sales..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none ring-0 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Sale ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Payment Progress</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((sale) => {
                const percentPaid = sale.totalAmount > 0 ? Math.round((sale.amountPaid / sale.totalAmount) * 100) : 100;
                
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors group">
                     <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                            #{sale.id.toUpperCase()}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{getCustomerName(sale.customerId)}</div>
                      <div className="text-xs text-slate-400 flex items-center mt-1">
                        <UserCircle className="w-3 h-3 mr-1" />
                        {getManagerName(sale.managerId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                        <div className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                            {sale.initiationDate}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-700">${sale.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="w-full max-w-[140px]">
                         <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-600">{percentPaid}%</span>
                            <span className="text-slate-400">${sale.amountPaid.toLocaleString()} paid</span>
                         </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
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
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : sale.status === 'pending'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditSale(sale)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => handleDeleteSale(sale.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
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
