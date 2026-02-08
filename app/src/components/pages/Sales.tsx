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
  Trash2,
  X
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import CreateOrderDialog from '../modals/CreateOrderDialog';
import { api } from '../../lib/api';
import { formatCurrency, formatDateForDisplay } from '../../lib/formatters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';

export function Sales() {
  const { sales, customers, managers, products, isLoading, refresh, currentUser } = useStore();
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    paymentStatus: 'all'
  });

  // Filter sales based on role: staff only see sales where they are the responsible
  const relevantSales = React.useMemo(() => {
    if (currentUser?.role === 'staff') {
      return sales.filter(s => s.managerId === currentUser.id);
    }
    return sales;
  }, [sales, currentUser]);

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || t('common.unknown');
  const getManagerName = (id: string) => {
    if (id && id === currentUser?.id) return currentUser.name || t('common.unknown');
    return managers.find(m => m.id === id)?.name || t('common.unknown');
  };
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || t('common.unknown');

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

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: 'all',
      paymentStatus: 'all'
    });
    setSearchTerm('');
  };

  const filteredSales = relevantSales.filter(sale => {
    const matchesSearch = 
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCustomerName(sale.customerId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || sale.status === filters.status || (filters.status === 'pending' && sale.status === 'draft');
    
    const percentPaid = sale.totalAmount > 0 ? (sale.amountPaid / sale.totalAmount) * 100 : 100;
    const matchesPayment = filters.paymentStatus === 'all' || 
        (filters.paymentStatus === 'paid' && percentPaid >= 100) ||
        (filters.paymentStatus === 'unpaid' && percentPaid === 0) ||
        (filters.paymentStatus === 'partial' && percentPaid > 0 && percentPaid < 100);

    const saleDate = new Date(sale.initiationDate);
    const matchesDate = 
        (!filters.startDate || saleDate >= new Date(filters.startDate + 'T00:00:00.000Z')) &&
        (!filters.endDate || saleDate <= new Date(filters.endDate + 'T23:59:59.999Z'));

    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const sortedSales = React.useMemo(
    () => [...filteredSales].sort((a, b) => (b.initiationDate || '').localeCompare(a.initiationDate || '')),
    [filteredSales]
  );

  const getProductsDisplay = (items: any[]) => {
    if (!items || items.length === 0) return '-';
    
    // Use first 2 items
    const displayItems = items.slice(0, 2);
    const remainingCount = items.length - 2;

    return (
      <div className="flex flex-wrap gap-1">
        {displayItems.map((item, idx) => (
          <Badge key={idx} variant="outline" className="text-xs font-normal bg-slate-50 dark:bg-slate-800/50">
            {getProductName(item.productId)}
            {item.quantity > 1 && <span className="ml-1 text-slate-400">x{item.quantity}</span>}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            +{remainingCount}
          </Badge>
        )}
      </div>
    );
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none ring-0 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <button className={`flex items-center px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors shadow-sm ${
                Object.values(filters).some(v => v !== 'all' && v !== '') 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}>
                <Filter className="w-4 h-4 mr-2" />
                {t('sales.filter')}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                   <h4 className="font-semibold text-sm">{t('sales.filter')}</h4>
                   <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-indigo-600">{t('sales.filters.clear')}</button>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date-range">{t('sales.table.date')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label htmlFor="startDate" className="text-xs text-slate-500">{t('sales.filters.startDate')}</Label>
                        <Input 
                            id="startDate"
                            type="date" 
                            value={filters.startDate} 
                            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="endDate" className="text-xs text-slate-500">{t('sales.filters.endDate')}</Label>
                        <Input 
                            id="endDate"
                            type="date" 
                            value={filters.endDate} 
                            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                            className="h-8 text-xs"
                        />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">{t('sales.table.status')}</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                    <SelectTrigger id="status" className="h-9">
                      <SelectValue placeholder={t('common.allOptions')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.allOptions')}</SelectItem>
                      <SelectItem value="pending">{t('procurement.status.pending')}</SelectItem>
                      <SelectItem value="completed">{t('procurement.status.completed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment">{t('sales.filters.paymentStatus')}</Label>
                  <Select value={filters.paymentStatus} onValueChange={(v) => setFilters({ ...filters, paymentStatus: v })}>
                    <SelectTrigger id="payment" className="h-9">
                      <SelectValue placeholder={t('common.allOptions')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.allOptions')}</SelectItem>
                      <SelectItem value="paid">{t('sales.paid')}</SelectItem>
                      <SelectItem value="partial">{t('procurement.status.pending')}</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">{t('sales.table.saleId')}</th>
                  <th className="px-6 py-4">{t('sales.table.customer')}</th>
                  <th className="px-6 py-4">{t('sales.table.products')}</th>
                  <th className="px-6 py-4">{t('sales.table.date')}</th>
                  <th className="px-6 py-4">{t('sales.table.total')}</th>
                  <th className="px-6 py-4">{t('sales.table.paymentProgress')}</th>
                  <th className="px-6 py-4">{t('sales.table.responsible')}</th>
                  <th className="px-6 py-4">{t('sales.table.status')}</th>
                  <th className="px-6 py-4 text-right">{t('sales.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                      {t('sales.empty', { defaultValue: 'No sales yet' })}
                    </td>
                  </tr>
                ) : (
                sortedSales.map((sale) => {
                  const percentPaid = sale.totalAmount > 0 ? Math.round((sale.amountPaid / sale.totalAmount) * 100) : 100;
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                      <td className="px-6 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                              #{sale.id.slice(0, 8).toUpperCase()}
                          </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{getCustomerName(sale.customerId)}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getProductsDisplay(sale.items || [])}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          <div className="flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400 dark:text-slate-500" />
                              {formatDateForDisplay(sale.initiationDate)}
                          </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-6 py-4">
                        <div className="w-full min-w-[160px] max-w-[180px]">
                          <div className="flex justify-between items-baseline gap-2 text-xs mb-1.5">
                              <span className="font-medium text-slate-600 dark:text-slate-400 shrink-0">{percentPaid}%</span>
                              <span className="text-slate-400 dark:text-slate-500 font-mono text-right tabular-nums min-w-[100px]">{formatCurrency(sale.amountPaid)} {t('sales.paid')}</span>
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
                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                          <UserCircle className="w-4 h-4 mr-2" />
                          {getManagerName(sale.managerId)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          sale.status === 'completed' 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                            : sale.status === 'pending' || sale.status === 'draft'
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {sale.status === 'completed' ? t('procurement.status.completed') : (sale.status === 'pending' || sale.status === 'draft' ? t('procurement.status.pending') : t('procurement.status.cancelled'))}
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
                                  {currentUser?.role === 'manager' && (
                                  <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => handleDeleteSale(sale)}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      {t('common.delete')}
                                  </DropdownMenuItem>
                                  )}
                                  </DropdownMenuContent>
                          </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700">
            {sortedSales.length === 0 ? (
              <div className="px-5 py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                {t('sales.empty', { defaultValue: 'No sales yet' })}
              </div>
            ) : (
              sortedSales.map((sale) => {
                const percentPaid = sale.totalAmount > 0 ? Math.round((sale.amountPaid / sale.totalAmount) * 100) : 100;
                return (
                  <div key={sale.id} className="p-5 space-y-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                            #{sale.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            sale.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : sale.status === 'pending' || sale.status === 'draft' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            {sale.status === 'completed' ? t('procurement.status.completed') : (sale.status === 'pending' || sale.status === 'draft' ? t('procurement.status.pending') : t('procurement.status.cancelled'))}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{getCustomerName(sale.customerId)}</h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">
                          <UserCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">{getManagerName(sale.managerId)}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="shrink-0 p-2.5 -m-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[160px]">
                          <DropdownMenuItem className="cursor-pointer py-3 text-sm" onClick={() => handleEditSale(sale)}>
                            <Edit className="w-4 h-4 mr-3" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          {currentUser?.role === 'manager' && (
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer py-3 text-sm" onClick={() => handleDeleteSale(sale)}>
                            <Trash2 className="w-4 h-4 mr-3" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {getProductsDisplay(sale.items || [])}
                      </div>
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-4 h-4 mr-2 shrink-0 text-slate-400 dark:text-slate-500" />
                        {formatDateForDisplay(sale.initiationDate)}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-end mb-2">
                        <p className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatCurrency(sale.totalAmount)}</p>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('sales.paid')}: {formatCurrency(sale.amountPaid)}</p>
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{percentPaid}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${percentPaid === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${percentPaid}%` }} />
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
