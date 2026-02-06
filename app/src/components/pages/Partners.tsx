import React, { useState } from 'react';
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
import { api } from '../../lib/api';
import { AddPartnerDialog } from '../modals/AddPartnerDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function Partners() {
  const { providers, customers, isLoading, refresh } = useStore();
  const [activeModal, setActiveModal] = useState<'provider' | 'customer' | null>(null);
  const [editingPartner, setEditingPartner] = useState<any>(null);

  const handleEdit = (type: 'provider' | 'customer', partner: any) => {
    setEditingPartner(partner);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingPartner(null);
  };

  const handleDeleteProvider = async (id: string) => {
    if (confirm('Are you sure you want to delete this provider?')) {
      await api.deleteProvider(id);
      await refresh();
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      await api.deleteCustomer(id);
      await refresh();
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Partners</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Manage your relationships with providers and customers.</p>
        </div>
      </div>
      
      <AddPartnerDialog 
        open={!!activeModal} 
        onOpenChange={(open) => !open && closeModal()} 
        type={activeModal || 'provider'}
        partner={editingPartner} 
      />


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-12rem)] min-h-[500px]">
        {/* Providers Section */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                 <Building2 className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-800">Providers</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-sm">
                {providers.length} Total
              </span>
              <button 
                onClick={() => setActiveModal('provider')}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-xs shadow-sm transition-all"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Add Provider
              </button>
            </div>
          </div>
          
          <div className="p-4 border-b border-slate-100">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search providers..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent hover:bg-slate-100 focus:bg-white focus:border-indigo-200 rounded-xl text-sm outline-none ring-0 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers.map(provider => (
                  <tr key={provider.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-3.5 font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{provider.name}</td>
                    <td className="px-5 py-3.5">
                       <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        provider.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {provider.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit('provider', provider)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => handleDeleteProvider(provider.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
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
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div className="flex items-center space-x-3">
               <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                 <User className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-800">Customers</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-sm">
                {customers.length} Total
              </span>
              <button 
                onClick={() => setActiveModal('customer')}
                className="flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-xs shadow-sm transition-all"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Add Customer
              </button>
            </div>
          </div>

           <div className="p-4 border-b border-slate-100">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search customers..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent hover:bg-slate-100 focus:bg-white focus:border-purple-200 rounded-xl text-sm outline-none ring-0 focus:ring-4 focus:ring-purple-500/10 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                 <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-5 py-3">Name / Contact</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">{customer.name}</div>
                      <div className="flex items-center text-xs text-slate-500 mt-1">
                        <Mail className="w-3 h-3 mr-1.5 opacity-70" />
                        {customer.email}
                      </div>
                    </td>
                     <td className="px-5 py-3.5">
                       <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        customer.status === 'active' 
                             ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit('customer', customer)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => handleDeleteCustomer(customer.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
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
